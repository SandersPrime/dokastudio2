import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 17600),
  wsPath: process.env.WS_PATH || "/ws",
  bridgeVersion: process.env.BRIDGE_VERSION || "0.1.0",
  protocolVersion: process.env.PROTOCOL_VERSION || "1",
  defaultProvider: process.env.DEFAULT_PROVIDER || "keyboard",
};