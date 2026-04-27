import logging
import random
import time
from typing import Dict, Any

import serial
from gurux_dlms import GXDLMSClient, GXReplyData
from gurux_dlms.GXByteBuffer import GXByteBuffer
from gurux_dlms.GXCiphering import GXCiphering
from gurux_dlms.enums import InterfaceType, Authentication, Security
from gurux_dlms.objects import GXDLMSRegister

from .settings import DlmsSettings


_INTERFACE_MAP = {
    "WRAPPER": InterfaceType.WRAPPER,
    "HDLC": InterfaceType.HDLC,
}

_AUTH_MAP = {
    "NONE": Authentication.NONE,
    "LOW": Authentication.LOW,
    "HIGH": Authentication.HIGH,
    "HIGH_MD5": Authentication.HIGH_MD5,
    "HIGH_SHA1": Authentication.HIGH_SHA1,
    "HIGH_GMAC": Authentication.HIGH_GMAC,
    "HIGH_SHA256": Authentication.HIGH_SHA256,
}

_SECURITY_MAP = {
    "NONE": Security.NONE,
    "AUTHENTICATION": Security.AUTHENTICATION,
    "ENCRYPTION": Security.ENCRYPTION,
    "AUTHENTICATION_ENCRYPTION": Security.AUTHENTICATION_ENCRYPTION,
}

_OBIS_MAP = {
    "energy": "1.0.1.8.0.255",
    "voltage": "1.0.32.7.0.255",
    "current": "1.0.31.7.0.255",
}


class DlmsCommandGenerator:
    """Generate DLMS HEX commands using Gurux client."""

    def __init__(self, client: GXDLMSClient, logger: logging.Logger) -> None:
        self.client = client
        self.logger = logger

    def generate_get_command(self, obis: str, attribute: int = 2) -> str:
        """
        Generate a DLMS GET request in HEX format.

        Args:
            obis: OBIS code (e.g., "1.0.32.7.0.255")
            attribute: DLMS attribute index (default: 2)

        Returns:
            HEX string of the GET request
        """
        if not self.client:
            raise RuntimeError("DLMS client is not connected")

        try:
            obj = GXDLMSRegister(obis)
            req = self.client.read(obj, attribute)

            # Ensure it's a list and get first element
            if isinstance(req, list):
                req = req[0]

            hex_cmd = req.hex()
            self.logger.debug("DLMS command generated for %s (attr=%d): %s", obis, attribute, hex_cmd)
            return hex_cmd
        except Exception as exc:
            self.logger.exception("Failed to generate command for %s: %s", obis, exc)
            raise


