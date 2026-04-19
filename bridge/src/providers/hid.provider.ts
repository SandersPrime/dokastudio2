import { DeviceInfo } from "../devices/device.model";
import { RawButtonEvent } from "../events/event.model";
import { ReceiverProvider } from "./base.provider";

type HidDeviceHandle = {
  on: (event: string, callback: (data: Buffer) => void) => void;
  close: () => void;
  readTimeout?: (timeoutMs: number) => Buffer;
  readSync?: () => Buffer;
};

type HidModule = {
  devices?: () => HidDeviceInfo[];
  HID: new (path: string) => HidDeviceHandle;
};
type HidDeviceInfo = {
  vendorId?: number;
  productId?: number;
  path?: string;
  serialNumber?: string;
  product?: string;
  manufacturer?: string;
  usagePage?: number;
  usage?: number;
  interface?: number;
  interfaceNumber?: number;
  release?: number;
  collection?: number;
};

const TARGET_VENDOR_ID = 0x10c4;
const TARGET_PRODUCT_ID = 0x1819;

export class HidProvider implements ReceiverProvider {
  id = "hid";
  type: "hid" = "hid";
  private hid: HidModule | null = null;
  private unavailableReason: string | null = null;
  private device: HidDeviceHandle | null = null;
  private connectedDeviceId: string | null = null;
  private lastReportAt: string | null = null;
  private reportTimeout: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private rawReportCallback:
    | ((payload: {
        receiverId: string;
        vendorId: number;
        productId: number;
        reportHex: string;
        reportLength: number;
        receivedAt: string;
      }) => void)
    | null;

  constructor(
    rawReportCallback?: (payload: {
      receiverId: string;
      vendorId: number;
      productId: number;
      reportHex: string;
      reportLength: number;
      receivedAt: string;
    }) => void
  ) {
    this.rawReportCallback = rawReportCallback || null;
  }

