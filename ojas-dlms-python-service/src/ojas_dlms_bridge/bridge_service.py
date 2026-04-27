import logging
import json
import time
from typing import Dict, Any

from .dlms_reader import DlmsMeterReader
from .mqtt_publisher import MqttPublisher
from .settings import BridgeSettings


class DlmsMqttBridgeService:
    def __init__(
        self,
        settings: BridgeSettings,
        reader: DlmsMeterReader,
        publisher: MqttPublisher,
        logger: logging.Logger,
    ) -> None:
        self.settings = settings
        self.logger = logger
        self.reader = reader
        self.publisher = publisher
        self.running = False

    def run_forever(self) -> None:
        try:
            self.publisher.connect()
        except Exception:
            self.logger.exception("Initial MQTT connect failed; continuing with retries")

        self.running = True

        while self.running:
            try:
                if not self.publisher.wait_until_connected(timeout_sec=10):
                    self.logger.warning("MQTT not connected yet; retrying")
                    time.sleep(self.settings.retry_delay_sec)
                    continue

                self.reader.connect()
                metrics = self.reader.read_all()

                if not metrics:
                    self.logger.warning("No DLMS data available in this cycle")
                    time.sleep(self.settings.retry_delay_sec)
                    continue

                payload: Dict[str, Any] = {
                    **metrics,
                    "timestamp": int(time.time()),
                }

                ok = self.publisher.publish(self.settings.publish_topic, json.dumps(payload), qos=1)
                if ok:
                    self.logger.info("Bridge cycle completed for device=%s", self.settings.device_id)
                else:
                    self.logger.warning("Publish failed; bridge will retry")

                time.sleep(self.settings.poll_interval_sec)
            except Exception:
                self.logger.exception("Bridge cycle failed")
                self.reader.close()
                time.sleep(self.settings.retry_delay_sec)

    def stop(self) -> None:
        self.running = False
        self.reader.close()
        self.publisher.close()
