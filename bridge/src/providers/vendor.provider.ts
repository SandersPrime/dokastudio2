import { DeviceInfo } from "../devices/device.model";
import { RawButtonEvent } from "../events/event.model";
import { ReceiverProvider } from "./base.provider";
import {
  VendorAdapter,
  VendorAdapterLoader,
  VendorAdapterStatus,
  VendorHelperMessage,
} from "./vendor.adapter";

type VendorDeviceState = {
  receiverId: string;
  status: "connected" | "disconnected" | "unavailable";
  statusReason?: string;
};

export class VendorProvider implements ReceiverProvider {
  id = "vendor";
  type: "vendor" = "vendor";
  private adapterLoader = new VendorAdapterLoader();
  private adapter: VendorAdapter | null = null;
  private onButtonCallback: ((event: RawButtonEvent) => void) | null = null;
  private adapterStatus: VendorAdapterStatus = {
    available: false,
    reason: "Vendor adapter not initialized",
  };
  private device: VendorDeviceState = {
    receiverId: "vendor:primary",
    status: "unavailable",
    statusReason: "Vendor adapter not initialized",
  };

  async init(): Promise<void> {
    console.log("[vendor] provider init");
    this.adapter = await this.adapterLoader.load({
      onEvent: (event) => this.handleHelperEvent(event),
    });
    this.adapterStatus = this.adapterLoader.getStatus();
    if (!this.adapter) {
      this.device = {
        receiverId: "vendor:primary",
        status: "unavailable",
        statusReason: this.adapterStatus.reason || "Vendor adapter unavailable",
      };
      return;
    }

    try {
      await this.adapter.init();
      this.device = {
        receiverId: "vendor:primary",
        status: "disconnected",
      };
      console.log("[vendor] adapter initialized");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.device = {
        receiverId: "vendor:primary",
        status: "unavailable",
        statusReason: message,
      };
      this.adapterStatus = {
        available: false,
        reason: message,
        dllPath: this.adapterStatus.dllPath,
      };
      console.error(`[vendor] adapter init failed: ${message}`);
    }
  }

  isAvailable(): boolean {
    return Boolean(this.adapter);
  }

  getUnavailableReason(): string | null {
    return this.adapterStatus.reason || "Vendor adapter unavailable";
  }

  async listDevices(): Promise<DeviceInfo[]> {
    if (!this.adapter) {
      return [
        {
          receiverId: this.device.receiverId,
          provider: this.id,
          name: "Vendor receiver",
          status: "unavailable",
          statusReason: this.getUnavailableReason(),
          meta: {
            firmware: this.adapterStatus.dllPath ?? undefined,
          },
        },
      ];
    }

    return [
      {
        receiverId: this.device.receiverId,
        provider: this.id,
        name: "Vendor receiver",
        status: this.device.status,
        statusReason: this.device.statusReason,
      },
    ];
  }

  async connect(deviceId: string): Promise<void> {
    if (!this.adapter) {
      throw new Error("Vendor adapter is not loaded");
    }

    if (deviceId !== this.device.receiverId) {
      throw new Error("Vendor device not found");
    }

    console.log(`[vendor] connecting receiverId=${deviceId}`);
    await this.adapter.connect(deviceId);
    this.device = {
      receiverId: deviceId,
      status: "connected",
    };
    console.log(`[vendor] device connected receiverId=${deviceId}`);
  }

  async disconnect(deviceId: string): Promise<void> {
    if (!this.adapter) {
      return;
    }

    if (deviceId !== this.device.receiverId) {
      return;
    }

    console.log(`[vendor] disconnecting receiverId=${deviceId}`);
    await this.adapter.disconnect(deviceId);
    this.device = {
      receiverId: deviceId,
      status: "disconnected",
    };
    console.log(`[vendor] device disconnected receiverId=${deviceId}`);
  }

  onButton(_: (event: RawButtonEvent) => void): void {
    this.onButtonCallback = _;
  }

  async reset(): Promise<void> {
    return;
  }

  async dispose(): Promise<void> {
    if (this.adapter) {
      await this.adapter.dispose();
    }
    this.adapter = null;
    this.onButtonCallback = null;
    this.device = {
      receiverId: "vendor:primary",
      status: "unavailable",
      statusReason: "Vendor adapter disposed",
    };
    console.log("[vendor] provider disposed");
  }

  private handleHelperEvent(event: VendorHelperMessage): void {
    if (event.type === "vendor_button") {
      if (!event.buttonId || !event.receiverId) {
        console.warn("[vendor] vendor_button missing data", event);
        return;
      }

      const rawEvent: RawButtonEvent = {
        provider: this.id,
        receiverId: event.receiverId,
        buttonId: event.buttonId,
        action: "press",
        pressedAt: event.pressedAt || event.timestamp || new Date().toISOString(),
      };

      console.log(
        `[vendor] mapped vendor_button receiverId=${rawEvent.receiverId} buttonId=${rawEvent.buttonId}`
      );

      this.onButtonCallback?.(rawEvent);
    }

    if (event.type === "vendor_status") {
      console.log(
        `[vendor] status update receiverId=${event.receiverId} status=${event.status}`
      );
      const status = event.status;
      if (status === "connected" || status === "disconnected" || status === "unavailable") {
        this.device = {
          receiverId: event.receiverId || this.device.receiverId,
          status,
          statusReason: status === "unavailable" ? "Vendor helper reported unavailable" : undefined,
        };
      }
    }

    if (event.type === "vendor_error") {
      console.warn(`[vendor] helper error: ${event.message}`);
    }
  }
}