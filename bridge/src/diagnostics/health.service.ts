import { config } from "../app/config";

export type BridgeStatus = "starting" | "ready" | "error";

export interface BridgeHealth {
  bridgeStatus: BridgeStatus;
  protocolVersion: string;
  version: string;
  uptimeMs: number;
  activeProvider: string | null;
  devicesConnected: number;
  lastDeviceScanAt: string | null;
  lastDeviceCount: number;
  wsClients: number;
  testMode: boolean;
  lastEventAt: string | null;
  lastError: string | null;
}

export class HealthService {
  private readonly startedAt = Date.now();
  private state: BridgeHealth = {
    bridgeStatus: "starting",
    protocolVersion: config.protocolVersion,
    version: config.bridgeVersion,
    uptimeMs: 0,
    activeProvider: null,
    devicesConnected: 0,
    lastDeviceScanAt: null,
    lastDeviceCount: 0,
    wsClients: 0,
    testMode: false,
    lastEventAt: null,
    lastError: null,
  };

  getStatus(): BridgeHealth {
    return {
      ...this.state,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  setStatus(update: Partial<BridgeHealth>): void {
    this.state = {
      ...this.state,
      ...update,
    };
  }
}