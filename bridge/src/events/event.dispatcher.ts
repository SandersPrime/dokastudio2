import { normalizeEvent } from "./event.normalizer";
import { RawButtonEvent, RawHidReportEvent } from "./event.model";
import { HealthService } from "../diagnostics/health.service";

type BroadcastFn = (type: string, payload: unknown) => void;

export class EventDispatcher {
  constructor(
    private readonly health: HealthService,
    private readonly broadcast: BroadcastFn
  ) {}

  dispatch(raw: RawButtonEvent, type: "button_pressed" | "test_event"): void {
    const event = normalizeEvent(raw);
    this.health.setStatus({ lastEventAt: event.pressedAt });
    console.log(
      `[bridge] button ${event.action} receiver=${event.receiverId} keyPad=${event.keyPad} button=${event.buttonId} provider=${event.provider}`
    );
    this.broadcast(type, { event });
  }

  dispatchRawHid(payload: RawHidReportEvent): void {
    const { receiverId, reportLength, reportHex } = payload;
    console.log(
      `[hid] report from receiver ${receiverId} length=${reportLength} at ${payload.receivedAt}`
    );
    console.log(`[hid] data: ${reportHex}`);
    this.broadcast("raw_hid_report", { event: payload } as Record<string, unknown>);
  }
}