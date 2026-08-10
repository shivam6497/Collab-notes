import * as Y from "yjs";
import { persistDocument } from "./document.service.js";
import { clearTimeout } from "timers";

/** Pending save timers keyed by document ID. */
const saveTimer = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Debounce delay before flushing a document to the database.
 * Resets on every new update so rapid edits collapse into a single write.
 */
const DEBOUNCE_MS = 5000;

/**
 * Schedules a debounced database persist for `docId`.
 *
 * Each call resets the existing timer, so the write only happens after
 * `DEBOUNCE_MS` ms of inactivity. This prevents a write per keystroke while
 * still ensuring data is saved promptly after editing pauses.
 */
export function scheduleSave(docId: string, ydoc: Y.Doc): void {
    const existing = saveTimer.get(docId);
    if(existing) clearTimeout(existing);

    const timer = setTimeout( async () => {
        saveTimer.delete(docId);
        try {
            await persistDocument(docId, ydoc);
            console.log(`[autosave] save ${docId}`);
        } catch (error) {
            console.error(`[autosave] failed for ${docId}`, error);
        }
    }, DEBOUNCE_MS);

    saveTimer.set(docId, timer);
}