import { io, Socket } from "socket.io-client";

/**
 * Lazily-created Socket.IO client singleton.
 *
 * A single socket instance is shared across the application so that
 * reconnect state, event listeners, and room membership survive component
 * unmounts and re-mounts (e.g. React Strict Mode double-invocation).
 */
let socket: Socket | null = null;

/**
 * Returns the shared Socket.IO client, creating it on the first call.
 * `autoConnect: false` means the socket only connects when `.connect()`
 * is explicitly called by a component.
 */
export function getSocket(): Socket {
    if(!socket) {
        socket = io(process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:5000", {
            transports: ["websocket", "polling"],
            autoConnect: false,
            withCredentials: true,
        });
    }
    return socket;
}