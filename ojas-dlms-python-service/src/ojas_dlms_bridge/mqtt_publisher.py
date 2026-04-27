import json
import logging
import ssl
import time
from typing import Any, Dict

import paho.mqtt.client as mqtt

from .settings import MqttSettings


class MqttPublisher:
    def __init__(self, settings: MqttSettings, logger: logging.Logger) -> None:
        self.settings = settings
        self.logger = logger
        self.connected = False
        self.client = mqtt.Client(client_id=settings.client_id, protocol=mqtt.MQTTv311)
        if settings.username:
            self.client.username_pw_set(settings.username, settings.password)

        if settings.use_tls:
            if settings.use_cert and settings.ca and settings.cert and settings.key:
                self.client.tls_set(
                    ca_certs=settings.ca,
                    certfile=settings.cert,
                    keyfile=settings.key,
                    tls_version=ssl.PROTOCOL_TLSv1_2,
                )
            else:
                self.client.tls_set(tls_version=ssl.PROTOCOL_TLSv1_2)
                self.client.tls_insecure_set(True)

        self.client.reconnect_delay_set(min_delay=2, max_delay=10)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect

    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Dict[str, Any], rc: int) -> None:
        self.connected = rc == 0
        if self.connected:
            self.logger.info("MQTT connected to %s:%s", self.settings.endpoint, self.settings.port)
        else:
            self.logger.error("MQTT connection failed with rc=%s", rc)

    def _on_disconnect(self, client: mqtt.Client, userdata: Any, rc: int) -> None:
        self.connected = False
        self.logger.warning("MQTT disconnected (rc=%s)", rc)

    def connect(self) -> None:
        self.client.connect(self.settings.endpoint, self.settings.port, keepalive=60)
        self.client.loop_start()

    def _ensure_connected(self) -> bool:
        if self.connected:
            return True

        self.logger.warning("MQTT not connected, attempting reconnect")
        try:
            self.client.reconnect()
        except Exception as exc:
            self.logger.error("MQTT reconnect call failed: %s", exc)

        return self.wait_until_connected(timeout_sec=10)

    def wait_until_connected(self, timeout_sec: int = 10) -> bool:
        start = time.time()
        while time.time() - start < timeout_sec:
            if self.connected:
                return True
            time.sleep(0.2)
        return False

    def publish(self, topic: str, payload: str, qos: int = 1) -> bool:
        if not self._ensure_connected():
            self.logger.error("MQTT publish failed: not connected")
            return False

        result = self.client.publish(topic, payload, qos=qos)
        result.wait_for_publish(timeout=5)

        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            self.logger.error("MQTT publish failed rc=%s topic=%s", result.rc, topic)
            return False

        self.logger.info("Data published to %s: %s", topic, payload)
        return True

    def publish_json(self, topic: str, payload: Dict[str, Any], qos: int = 1) -> bool:
        data = json.dumps(payload, separators=(",", ":"))
        return self.publish(topic, data, qos=qos)

    def close(self) -> None:
        try:
            self.client.loop_stop()
            self.client.disconnect()
        except Exception:
            pass