  async init(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.hid = require("node-hid") as HidModule;
      this.unavailableReason = null;
    } catch (error) {
      this.hid = null;
      const message = error instanceof Error ? error.message : "node-hid is not installed";
      this.unavailableReason = message;
      console.warn(`[hid] provider unavailable: ${message}`);
    }
  }

  isAvailable(): boolean {
    return Boolean(this.hid);
  }

  getUnavailableReason(): string | null {
    return this.unavailableReason;
  }

  async listDevices(): Promise<DeviceInfo[]> {
    if (!this.hid) {
      return [
        {
          receiverId: "hid:unavailable",
          provider: this.id,
          name: "HID provider",
          status: "unavailable",
          statusReason: this.unavailableReason || "node-hid not installed",
        },
      ];
    }

    const devices = (this.hid.devices?.() || []) as HidDeviceInfo[];
    const matches = devices.filter(
      (device) =>
        device.vendorId === TARGET_VENDOR_ID &&
        device.productId === TARGET_PRODUCT_ID
    );

    if (matches.length) {
      console.log(`[hid] discovered ${matches.length} candidate device(s)`);
      matches.forEach((device, index) => {
        console.log(
          `[hid] candidate #${index + 1} path=${device.path} vendorId=${device.vendorId} productId=${device.productId} serial=${device.serialNumber} manufacturer=${device.manufacturer} product=${device.product} usagePage=${device.usagePage} usage=${device.usage} interface=${device.interface} interfaceNumber=${device.interfaceNumber} release=${device.release} collection=${device.collection}`
        );
      });
    }

    if (!matches.length) {
      return [];
    }

    return matches.map((device, index) => {
      const receiverId = device.path
        ? `hid:${device.path}`
        : `hid:${TARGET_VENDOR_ID.toString(16)}:${TARGET_PRODUCT_ID.toString(16)}:${index}`;
      return {
        receiverId,
        provider: this.id,
        name: device.product || "HID Receiver",
        status: this.connectedDeviceId === receiverId ? "connected" : "disconnected",
        meta: {
          serial: device.serialNumber,
          vendorId: device.vendorId,
          productId: device.productId,
          path: device.path,
          manufacturer: device.manufacturer,
          usagePage: device.usagePage,
          usage: device.usage,
          interface: device.interface,
          interfaceNumber: device.interfaceNumber,
          release: device.release,
          collection: device.collection,
        },
      };
    });
  }

  async connect(deviceId: string): Promise<void> {
    if (!this.hid) {
      throw new Error("node-hid is not available");
    }

    const devices = (this.hid.devices?.() || []) as HidDeviceInfo[];
    const matches = devices.filter(
      (device) =>
        device.vendorId === TARGET_VENDOR_ID &&
        device.productId === TARGET_PRODUCT_ID
    );
    matches.forEach((device, index) => {
      console.log(
        `[hid] candidate #${index + 1} path=${device.path} vendorId=${device.vendorId} productId=${device.productId} serial=${device.serialNumber} manufacturer=${device.manufacturer} product=${device.product} usagePage=${device.usagePage} usage=${device.usage} interface=${device.interface} interfaceNumber=${device.interfaceNumber} release=${device.release} collection=${device.collection}`
      );
    });
    const match = devices.find((device, index) => {
      const receiverId = device.path
        ? `hid:${device.path}`
        : `hid:${TARGET_VENDOR_ID.toString(16)}:${TARGET_PRODUCT_ID.toString(16)}:${index}`;
      return receiverId === deviceId;
    });

    if (!match) {
      throw new Error("HID device not found");
    }

    if (!match.path) {
      throw new Error("HID device path is missing");
    }

    this.device?.close();
    console.log(
      `[hid] opening device receiverId=${deviceId} path=${match.path} vendorId=${match.vendorId} productId=${match.productId} usagePage=${match.usagePage} usage=${match.usage} interface=${match.interface} interfaceNumber=${match.interfaceNumber}`
    );
    this.device = new this.hid.HID(match.path);
    this.connectedDeviceId = deviceId;
    this.lastReportAt = null;

    console.log(
      `[hid] opened device receiverId=${deviceId} path=${match.path} vendorId=${match.vendorId} productId=${match.productId}`
    );

    console.log(
      `[hid] available methods receiverId=${deviceId} readTimeout=${Boolean(
        this.device.readTimeout
      )} readSync=${Boolean(this.device.readSync)}`
    );

    const vendorId = match.vendorId ?? TARGET_VENDOR_ID;
    const productId = match.productId ?? TARGET_PRODUCT_ID;

    this.device.on("data", (data: Buffer) => {
      const reportHex = Array.from(data)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
      const receivedAt = new Date().toISOString();

      this.lastReportAt = receivedAt;
      if (this.reportTimeout) {
        clearTimeout(this.reportTimeout);
        this.reportTimeout = null;
      }

      console.log(
        `[hid] report receiverId=${deviceId} timestamp=${receivedAt} length=${data.length} hex=${reportHex}`
      );

      if (this.rawReportCallback) {
        this.rawReportCallback({
          receiverId: deviceId,
          vendorId,
          productId,
          reportHex,
          reportLength: data.length,
          receivedAt,
        });
      }
    });
    console.log(`[hid] data listener registered for receiverId=${deviceId}`);

    this.device.on("error", (error: Error) => {
      console.error(`[hid] device error receiverId=${deviceId}:`, error.message || error);
    });
    console.log(`[hid] error listener registered for receiverId=${deviceId}`);

    this.device.on("close", () => {
      console.warn(`[hid] device close event receiverId=${deviceId}`);
    });
    console.log(`[hid] close listener registered for receiverId=${deviceId}`);

    if ((this.device as unknown as { getFeatureReport?: unknown }).getFeatureReport) {
      console.log(`[hid] getFeatureReport available receiverId=${deviceId}`);
    }
    if ((this.device as unknown as { sendFeatureReport?: unknown }).sendFeatureReport) {
      console.log(`[hid] sendFeatureReport available receiverId=${deviceId}`);
    }
    if ((this.device as unknown as { write?: unknown }).write) {
      console.log(`[hid] write available receiverId=${deviceId}`);
    }

    try {
      const getFeatureReport = (this.device as unknown as { getFeatureReport?: (reportId: number, length: number) => number[] })
        .getFeatureReport;
      if (getFeatureReport) {
        const report = getFeatureReport(0, 64);
        console.log(
          `[hid] getFeatureReport(0,64) receiverId=${deviceId} length=${report.length} data=${report
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(" ")}`
        );
      }
    } catch (error) {
      console.warn(`[hid] getFeatureReport failed receiverId=${deviceId}:`, error);
    }

    try {
      const sendFeatureReport = (this.device as unknown as { sendFeatureReport?: (data: number[]) => number })
        .sendFeatureReport;
      if (sendFeatureReport) {
        const payload = [0x00];
        const result = sendFeatureReport(payload);
        console.log(
          `[hid] sendFeatureReport success receiverId=${deviceId} bytes=${result} payload=${payload
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(" ")}`
        );
      }
    } catch (error) {
      console.warn(`[hid] sendFeatureReport failed receiverId=${deviceId}:`, error);
    }

    try {
      const write = (this.device as unknown as { write?: (data: number[]) => number }).write;
      if (write) {
        const payload = [0x00];
        const result = write(payload);
        console.log(
          `[hid] write success receiverId=${deviceId} bytes=${result} payload=${payload
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(" ")}`
        );
      }
    } catch (error) {
      console.warn(`[hid] write failed receiverId=${deviceId}:`, error);
    }

    this.reportTimeout = setTimeout(() => {
      if (!this.lastReportAt) {
        console.warn(
          `[hid] connected but no reports received within 10s receiverId=${deviceId}`
        );
      }
    }, 10000);

    if (this.device.readTimeout || this.device.readSync) {
      console.log(
        `[hid] polling read enabled receiverId=${deviceId} using ${this.device.readTimeout ? "readTimeout" : "readSync"}`
      );
      this.pollTimer = setInterval(() => {
        try {
          const buffer = this.device?.readTimeout
            ? this.device.readTimeout(50)
            : this.device?.readSync
              ? this.device.readSync()
              : null;
          if (!buffer || buffer.length === 0) {
            return;
          }
          const reportHex = Array.from(buffer)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(" ");
          const receivedAt = new Date().toISOString();

          this.lastReportAt = receivedAt;
          if (this.reportTimeout) {
            clearTimeout(this.reportTimeout);
            this.reportTimeout = null;
          }

          console.log(
            `[hid] report(poll) receiverId=${deviceId} timestamp=${receivedAt} length=${buffer.length} hex=${reportHex}`
          );

          if (this.rawReportCallback) {
            this.rawReportCallback({
              receiverId: deviceId,
              vendorId,
              productId,
              reportHex,
              reportLength: buffer.length,
              receivedAt,
            });
          }
        } catch (error) {
          console.error(`[hid] read polling error receiverId=${deviceId}:`, error);
        }
      }, 250);
    } else {
      console.log(`[hid] polling read not available for receiverId=${deviceId}`);
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    if (this.connectedDeviceId !== deviceId) {
      return;
    }
    this.device?.close();
    this.device = null;
    this.connectedDeviceId = null;
    this.lastReportAt = null;
    if (this.reportTimeout) {
      clearTimeout(this.reportTimeout);
      this.reportTimeout = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  onButton(callback: (event: RawButtonEvent) => void): void {
    return;
  }

  async reset(): Promise<void> {
    return;
  }

  async dispose(): Promise<void> {
    this.device?.close();
    this.device = null;
    this.connectedDeviceId = null;
    this.lastReportAt = null;
    if (this.reportTimeout) {
      clearTimeout(this.reportTimeout);
      this.reportTimeout = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}