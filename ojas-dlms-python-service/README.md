# OJAS DLMS Python Bridge

A production-ready bridge service for reading DLMS/COSEM meter data and publishing telemetry to EMQX MQTT topics used by OJAS frontend.

## Architecture

Smart meter (DLMS over serial) -> Python bridge -> MQTT publish -> React dashboard

## Features

- Uses existing Gurux DLMS Python client APIs (no protocol reimplementation)
- Modular structure (settings, DLMS reader, MQTT publisher, bridge service)
- Continuous polling loop
- Auto-reconnect handling for serial and MQTT
- Structured logging
- JSON telemetry payload compatible with existing frontend

## Payload format

```json
{
  "voltage": 230,
  "current": 5.2,
  "energy": 1234,
  "timestamp": 1710000000
}
```

## Setup

1. Create virtual environment and install dependencies.

```powershell
cd ojas-dlms-python-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy config template.

```powershell
copy config.example.json config.json
```

3. Update your meter and MQTT credentials in `config.json`.

4. Run bridge.

```powershell
set PYTHONPATH=src
python -m ojas_dlms_bridge.main
```

## Environment overrides

You can override config values with environment variables using `.env.example` keys.

- `OJAS_DLMS_CONFIG` path to config JSON
- `OJAS_POLL_INTERVAL_SEC`
- `MQTT_*`
- `DLMS_*`

## Notes

- `pub_topic` is required and should be `device/{deviceId}/telemetry`.
- Keep `client_id` unique per bridge instance.
- If your meter needs different OBIS mapping, edit `dlms.obis_map` in config.
