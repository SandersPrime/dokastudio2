import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import WebSocket from "ws";

export type VendorHelperMessage =
  | {
      type: "vendor_status";
      status?: string;
      receiverId?: string;
      timestamp?: string;
    }
  | {
      type: "vendor_button";
      receiverId?: string;
      buttonId?: string;
      raw?: string;
      timestamp?: string;
      pressedAt?: string;
    }
  | {
      type: "vendor_error";
      message?: string;
      timestamp?: string;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export type VendorHelperEventHandler = (event: VendorHelperMessage) => void;

export type VendorAdapterStatus = {
  available: boolean;
  reason?: string;
  dllPath?: string | null;
  helperUrl?: string;
  wsUrl?: string;
};

export interface VendorAdapter {
  init(): Promise<void>;
  connect(deviceId?: string): Promise<void>;
  disconnect(deviceId?: string): Promise<void>;
  dispose(): Promise<void>;
}

class VendorHelperAdapter implements VendorAdapter {
  private helperUrl: string;
  private wsUrl: string;
  private process: ChildProcessWithoutNullStreams | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private readonly onEvent: VendorHelperEventHandler;
  private reconnectAttempts = 0;

  constructor(
    helperUrl: string,
    wsUrl: string,
    onEvent: VendorHelperEventHandler
  ) {
    this.helperUrl = helperUrl;
    this.wsUrl = wsUrl;
    this.onEvent = onEvent;
  }

  async init(): Promise<void> {
    await this.ensureHelper();
    this.connectWebSocket();
  }

  async connect(deviceId?: string): Promise<void> {
    await this.post("/connect", { receiverId: deviceId || "vendor:primary" });
  }

  async disconnect(deviceId?: string): Promise<void> {
    await this.post("/disconnect", { receiverId: deviceId || "vendor:primary" });
  }

  async dispose(): Promise<void> {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    if (this.process) {
      this.process.kill();
    }
    this.process = null;
  }

  private async ensureHelper(): Promise<void> {
    try {
      await this.get("/health");
      return;
    } catch (error) {
      console.warn("[vendor] helper not reachable, attempting to spawn", error);
    }

    const helperPath = process.env.VENDOR_HELPER_PATH || "";
    if (!helperPath) {
      throw new Error("VENDOR_HELPER_PATH is not set");
    }

    this.process = spawn(helperPath, [], {
      stdio: "pipe",
      env: process.env,
    });

    this.process.stdout.on("data", (data) => {
      console.log(`[vendor-helper] ${String(data).trim()}`);
    });
    this.process.stderr.on("data", (data) => {
      console.error(`[vendor-helper] ${String(data).trim()}`);
    });

    await this.waitForHealth();
  }

  private connectWebSocket(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts += 1;

    console.log(
      `[vendor] helper ws connecting to ${this.wsUrl} (attempt ${this.reconnectAttempts})`
    );

    this.socket = new WebSocket(this.wsUrl);

    this.socket.on("open", () => {
      this.reconnectAttempts = 0;
      console.log("[vendor] helper ws connected");
    });

    this.socket.on("message", (data) => {
      const payload = data.toString();
      try {
        const message = JSON.parse(payload) as VendorHelperMessage;
        if (message.type === "vendor_button") {
          console.log(
            `[vendor] vendor_button received receiverId=${message.receiverId} buttonId=${message.buttonId}`
          );
        }
        if (message.type === "vendor_error") {
          console.warn(
            `[vendor] vendor_error received message=${message.message}`
          );
        }
        this.onEvent(message);
      } catch (error) {
        console.error("[vendor] failed to parse helper ws message", error, payload);
      }
    });

    this.socket.on("close", () => {
      console.warn("[vendor] helper ws disconnected");
      this.scheduleReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("[vendor] helper ws error", error);
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    console.log("[vendor] helper ws reconnect scheduled");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 2000);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async waitForHealth(): Promise<void> {
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.get("/health");
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error("Vendor helper did not become ready");
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  private async get(path: string): Promise<unknown> {
    const response = await fetch(`${this.helperUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Helper GET ${path} failed: ${response.status}`);
    }
    return response.json();
  }

  private async post(path: string, payload: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.helperUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Helper POST ${path} failed: ${response.status}`);
    }
    return response.json();
  }
}

export class VendorAdapterLoader {
  private status: VendorAdapterStatus = {
    available: false,
    reason: "Vendor adapter not initialized",
    dllPath: null,
  };

  async load(options?: {
    onEvent?: VendorHelperEventHandler;
  }): Promise<VendorAdapter | null> {
    if (process.platform !== "win32") {
      this.status = {
        available: false,
        reason: "Vendor adapter is supported only on Windows",
        dllPath: null,
        helperUrl: undefined,
        wsUrl: undefined,
      };
      console.warn(`[vendor] ${this.status.reason}`);
      return null;
    }

    const dllPath = process.env.VENDOR_DLL_PATH || process.env.VENDOR_DLL || null;
    if (!dllPath) {
      this.status = {
        available: false,
        reason: "VENDOR_DLL_PATH is not set",
        dllPath: null,
        helperUrl: undefined,
        wsUrl: undefined,
      };
      console.warn(`[vendor] ${this.status.reason}`);
      return null;
    }

    const helperPort = process.env.VENDOR_HELPER_PORT || "17610";
    const wsPath = process.env.VENDOR_HELPER_WS_PATH || "/ws";
    const helperUrl = `http://127.0.0.1:${helperPort}`;
    const wsUrl = `ws://127.0.0.1:${helperPort}${wsPath}`;

    console.log(`[vendor] preparing helper adapter (dll=${dllPath})`);

    try {
      const adapter = new VendorHelperAdapter(
        helperUrl,
        wsUrl,
        options?.onEvent || (() => null)
      );
      this.status = {
        available: true,
        reason: "Vendor helper adapter loaded",
        dllPath,
        helperUrl,
        wsUrl,
      };
      console.log(`[vendor] ${this.status.reason} at ${helperUrl}`);
      return adapter;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = {
        available: false,
        reason: message,
        dllPath,
        helperUrl,
        wsUrl,
      };
      console.error(`[vendor] failed to load adapter: ${message}`);
      return null;
    }
  }

  getStatus(): VendorAdapterStatus {
    return this.status;
  }
}