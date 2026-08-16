import dotenv from "dotenv";
dotenv.config();
import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./socket/index.js";

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT ?? 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (REST + WebSocket)`);
});
