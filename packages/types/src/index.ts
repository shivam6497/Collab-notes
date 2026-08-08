// Socket event payloads
export interface JoinDocPayload {
  docId: string;
  username: string;
  password?: string;
  token?: string;
}

export interface DocUpdatePayload {
  docId: string;
  update: ArrayBuffer;
}

export interface AwarenessUpdatePayload {
  docId: string;
  awareness: ArrayBuffer;
}

export interface DocStatePayload {
  update: ArrayBuffer;
}

export interface ErrorPayload {
  message: string;
}


export const SOCKET_EVENTS = {
  // client → server
  JOIN_DOC: "join_doc",
  DOC_UPDATE: "doc_update",
  AWARENESS_UPDATE: "awareness_update",

  // server → client
  DOC_STATE: "doc_state",
  DOC_UPDATE_BROADCAST: "doc_update",
  AWARENESS_BROADCAST: "awareness_update",
  ERROR: "error",
} as const;

// REST types
export interface CreateDocResponse {
  id: string;
  shareUrl: string;
}

export interface DocMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type ShareMode = "EDIT" | "VIEW" | "PASSWORD";

export interface ShareSettings {
  shareMode: ShareMode;
  password?: string;
}