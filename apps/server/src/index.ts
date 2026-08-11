import dotenv from "dotenv";
dotenv.config();
import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./socket/index.js";

const httpServer = createServer(app);

/**
 * The WebSocket server runs on a dedicated port so it can be scaled or
 * proxied independently from the REST API (e.g. behind a different load
 * balancer path or worker pool).
 */
const { createServer: createWsServer } = await import("http");
const wsServer = createWsServer();
initSocket(wsServer);

const PORT = process.env.PORT ?? 5000;
const WS_PORT = process.env.WS_PORT ?? 5001;

httpServer.listen(PORT, () => {
  console.log(`REST server running on port ${PORT}`);
});

wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});
