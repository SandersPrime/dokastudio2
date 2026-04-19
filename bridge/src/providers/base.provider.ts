import { DeviceInfo } from "../devices/device.model";
import { RawButtonEvent } from "../events/event.model";

export type ProviderType = "hid" | "com" | "vendor" | "keyboard";

export interface ReceiverProvider {
  id: string;
  type: ProviderType;
  init(): Promise<void>;
  isAvailable(): boolean;
  getUnavailableReason?(): string | null;
  listDevices(): Promise<DeviceInfo[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  onButton(callback: (event: RawButtonEvent) => void): void;
  reset(deviceId?: string): Promise<void>;
  dispose(): Promise<void>;
}