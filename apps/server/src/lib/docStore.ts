import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";

/** In-memory store of active Y.Doc instances, keyed by document ID. */
const store = new Map<string, Y.Doc>();

/** In-memory store of Awareness instances, one per active document. */
const awarenessStore = new Map<string, awarenessProtocol.Awareness>();

/** Timestamp (ms) of the last write activity for each document. */
const lastActivity = new Map<string, number>();

const INACIVE_THRESHOLD_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Returns the existing Awareness instance for a document, or creates and
 * stores a new one if none exists yet.
 */
export function getOrCreateAwareness(
  docId: string,
  ydoc: Y.Doc,
): awarenessProtocol.Awareness {
  if (awarenessStore.has(docId)) return awarenessStore.get(docId)!;
  const awareness = new awarenessProtocol.Awareness(ydoc);
  awareness.setLocalState(null);
  awarenessStore.set(docId, awareness);
  return awareness;
}

/** Returns the Y.Doc for `docId`, or `undefined` if it is not loaded. */
export function getDoc(docId: string): Y.Doc | undefined {
  return store.get(docId);
}

/**
 * Returns the existing Y.Doc for `docId`, or creates, stores, and returns
 * a new empty one if none exists yet.
 */
export function getOrCreateDoc(docId: string): Y.Doc {
  if (store.has(docId)) return store.get(docId)!;
  const doc = new Y.Doc();
  store.set(docId, doc);
  lastActivity.set(docId, Date.now());
  return doc;
}

/** Updates the last-activity timestamp for a document to prevent early eviction. */
export function touchDoc(docId: string): void {
  lastActivity.set(docId, Date.now());
}

/**
 * Destroys and removes the Y.Doc and its associated Awareness instance from
 * the in-memory stores, freeing all resources.
 */
export function deleteDoc(docId: string): void {
  const doc = store.get(docId);
  if (doc) {
    doc.destroy();
    store.delete(docId);
  }
  const awareness = awarenessStore.get(docId);
  if (awareness) {
    awareness.destroy();
    awarenessStore.delete(docId);
  }
  lastActivity.delete(docId);
}

/**
 * Periodically evicts documents that have had no activity within
 * `INACIVE_THRESHOLD_MS` to keep memory usage bounded.
 */
const cleanupInterval = setInterval(() => {
    const date = Date.now();
    let evicted = 0;

    for(const[docId, lastseen] of lastActivity.entries()) {
        if( date - lastseen > INACIVE_THRESHOLD_MS) {
            deleteDoc(docId)
            evicted++;
        }
    }

    if(evicted > 0) {
        console.log(`[docStore] evicted ${evicted} inactive doc(s)`);
    }
}, CLEANUP_INTERVAL);

// Prevent the interval from keeping the Node.js process alive after all
// other work is done (e.g. during graceful shutdown).
cleanupInterval.unref();
