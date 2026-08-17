"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { SlashExtension } from "@/lib/slashExtension";
import "tippy.js/dist/tippy.css";
import ShareModal from "@/components/ShareModal";
import PasswordGate from "@/components/PasswordGate";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@repo/types";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Save,
  Copy,
  Check,
  Users,
  SpellCheck,
  Eye,
} from "lucide-react";

interface Props {
  docId: string;
}

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#84cc16", // lime
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomUsername() {
  return "User" + Math.floor(Math.random() * 9000 + 1000);
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-white/10" />;
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        // Prevent the editor from losing focus when a toolbar button is clicked.
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-white/15 text-white"
          : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export default function Editor({ docId }: Props) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const awarenessRef = useRef<Awareness>(new Awareness(ydocRef.current));
  const usernameRef = useRef<string>(randomUsername());
  const colorRef = useRef<string>(randomColor());
  const passwordRef = useRef<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState("Untitled");
  const [, forceUpdate] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({
        document: ydocRef.current,
      }),
      CollaborationCaret.configure({
        provider: { awareness: awarenessRef.current },
        user: {
          name: usernameRef.current,
          color: colorRef.current,
        },
      }),
      SlashExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[65vh] text-gray-200 leading-relaxed text-[15px]",
        spellcheck: "false",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    async function fetchTitle() {
      try {
        const res = await api.get(`/api/docs/${docId}`);
        if (res.data?.title) {
          setTitle(res.data.title);
        }
      } catch (err) {
        console.error("Failed to fetch document title:", err);
      }
    }
    fetchTitle();
  }, [docId]);

  // ── Access check: runs BEFORE socket connects ──
  useEffect(() => {
    async function checkAccess() {
      try {
        const [shareRes, docRes] = await Promise.all([
          api.get(`/api/docs/${docId}/share`),
          api.get(`/api/docs/${docId}`),
        ]);

        const shareMode = shareRes.data.shareMode;
        const docUserId = docRes.data.userId;
        const ownerCheck = user?.id === docUserId;

        setIsOwner(ownerCheck);

        if (docUserId && !ownerCheck) {
          setCanSave(false);
        }

        if (shareMode === "PASSWORD" && !ownerCheck) {
          setRequiresPassword(true);
          setAccessChecked(true);
          return;
        }

        // Access granted (EDIT, VIEW, or owner of PASSWORD doc)
        setAccessGranted(true);
        setAccessChecked(true);

        if (shareMode === "VIEW" && !ownerCheck) {
          editor?.setEditable(false);
          setIsReadOnly(true);
        } else {
          editor?.setEditable(true);
          setIsReadOnly(false);
        }
      } catch (err) {
        console.error(err);
        // If access check fails, still allow (public doc fallback)
        setAccessGranted(true);
        setAccessChecked(true);
      }
    }

    checkAccess();
  }, [docId, user]);

  // ── Socket: only connects AFTER access is granted ──
  useEffect(() => {
    if (!accessGranted) return;

    const socket = getSocket();
    const ydoc = ydocRef.current;
    const awareness = awarenessRef.current;

    const syncUserCount = () => {
      setActiveUsers(awareness.getStates().size);
    };

    const onAwarenessChange = (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      syncUserCount();
      if (origin === "remote") return;
      const changedClients = added.concat(updated).concat(removed);
      if (changedClients.length === 0) return;
      const update = encodeAwarenessUpdate(awareness, changedClients);
      socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, { docId, awareness: update });
    };
    awareness.on("change", onAwarenessChange);

    awareness.setLocalStateField("user", {
      name: usernameRef.current,
      color: colorRef.current,
    });

    syncUserCount();

    const onConnect = () => {
      setConnected(true);

      socket.emit(SOCKET_EVENTS.JOIN_DOC, {
        docId,
        username: usernameRef.current,
        password: passwordRef.current ?? undefined,
        token: document.cookie
          .split("; ")
          .find((row) => row.startsWith("accessToken="))
          ?.split("=")[1],
      });
      awareness.setLocalStateField("socketId", socket.id);
      awareness.setLocalStateField("user", {
        name: usernameRef.current,
        color: colorRef.current,
      });

      const update = encodeAwarenessUpdate(awareness, [awareness.clientID]);
      socket.emit(SOCKET_EVENTS.AWARENESS_UPDATE, { docId, awareness: update });
    };

    const onDisconnect = () => setConnected(false);

    const onDocState = ({ update }: { update: ArrayBuffer }) => {
      Y.applyUpdate(ydoc, new Uint8Array(update), "remote");
    };

    const onDocUpdateBroadcast = ({ update }: { update: ArrayBuffer }) => {
      Y.applyUpdate(ydoc, new Uint8Array(update), "remote");
    };

    const onAwarenessBroadcast = ({
      awareness: awarenessUpdate,
    }: {
      awareness: ArrayBuffer;
    }) => {
      applyAwarenessUpdate(
        awareness,
        new Uint8Array(awarenessUpdate),
        "remote",
      );
      syncUserCount();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET_EVENTS.DOC_STATE, onDocState);
    socket.on(SOCKET_EVENTS.DOC_UPDATE_BROADCAST, onDocUpdateBroadcast);
    socket.on(SOCKET_EVENTS.AWARENESS_BROADCAST, onAwarenessBroadcast);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      socket.emit(SOCKET_EVENTS.DOC_UPDATE, { docId, update });
    };
    ydoc.on("update", onDocUpdate);

    socket.connect();

    const onBeforeUnload = () => {
      socket.emit("leave_doc", { docId });
      awareness.setLocalState(null);
      socket.disconnect();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      ydoc.off("update", onDocUpdate);
      awareness.off("change", onAwarenessChange);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.DOC_STATE, onDocState);
      socket.off(SOCKET_EVENTS.DOC_UPDATE_BROADCAST, onDocUpdateBroadcast);
      socket.off(SOCKET_EVENTS.AWARENESS_BROADCAST, onAwarenessBroadcast);
      socket.emit("leave_doc", { docId });
      awareness.setLocalState(null);
      socket.disconnect();
    };
  }, [docId, accessGranted]);

  async function saveDoc() {
    if (!user) {
      router.push(`/login?redirect=/doc/${docId}&save=${docId}`);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/docs/${docId}/save`);
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveTitle(newTitle: string) {
    if (!user || !newTitle.trim()) return;
    try {
      await api.patch(`/api/docs/${docId}/title`, { title: newTitle });
    } catch (err) {
      console.error(err);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => saveTitle(val), 1000);
  }

  if (requiresPassword && !accessGranted) {
    return (
      <PasswordGate
        docId={docId}
        onSuccess={(pwd) => {
          passwordRef.current = pwd;
          setAccessGranted(true);
          setRequiresPassword(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Ambient background glow — decorative only */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[40%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <nav className="sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-white/5 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 19h20L12 2z" />
            </svg>
          </a>
          {user && (
            <a
              href="/dashboard"
              className="text-xs text-gray-600 hover:text-gray-300 transition-colors border-r border-white/10 pr-2"
            >
              Dashboard
            </a>
          )}
          <input
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-white/20 hover:border-white/40 focus:border-white/60 transition-colors w-24 sm:w-40 truncate pb-0.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>{activeUsers}</span>
          </div>

          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? "bg-green-400" : "bg-red-500"}`}
            title={connected ? "Connected" : "Disconnected"}
          />

          {canSave && (
            <>
              {!saved ? (
                <button
                  onClick={saveDoc}
                  disabled={saving}
                  className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {saving ? "Saving..." : user ? "Save" : "Sign in to save"}
                </button>
              ) : (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
            </>
          )}

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-xs text-black bg-white font-medium px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </nav>

      {!isReadOnly && (
        <div className="sticky top-[49px] z-40 flex items-center flex-wrap gap-1 px-3 sm:px-6 py-2 border-b border-white/5 bg-black/60 backdrop-blur-md">
          <div className="sticky top-[49px] z-40 flex items-center flex-wrap gap-1 px-3 sm:px-6 py-2 border-b border-white/5 bg-black/60 backdrop-blur-md">
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Code"
            >
              <Code className="w-3.5 h-3.5" />
            </ToolbarBtn>

            <ToolbarDivider />

            <ToolbarBtn
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarBtn>

            <ToolbarDivider />

            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Ordered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarBtn>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
          <Eye className="w-3.5 h-3.5" />
          This document is view only
        </div>
      )}

      <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-8 py-6 sm:py-10">
        <div className="relative rounded-2xl">
          {/* Gradient glow edges — simulates a soft border without a solid outline */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-1/2 bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-1/2 bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />

          <div className="border border-white/5 rounded-2xl p-8 bg-white/[0.02]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          docId={docId}
          isOwner={isOwner}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

