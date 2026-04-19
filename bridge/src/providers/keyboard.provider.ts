import { DeviceInfo } from "../devices/device.model";
import { RawButtonEvent } from "../events/event.model";
import { ReceiverProvider } from "./base.provider";

export class KeyboardProvider implements ReceiverProvider {
  id = "keyboard";
  type: "keyboard" = "keyboard";
  private callback: ((event: RawButtonEvent) => void) | null = null;
  private testMode = false;

  async init(): Promise<void> {
    return;
  }

  isAvailable(): boolean {
    return true;
  }

  async listDevices(): Promise<DeviceInfo[]> {
    return [
      {
        receiverId: "keyboard:local",
        provider: this.id,
        name: "Keyboard Test Provider",
        status: this.testMode ? "connected" : "disconnected",
        meta: {
          vendorId: undefined,
          productId: undefined,
        },
        capabilities: {
          supportsReset: true,
        },
      },
    ];
  }

  async connect(): Promise<void> {
    this.testMode = true;
  }

  async disconnect(): Promise<void> {
    this.testMode = false;
  }

  onButton(callback: (event: RawButtonEvent) => void): void {
    this.callback = callback;
  }

  async reset(): Promise<void> {
    return;
  }

  async dispose(): Promise<void> {
    this.callback = null;
    this.testMode = false;
  }

  isTestMode(): boolean {
    return this.testMode;
  }

  emitTestPress(buttonId: string): void {
    if (!this.callback || !this.testMode) {
      return;
    }

    this.callback({
      provider: this.id,
      receiverId: "keyboard:local",
      buttonId,
      action: "press",
      pressedAt: new Date().toISOString(),
    });
  }
}