class DlmsMeterReader:
    def __init__(self, settings: DlmsSettings, logger: logging.Logger) -> None:
        self.settings = settings
        self.logger = logger
        self.ser = None
        self.client = None
        self.cmd_generator = None
        self._simulation_started_at = time.time()
        self._simulation_energy_base = random.randint(1000, 100000)
        self._simulation_voltage_base = random.uniform(228.0, 232.0)
        self._simulation_current_base = random.uniform(4.5, 6.5)

    def connect(self) -> None:
        if getattr(self.settings, "simulation", False):
            self.logger.info("Simulation mode enabled: skipping DLMS serial connection")
            return

        if self.ser and self.ser.is_open and self.client is not None:
            return

        self.ser = serial.Serial(
            port=self.settings.port,
            baudrate=self.settings.baudrate,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=2,
        )
        self.logger.info("DLMS serial opened on %s @ %s", self.settings.port, self.settings.baudrate)

        interface_type = _INTERFACE_MAP.get(self.settings.interface, InterfaceType.WRAPPER)
        auth = _AUTH_MAP.get(self.settings.authentication, Authentication.LOW)

        self.client = GXDLMSClient(
            useLogicalNameReferencing=True,
            clientAddress=self.settings.client_address,
            serverAddress=self.settings.server_address,
            interfaceType=interface_type,
        )
        self.client.authentication = auth
        self.client.password = self.settings.password

        cipher = GXCiphering(self.settings.system_title)
        cipher.security = _SECURITY_MAP.get(self.settings.security, Security.AUTHENTICATION_ENCRYPTION)
        cipher.authenticationKey = self.settings.auth_key
        cipher.blockCipherKey = self.settings.block_key
        cipher.dedicatedKey = self.settings.dedicated_key
        cipher.invocationCounter = self.settings.invocation_counter

        self.client.ciphering = cipher
        self.client.settings.cipher = cipher

        # Initialize command generator after client is ready
        self.cmd_generator = DlmsCommandGenerator(self.client, self.logger)

        aarq = self.client.aarqRequest()
        aare = self._send_and_receive(aarq, "AARQ")
        if not aare:
            raise RuntimeError("No AARE response from meter")

        # For WRAPPER framing, payload starts after 8-byte wrapper header.
        payload = aare[8:] if len(aare) > 8 else aare
        self.client.parseAareResponse(GXByteBuffer(payload))
        self.logger.info("DLMS connected")

    def _send_and_receive(self, data: Any, name: str) -> bytes:
        if isinstance(data, list):
            data = data[0]

        if self.client and self.client.ciphering:
            self.client.ciphering.invocationCounter += 1

        self.logger.debug("DLMS TX [%s]: %s", name, data.hex())
        self.ser.write(data)
        time.sleep(0.7)
        resp = self.ser.read(4096)

        if not resp:
            raise TimeoutError(f"No DLMS response for {name}")

        self.logger.debug("DLMS RX [%s]: %s", name, resp.hex())
        return resp

    def read_obis(self, obis_code: str, attribute: int = 2) -> Any:
        if not self.client:
            raise RuntimeError("DLMS client is not connected")

        obj = GXDLMSRegister(obis_code)
        req = self.client.read(obj, attribute)
        reply = self._send_and_receive(req, f"GET {obis_code}")

        rd = GXReplyData()
        self.client.getData(reply, rd)

        if rd.value is not None:
            return rd.value

        value = getattr(obj, "value", None)
        return value

    def read_all(self) -> Dict[str, Any]:
        if getattr(self.settings, "simulation", False):
            return self._read_all_simulated()

        return self._read_all_real()

    def _read_all_real(self) -> Dict[str, Any]:
        metrics: Dict[str, Any] = {}
        for key, obis in self.settings.obis_map.items():
            try:
                value = self.read_obis(obis, attribute=2)
                if isinstance(value, (bytes, bytearray)):
                    value = value.hex()
                metrics[key] = _to_numeric_if_possible(value)
            except Exception:
                # Keep the bridge alive and return partial data when some OBIS reads fail.
                self.logger.exception("DLMS read failed for %s (%s)", key, obis)

        self.logger.info("Data read: %s", metrics)
        return metrics

    def _read_all_simulated(self) -> Dict[str, Any]:
        elapsed = max(0.0, time.time() - self._simulation_started_at)
        drift = elapsed / 30.0

        metrics: Dict[str, Any] = {
            "energy": int(self._simulation_energy_base + elapsed * 12 + random.uniform(0, 5)),
            "voltage": round(self._simulation_voltage_base + random.uniform(-1.5, 1.5) + drift * 0.2, 2),
            "current": round(self._simulation_current_base + random.uniform(-0.4, 0.4) + drift * 0.05, 2),
        }

        self.logger.info("Data read (simulation): %s", metrics)
        return metrics

    def read_metrics(self) -> Dict[str, Any]:
        return self.read_all()

    def generate_command(self, parameter: str, attribute: int = 2) -> str:
        """
        Generate a DLMS GET command for a named parameter.

        Args:
            parameter: Parameter name (e.g., "voltage", "energy", "current")
            attribute: DLMS attribute index (default: 2)

        Returns:
            HEX string of the DLMS GET command

        Raises:
            ValueError: If parameter is not recognized
            RuntimeError: If DLMS client is not connected (only in real mode)
        """
        if parameter not in _OBIS_MAP:
            raise ValueError(
                f"Unknown parameter: {parameter}. "
                f"Available: {', '.join(_OBIS_MAP.keys())}"
            )

        obis = _OBIS_MAP[parameter]

        if getattr(self.settings, "simulation", False):
            self.logger.info(
                "[DLMS CMD] %s (simulation mode): using mock command generation",
                parameter,
            )
            return self._generate_command_simulated(parameter, obis)

        if not self.cmd_generator:
            raise RuntimeError("DLMS client is not initialized. Call connect() first.")

        hex_cmd = self.cmd_generator.generate_get_command(obis, attribute)
        self.logger.info("[DLMS CMD] %s: %s", parameter, hex_cmd)
        return hex_cmd

    def _generate_command_simulated(self, parameter: str, obis: str) -> str:
        """Generate a mock DLMS command for testing (simulation mode)."""
        # Return a simple mock GET request frame in hex
        # This is a placeholder; real frame generation happens via Gurux
        mock_hex = f"c0c101{obis.replace('.', '')}"
        return mock_hex

    def close(self) -> None:
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None
        self.client = None
        self.cmd_generator = None


def _to_numeric_if_possible(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        # Keep integers as integers where possible.
        n = float(value)
        return int(n) if n.is_integer() else n
    except (TypeError, ValueError):
        return value
