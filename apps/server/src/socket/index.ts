import { Server as Httpserver } from "http";
import { Server as SocketServer }  from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "../lib/redis.js";
import { registerHandler } from "./handler.js";

export function initSocket(httpServer: Httpserver): SocketServer {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL ?? "http://localhost:3000",
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
    });

    io.adapter(createAdapter(pubClient, subClient));

    io.on("connection", (socket) => {
        console.log(`[socket] connected ${socket.id}`);
        registerHandler(io, socket);
    });

    return io;
}