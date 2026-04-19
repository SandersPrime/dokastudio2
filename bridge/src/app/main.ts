import express from "express";
import { createServer } from "http";
import { config } from "./config";
import { ProviderRegistry } from "./registry";
import { createWsServer } from "../api/ws.server";
import { DeviceManager } from "../devices/device.manager";
import { EventDispatcher } from "../events/event.dispatcher";
import { HealthService } from "../diagnostics/health.service";
import { HidProvider } from "../providers/hid.provider";
import { KeyboardProvider } from "../providers/keyboard.provider";
import { VendorProvider } from "../providers/vendor.provider";

const app = express();
const server = createServer(app);
const registry = new ProviderRegistry();
const deviceManager = new DeviceManager();
const health = new HealthService();

const ws = createWsServer(server);
health.setStatus({ wsClients: ws.getClientCount() });
ws.setStatusProvider(() => health.getStatus());

const dispatcher = new EventDispatcher(health, (type, payload) => {
  ws.broadcast(type, payload as Record<string, unknown>);
  health.setStatus({ wsClients: ws.getClientCount() });
});

const hidProvider = new HidProvider((payload) => dispatcher.dispatchRawHid(payload));
const keyboardProvider = new KeyboardProvider();
const vendorProvider = new VendorProvider();

registry.register(keyboardProvider);
registry.register(hidProvider);
registry.register(vendorProvider);

deviceManager.registerProvider(keyboardProvider);
deviceManager.registerProvider(hidProvider);
deviceManager.registerProvider(vendorProvider);

for (const provider of registry.list()) {
  provider.onButton((event) => dispatcher.dispatch(event, "button_pressed"));
}

app.use(express.json());

app.get("/status", (_req, res) => {
  health.setStatus({
    activeProvider: registry.getActive()?.id || null,
    devicesConnected: deviceManager.countConnected(),
    lastDeviceScanAt: deviceManager.getLastScanAt(),
    lastDeviceCount: deviceManager.getDevices().length,
    wsClients: ws.getClientCount(),
    testMode: keyboardProvider.isTestMode(),
  });
  res.json(health.getStatus());
});

app.get("/devices", async (_req, res) => {
  const devices = await deviceManager.refreshDevices();
  health.setStatus({ devicesConnected: deviceManager.countConnected() });
  res.json({ devices });
});

app.post("/devices/connect", async (req, res) => {
  const receiverId = String(req.body?.receiverId || "");
  if (!receiverId) {
    res.status(400).json({ error: "receiverId is required" });
    return;
  }

  const devices = await deviceManager.refreshDevices();
  const device = devices.find((entry) => entry.receiverId === receiverId);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const provider = deviceManager.getProvider(device.provider);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }

  await provider.connect(receiverId);
  const refreshed = await deviceManager.refreshDevices();
  health.setStatus({ devicesConnected: deviceManager.countConnected() });

  res.json({ ok: true, devices: refreshed });
});

app.post("/providers/:providerId/connect", async (req, res) => {
  const providerId = req.params.providerId;
  const provider = deviceManager.getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  await provider.connect(String(req.body?.deviceId || ""));
  if (providerId === "keyboard") {
    health.setStatus({ testMode: keyboardProvider.isTestMode() });
  }
  res.json({ ok: true });
});

app.post("/providers/:providerId/disconnect", async (req, res) => {
  const providerId = req.params.providerId;
  const provider = deviceManager.getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  await provider.disconnect(String(req.body?.deviceId || ""));
  if (providerId === "keyboard") {
    health.setStatus({ testMode: keyboardProvider.isTestMode() });
  }
  res.json({ ok: true });
});

const getProviderOr404 = (
  providerId: string,
  res: express.Response
): { provider: { reset: (id?: string) => Promise<void> } } | null => {
  const provider = deviceManager.getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return null;
  }
  return { provider };
};

app.post("/reset", async (req, res) => {
  const providerId = String(req.body?.providerId || registry.getActive()?.id || "");
  const providerEntry = getProviderOr404(providerId, res);
  if (!providerEntry) {
    return;
  }
  await providerEntry.provider.reset(String(req.body?.deviceId || ""));
  res.json({ ok: true, providerId });
});

app.post("/providers/:providerId/reset", async (req, res) => {
  const providerId = req.params.providerId;
  const providerEntry = getProviderOr404(providerId, res);
  if (!providerEntry) {
    return;
  }
  await providerEntry.provider.reset(String(req.body?.deviceId || ""));
  res.json({ ok: true, providerId });
});

app.post("/test/start", async (_req, res) => {
  await keyboardProvider.connect("keyboard:local");
  health.setStatus({ testMode: keyboardProvider.isTestMode() });
  res.json({ ok: true, testMode: keyboardProvider.isTestMode() });
});

app.post("/test/stop", async (_req, res) => {
  await keyboardProvider.disconnect("keyboard:local");
  health.setStatus({ testMode: keyboardProvider.isTestMode() });
  res.json({ ok: true, testMode: keyboardProvider.isTestMode() });
});

app.post("/test/press", (req, res) => {
  const buttonId = String(req.body?.buttonId || "A");
  keyboardProvider.emitTestPress(buttonId);
  res.json({ ok: true, buttonId });
});

const start = async () => {
  try {
    await registry.initAll();
    registry.setActive(config.defaultProvider);
    await deviceManager.refreshDevices();
    health.setStatus({ bridgeStatus: "ready" });
    health.setStatus({
      lastDeviceScanAt: deviceManager.getLastScanAt(),
      lastDeviceCount: deviceManager.getDevices().length,
    });

    server.listen(config.port, "127.0.0.1", () => {
      console.log(
        `[bridge] started on http://127.0.0.1:${config.port} (ws ${config.wsPath})`
      );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[bridge] failed to start:", message);
    health.setStatus({ bridgeStatus: "error", lastError: message });
    process.exitCode = 1;
  }
};

const shutdown = async (signal: string) => {
  console.log(`[bridge] shutting down (${signal})`);
  health.setStatus({ bridgeStatus: "error" });

  await Promise.all(
    registry
      .list()
      .map((provider) => provider.dispose().catch((err) => err))
  );

  server.close(() => {
    console.log("[bridge] server closed");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();