import * as Y from "yjs";
import { getOrCreateDoc } from "../lib/docStore.js";
import { prisma } from "../lib/prisma.js";

/** Creates a new document record in the database and returns its generated ID. */
export async function createDocument(): Promise<{ id: string }> {
    const doc = await prisma.document.create({
        data: { title: "undefined" },
    });
    return { id: doc.id };
}

/** Returns the document metadata for `docId`, or `null` if it does not exist. */
export async function getDocumentMeta(docId: string) {
    return prisma.document.findUnique({
        where: { id: docId },
        select: { id: true, title: true, createdAt: true, updatedAt: true, userId: true },
    });
}

/**
 * Loads the persisted binary Yjs state for `docId` from the database and
 * applies it to the in-memory Y.Doc, then returns the hydrated document.
 *
 * Called when a client joins a document whose in-memory state is empty
 * (i.e. the server was restarted or the doc was evicted from the cache).
 */
export async function hydrateDocFromDB(docId: string): Promise<Y.Doc> {
    const record = await prisma.document.findUnique({ where: { id: docId }});
    const ydoc = getOrCreateDoc(docId);

    if(record?.content) {
        Y.applyUpdate(ydoc , record.content);
    }

    return ydoc;
}

/**
 * Serializes the current Yjs state of `ydoc` to a binary buffer and writes
 * it to the database, replacing the previous snapshot.
 */
export async function persistDocument(docId: string, ydoc: Y.Doc): Promise<void> {
    const content = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    await prisma.document.update({
        where: { id: docId },
        data: { content, updatedAt: new Date() },
    });
}