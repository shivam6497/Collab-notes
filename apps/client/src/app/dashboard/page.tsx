"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FilePlus, FileText, Trash2, LogOut, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface Doc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearAuth, _hasHydrated } = useAuthStore();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchDocs() {
    try {
      const { data } = await api.get("/api/docs/my");
      setDocs(data.docs);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function createDoc() {
    setCreating(true);
    try {
      const { data } = await api.post("/api/docs");
      // Save doc to user account immediately
      await api.patch(`/api/docs/${data.response.id}/save`);
      router.push(`/doc/${data.response.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  async function deleteDoc(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/api/docs/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    clearAuth();
    router.push("/");
  }



  useEffect(() => {
  if (!_hasHydrated) return;
  if (!user) {
    router.push("/login");
    return;
  }
  fetchDocs();
}, [_hasHydrated, user]);

if (!_hasHydrated) {
  return (
    <main className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
    </main>
  );
}

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="font-medium text-sm tracking-tight">
            Collab Notes
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
            <p className="text-gray-600 text-sm mt-1">
              {docs.length} {docs.length === 1 ? "note" : "notes"}
            </p>
          </div>
          <button
            onClick={createDoc}
            disabled={creating}
            className="flex items-center gap-2 text-sm text-black bg-white font-medium px-4 py-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            {creating ? "Creating..." : "New note"}
          </button>
        </div>

        {/* Docs grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white/5 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-600 text-sm">No notes yet</p>
            <button
              onClick={createDoc}
              disabled={creating}
              className="text-sm text-black bg-white font-medium px-4 py-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="group relative bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] hover:border-white/20 transition-all cursor-pointer"
                onClick={() => router.push(`/doc/${doc.id}`)}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDoc(doc.id);
                  }}
                  disabled={deletingId === doc.id}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>

                {/* Title */}
                <h3 className="font-medium text-sm text-white mb-1 pr-6 truncate">
                  {doc.title}
                </h3>

                {/* Time */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  {timeAgo(doc.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
