import { Server as SocketServer, Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  JoinDocPayload,
  DocUpdatePayload,
  AwarenessUpdatePayload,
} from "@repo/types";
import * as Y from "yjs";
import { getOrCreateDoc, getDoc, touchDoc } from "../lib/docStore.js";
import { scheduleSave } from "../services/autosave.service.js";
import { hydrateDocFromDB } from "../services/document.service.js";
import { getOrCreateAwareness } from "../lib/docStore.js";
import * as awarenessProtocol from "y-protocols/awareness";
import bcrypt from "bcrypt";
import { verifyAccessToken } from "../services/auth.service.js";
import { prisma } from "../lib/prisma.js";

/**
 * Maps each socket ID to the set of { docId, clientID } pairs it owns.
 *
 * Yjs assigns a random clientID per Y.Doc instance (i.e. per browser tab).
 * The server-side awareness stores states keyed by those clientIDs, not by
 * socket IDs, so we maintain this lookup to be able to remove the correct
 * awareness states on disconnect without scanning all rooms.
 */
const socketClientMap = new Map<
  string,
  Set<{ docId: string; clientID: number }>
>();

/**
 * Records any clientIDs that were added to the awareness map since
 * `prevKeys` was snapshotted, associating them with the given socket.
 */
function trackClientIDs(
  socketId: string,
  docId: string,
  awareness: awarenessProtocol.Awareness,
  prevKeys: Set<number>,
): void {
  const currentKeys = new Set(awareness.getStates().keys());
  for (const key of currentKeys) {
    if (!prevKeys.has(key)) {
      if (!socketClientMap.has(socketId)) {
        socketClientMap.set(socketId, new Set());
      }
      
      socketClientMap.get(socketId)!.add({ docId, clientID: key });
    }
  }
}

/**
 * Removes all awareness states owned by a socket and broadcasts the removal
 * to the remaining clients in each affected room.
 *
 * Pass `filterDocId` to limit cleanup to a single document; omit it to clean
 * up across all documents the socket was participating in (used on disconnect).
 */
function cleanupSocket(
  io: SocketServer,
  socketId: string,
  filterDocId?: string,
): void {
  const trackedEntries = socketClientMap.get(socketId);
  if (!trackedEntries || trackedEntries.size === 0) {
    if (!filterDocId) socketClientMap.delete(socketId);
    return;
  }

  // Group tracked clientIDs by docId so we can batch-remove per document.
  const byDoc = new Map<string, number[]>();
  const toRemoveFromSet: Array<{ docId: string; clientID: number }> = [];

  for (const entry of trackedEntries) {
    if (filterDocId && entry.docId !== filterDocId) continue;
    if (!byDoc.has(entry.docId)) byDoc.set(entry.docId, []);
    byDoc.get(entry.docId)!.push(entry.clientID);
    toRemoveFromSet.push(entry);
  }

  for (const [docId, clientIDs] of byDoc) {
    const ydoc = getDoc(docId);
    if (!ydoc) continue;

    const awareness = getOrCreateAwareness(docId, ydoc);

    // Skip clientIDs that were already pruned by another code path.
    const existingIDs = clientIDs.filter((id) => awareness.getStates().has(id));
    if (existingIDs.length === 0) continue;

    awarenessProtocol.removeAwarenessStates(
      awareness,
      existingIDs,
      "disconnect",
    );

    // Encode and broadcast the removal so peers can update their cursors.
    const update = awarenessProtocol.encodeAwarenessUpdate(
      awareness,
      existingIDs,
    );
    io.to(`doc:${docId}`).emit(SOCKET_EVENTS.AWARENESS_BROADCAST, {
      awareness: update,
    });

    console.log(
      `[socket] removed awareness for clientIDs [${existingIDs}] from doc ${docId}`,
    );
  }

  for (const entry of toRemoveFromSet) {
    trackedEntries.delete(entry);
  }
  if (!filterDocId || trackedEntries.size === 0) {
    socketClientMap.delete(socketId);
  }
}

/**
 * Registers all socket event handlers for a single connected client.
 *
 * @param io     - The Socket.IO server instance (used to broadcast to rooms).
 * @param socket - The individual socket for the connecting client.
 */
