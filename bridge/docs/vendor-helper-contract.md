# Vendor Helper (Windows) Contract

This document defines the contract between the **bridge** (Node.js) and the **Windows helper** (C#) that talks to the vendor DLL.

## Goals

- Isolate vendor DLL access from Node.js.
- Provide a stable REST + WebSocket interface for device discovery, connect/disconnect, and raw input events.
- Keep bridge providers (keyboard/hid/vendor) independent.

## Transport

- **REST** for control actions (status, list, connect, disconnect).
- **WebSocket** for streaming raw button events and health updates.

Default endpoints (configurable via env in helper):

- REST base: `http://127.0.0.1:17610`
- WS base: `ws://127.0.0.1:17610/ws`

## REST API (Helper → Bridge contract)

### `GET /health`

Response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "dllLoaded": false,
  "dllPath": null,
  "lastError": null
}
```

### `GET /devices`

Response:
```json
{
  "devices": [
    {
      "receiverId": "vendor:primary",
      "name": "Vendor receiver",
      "status": "disconnected",
      "meta": {
        "serial": "...",
        "firmware": "...",
        "vendorId": 0,
        "productId": 0
      }
    }
  ]
}
```

### `POST /connect`

Request:
```json
{ "receiverId": "vendor:primary" }
```

Response:
```json
{ "ok": true }
```

### `POST /disconnect`

Request:
```json
{ "receiverId": "vendor:primary" }
```

Response:
```json
{ "ok": true }
```

## WebSocket Events

The helper sends JSON messages with a `type` field.

### `vendor_status`
```json
{
  "type": "vendor_status",
  "status": "connected",
  "receiverId": "vendor:primary",
  "timestamp": "2026-04-19T12:00:00.000Z"
}
```

### `vendor_button`
```json
{
  "type": "vendor_button",
  "receiverId": "vendor:primary",
  "buttonId": "A",
  "raw": "01 00 00 00",
  "timestamp": "2026-04-19T12:00:00.000Z"
}
```

### `vendor_error`
```json
{
  "type": "vendor_error",
  "message": "Vendor DLL error",
  "timestamp": "2026-04-19T12:00:00.000Z"
}
```

## Environment Variables (Helper)

- `VENDOR_DLL_PATH`: absolute path to vendor DLL
- `VENDOR_HELPER_PORT`: default `17610`
- `VENDOR_HELPER_WS_PATH`: default `/ws`

## Notes

- The helper should run as a local process launched by the bridge or manually during debugging.
- Bridge should treat helper as optional and log clear errors if it's not available.