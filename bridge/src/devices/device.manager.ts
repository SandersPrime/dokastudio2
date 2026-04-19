import { DeviceInfo } from "./device.model";
import { ReceiverProvider } from "../providers/base.provider";

export class DeviceManager {
  private providers = new Map<string, ReceiverProvider>();
  private devices: DeviceInfo[] = [];
  private lastScanAt: string | null = null;

  registerProvider(provider: ReceiverProvider): void {
    this.providers.set(provider.id, provider);
  }

  listProviders(): ReceiverProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: string): ReceiverProvider | undefined {
    return this.providers.get(id);
  }

  async refreshDevices(): Promise<DeviceInfo[]> {
    const providers = this.listProviders();
    console.log(`[bridge] scanning devices (${providers.length} providers)`);

    const providerDevices = await Promise.all(
      providers.map(async (provider) => {
        const devices = await provider.listDevices();
        console.log(
          `[bridge] provider=${provider.id} reported ${devices.length} device(s)`
        );
        return devices;
      })
    );

    this.devices = providerDevices.flat();
    this.lastScanAt = new Date().toISOString();
    console.log(`[bridge] device scan completed, total=${this.devices.length}`);
    return this.devices;
  }

  getDevices(): DeviceInfo[] {
    return this.devices;
  }

  getLastScanAt(): string | null {
    return this.lastScanAt;
  }

  countConnected(): number {
    return this.devices.filter((device) => device.status === "connected").length;
  }
}