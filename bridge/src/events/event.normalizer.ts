import { RawButtonEvent, UnifiedButtonEvent } from "./event.model";

export const normalizeEvent = (raw: RawButtonEvent): UnifiedButtonEvent => {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: raw.provider,
    receiverId: raw.receiverId,
    buttonId: raw.buttonId,
    action: raw.action,
    pressedAt: raw.pressedAt || new Date().toISOString(),
  };
};