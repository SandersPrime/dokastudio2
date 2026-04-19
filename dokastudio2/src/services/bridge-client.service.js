// src/services/bridge-client.service.js

const { EventEmitter } = require('events');

const DEFAULT_BASE_URL = process.env.BRIDGE_URL || 'http://localhost:17600';
const DEFAULT_WS_URL = process.env.BRIDGE_WS_URL || 'ws://localhost:17600/ws';

class BridgeClient extends EventEmitter {
  constructor({ baseUrl, wsUrl }) {
    super();
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.pollIntervalMs = 5000;
    this.state = {
      online: false,
      wsConnected: false,
      status: null,
      devices: [],
      lastEvent: null,
      lastError: null,
    };
    this.ws = null;
    this.pollTimer = null;
    this.reconnectTimer = null;
    this.started = false;
  }

  getSnapshot() {
    return {
      online: this.state.online,
      wsConnected: this.state.wsConnected,
      status: this.state.status,
      devices: this.state.devices,
      lastEvent: this.state.lastEvent,
      lastError: this.state.lastError,
    };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.connectWs();
    this.startPolling();
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      this.fetchStatus().catch(() => null);
      this.fetchDevices().catch(() => null);
    }, this.pollIntervalMs);
  }

  async request(path, options = {}) {
    const url = new URL(path, this.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error || `Bridge HTTP ${response.status}`;
        throw new Error(message);
      }
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchStatus() {
    try {
      const status = await this.request('/status');
      this.state.status = status;
      this.state.online = true;
      this.state.lastError = null;
      this.emit('status', this.getSnapshot());
      return status;
    } catch (error) {
      this.state.online = false;
      this.state.lastError = error.message || String(error);
      this.emit('status', this.getSnapshot());
      throw error;
    }
  }

  async fetchDevices() {
    try {
      const payload = await this.request('/devices');
      this.state.devices = payload?.devices || [];
      console.log(`[bridge] devices refreshed: ${this.state.devices.length}`);
      this.emit('devices', { devices: this.state.devices });
      return this.state.devices;
    } catch (error) {
      this.state.lastError = error.message || String(error);
      console.warn('[bridge] device fetch failed:', this.state.lastError);
      throw error;
    }
  }

  async testStart() {
    const payload = await this.request('/test/start', { method: 'POST' });
    await this.fetchStatus().catch(() => null);
    return payload;
  }

  async testStop() {
    const payload = await this.request('/test/stop', { method: 'POST' });
    await this.fetchStatus().catch(() => null);
    return payload;
  }

  async testPress(body = {}) {
    const payload = await this.request('/test/press', { method: 'POST', body });
    return payload;
  }

  async reset(body = {}) {
    const payload = await this.request('/reset', { method: 'POST', body });
    await this.fetchStatus().catch(() => null);
    return payload;
  }

  connectWs() {
    if (this.ws) return;
    let WebSocketImpl = global.WebSocket;
    if (!WebSocketImpl) {
      try {
        WebSocketImpl = require('ws');
      } catch (error) {
        this.state.lastError = 'WebSocket client is not available.';
        return;
      }
    }

    try {
      this.ws = new WebSocketImpl(this.wsUrl);
    } catch (error) {
      this.state.lastError = error.message || String(error);
      this.scheduleReconnect();
      return;
    }

    const handleOpen = () => {
      this.state.wsConnected = true;
      this.emit('status', this.getSnapshot());
    };

    const handleMessage = (event) => {
      const data = event?.data ?? event;
      this.handleWsMessage(data);
    };

    const handleError = () => {
      this.state.wsConnected = false;
      this.emit('status', this.getSnapshot());
    };

    const handleClose = () => {
      this.state.wsConnected = false;
      this.ws = null;
      this.emit('status', this.getSnapshot());
      this.scheduleReconnect();
    };

    if (this.ws.on) {
      this.ws.on('open', handleOpen);
      this.ws.on('message', handleMessage);
      this.ws.on('error', handleError);
      this.ws.on('close', handleClose);
    } else {
      this.ws.onopen = handleOpen;
      this.ws.onmessage = handleMessage;
      this.ws.onerror = handleError;
      this.ws.onclose = handleClose;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWs();
    }, 3000);
  }

  handleWsMessage(raw) {
    if (!raw) return;
    let message;
    try {
      message = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString());
    } catch (error) {
      return;
    }

    if (message.type === 'bridge_status') {
      this.state.status = message.status || null;
      this.state.online = true;
      this.emit('status', this.getSnapshot());
    }

    if (message.type === 'button_pressed' && message.event) {
      this.state.lastEvent = message.event;
      console.log(
        `[bridge] button press from ${message.event.receiverId} (${message.event.buttonId})`
      );
      if (this.state.status) {
        this.state.status.lastEventAt = message.event.pressedAt;
      }
      this.emit('pressed', message.event);
      this.emit('status', this.getSnapshot());
    }
  }
}

const bridgeClient = new BridgeClient({
  baseUrl: DEFAULT_BASE_URL,
  wsUrl: DEFAULT_WS_URL,
});

module.exports = { bridgeClient };