export type ButtonAction = "press";

export type BridgeEventType = "button_pressed" | "raw_hid_report";

export interface UnifiedButtonEvent {
  eventId: string;
  provider: string;
  receiverId: string;
  buttonId: string;
  action: ButtonAction;
  pressedAt: string;
}

export interface RawButtonEvent {
  provider: string;
  receiverId: string;
  buttonId: string;
  action: ButtonAction;
  pressedAt?: string;
}

export interface RawHidReportEvent {
  provider: "hid";
  receiverId: string;
  vendorId: number;
  productId: number;
  reportHex: string;
  reportLength: number;
  receivedAt: string;
}