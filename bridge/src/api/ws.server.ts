import { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { config } from "../app/config";
import { BridgeHealth } from "../diagnostics/health.service";

export interface WsBroadcaster {
  broadcast(type: string, payload?: Record<string, unknown>): void;
  setStatusProvider(callback: () => BridgeHealth): void;
  getClientCount(): number;
}

export const createWsServer = (server: HttpServer): WsBroadcaster => {
  const wss = new WebSocketServer({ server, path: config.wsPath });
  let statusProvider: (() => BridgeHealth) | null = null;

  const broadcast = (
    type: string,
    payload: Record<string, unknown> = {}
  ): void => {
    const message = JSON.stringify({ type, ...payload });
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on("connection", (socket: WebSocket) => {
    if (statusProvider) {
      socket.send(
        JSON.stringify({ type: "bridge_status", status: statusProvider() })
      );
    }

    socket.on("error", () => null);
  });

  return {
    broadcast,
    setStatusProvider(callback: () => BridgeHealth) {
      statusProvider = callback;
    },
    getClientCount() {
      return wss.clients.size;
    },
  };
};