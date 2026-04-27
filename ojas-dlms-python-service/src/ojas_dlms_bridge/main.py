import logging
import signal
import sys

from .bridge_service import DlmsMqttBridgeService
from .dlms_reader import DlmsMeterReader
from .mqtt_publisher import MqttPublisher
from .settings import load_settings
import os


def configure_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    return logging.getLogger("ojas-dlms-bridge")


def main() -> int:
    logger = configure_logging()
    settings = load_settings()

    logger.info("Starting OJAS DLMS bridge device=%s topic=%s", settings.device_id, settings.publish_topic)
    logger.info("Bridge mode: %s", "SIMULATION" if settings.simulation else "REAL_DLMS")

    reader = DlmsMeterReader(settings.dlms, logger)
    publisher = MqttPublisher(settings.mqtt, logger)
    service = DlmsMqttBridgeService(settings, reader, publisher, logger)
    # ===== DLMS COMMAND TEST BLOCK (removable debug section) =====
    if os.getenv("OJAS_SHOW_DLMS_COMMANDS", "").lower() == "true":
        logger.info("=== DLMS COMMAND TEST ===")
        try:
            reader.connect()
            for param in ["voltage", "current", "energy"]:
                try:
                    cmd = reader.generate_command(param)
                    logger.info("%s: %s", param, cmd)
                except Exception as exc:
                    logger.warning("%s: ERROR -> %s", param, exc)
        except Exception as exc:
            logger.warning("DLMS command test failed: %s", exc)
        logger.info("=== DLMS COMMAND TEST END ===")
    # ===== END DLMS COMMAND TEST BLOCK =====


    def _shutdown(signum, frame):
        logger.info("Shutdown signal received (%s)", signum)
        service.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    service.run_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