export function registerHandler(io: SocketServer, socket: Socket): void {
  socket.on(
    SOCKET_EVENTS.JOIN_DOC,
    async ({
      docId,
      username,
      password: providedPassword,
      token,
    }: JoinDocPayload & { password?: string; token?: string }) => {
      try {
        const doc = await prisma.document.findUnique({
          where: { id: docId },
          select: { shareMode: true, password: true, userId: true },
        });

        if (!doc) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "Document not found" });
          return;
        }

        // Resolve the requesting user from their access token (may be absent for guests).
        let userId: string | null = null;
        if (token) {
          try {
            const payload = verifyAccessToken(token);
            userId = payload.userId;
          } catch {
            // Treat an invalid token as an unauthenticated request.
          }
        }

        const isOwner = userId === doc.userId;

        if (doc.shareMode === "PASSWORD" && !isOwner) {
          if (!providedPassword) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Password required" });
            return;
          }
          const isMatch = await bcrypt.compare(providedPassword, doc.password!);
          if (!isMatch) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Incorrect password" });
            return;
          }
        }

        await socket.join(`doc:${docId}`);

        let ydoc = getOrCreateDoc(docId);
        const stateVector = Y.encodeStateVector(ydoc);
        const isEmpty = stateVector.length === 1 && stateVector[0] === 0;

        // If the in-memory doc is empty, restore it from the database snapshot.
        if (isEmpty) {
          ydoc = await hydrateDocFromDB(docId);
        }

        // Send the full document state to the joining client.
        const fullState = Y.encodeStateAsUpdate(ydoc);
        socket.emit(SOCKET_EVENTS.DOC_STATE, { update: fullState });

        // Send the current awareness (cursor/presence) state to the joining client.
        const awareness = getOrCreateAwareness(docId, ydoc);
        const awarenessState = awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys()),
        );
        socket.emit(SOCKET_EVENTS.AWARENESS_BROADCAST, {
          awareness: awarenessState,
        });

        console.log(`[socket] ${username} joined doc:${docId}`);
      } catch (err) {
        console.error("[socket] join_doc error", err);
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Failed to join document",
        });
      }
    },
  );

  socket.on(SOCKET_EVENTS.DOC_UPDATE, ({ docId, update }: DocUpdatePayload) => {
    const ydoc = getOrCreateDoc(docId);

    Y.applyUpdate(ydoc, new Uint8Array(update as ArrayBuffer), "remote");
    socket
      .to(`doc:${docId}`)
      .emit(SOCKET_EVENTS.DOC_UPDATE_BROADCAST, { update });

    touchDoc(docId);
    scheduleSave(docId, ydoc);
  });

  socket.on(
    SOCKET_EVENTS.AWARENESS_UPDATE,
    ({ docId, awareness: update }: AwarenessUpdatePayload) => {
      const ydoc = getOrCreateDoc(docId);
      const awareness = getOrCreateAwareness(docId, ydoc);

      // Snapshot state keys before applying the update so we can detect new clientIDs.
      const prevKeys = new Set(awareness.getStates().keys());

      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        new Uint8Array(update as ArrayBuffer),
        socket.id,
      );

      trackClientIDs(socket.id, docId, awareness, prevKeys);

      socket
        .to(`doc:${docId}`)
        .emit(SOCKET_EVENTS.AWARENESS_BROADCAST, { awareness: update });

      touchDoc(docId);
    },
  );

  /**
   * Explicit leave event sent by the client before navigating away or closing.
   * Preferred over relying solely on `disconnect`, which can take 20-45 s when
   * the browser terminates the connection during page unload.
   */
  socket.on("leave_doc", ({ docId }: { docId: string }) => {
    const ydoc = getOrCreateDoc(docId);
    const awareness = getOrCreateAwareness(docId, ydoc);
    awarenessProtocol.removeAwarenessStates(
      awareness,
      [ydoc.clientID],
      "leave",
    );
    socket.leave(`doc:${docId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    // Fallback: cleans up any presence state for clients that did not send `leave_doc`.
    cleanupSocket(io, socket.id);
  });
}
