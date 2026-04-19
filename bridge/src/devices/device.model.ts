export type DeviceStatus = "connected" | "disconnected" | "unavailable";

export interface DeviceInfo {
  receiverId: string;
  provider: string;
  name: string;
  status: DeviceStatus;
  statusReason?: string;
  meta?: {
    serial?: string;
    firmware?: string;
    vendorId?: number;
    productId?: number;
    path?: string;
    manufacturer?: string;
    usagePage?: number;
    usage?: number;
    interface?: number;
    interfaceNumber?: number;
    release?: number;
    collection?: number;
  };
  capabilities?: {
    supportsReset?: boolean;
    supportsRelease?: boolean;
    supportsBattery?: boolean;
    supportsSignalStrength?: boolean;
  };
}