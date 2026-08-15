"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CreateDocResponse } from "@repo/types";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createDoc() {
    setLoading(true);
    try {
      const { data } = await api.post<{ response: CreateDocResponse }>("/api/docs");
      router.push(`/doc/${data.response.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="font-medium text-sm tracking-tight">Collab Notes</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="text-sm text-black bg-white font-medium px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero — two column */}
      <div className="flex-1 flex items-center px-8 py-16 gap-16 max-w-7xl mx-auto w-full">
        {/* Left */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6 inline-flex">
            <span className="text-xs text-gray-500 border border-white/10 rounded-full px-3 py-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              Powered by CRDTs — zero conflicts
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight mb-6">
            Collaborative notes<br />
            for teams and<br />
            solo writers
          </h1>

          <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
            Create a note, share the link. Anyone can join and edit in real-time — no account needed to start.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={createDoc}
              disabled={loading}
              className="text-sm text-black bg-white font-medium px-5 py-2.5 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create a note"}
            </button>
            <Link
              href="/login"
              className="text-sm text-white border border-white/20 px-5 py-2.5 rounded-full hover:bg-white/5 transition-colors"
            >
              Sign in →
            </Link>
          </div>

          {/* Features list */}
          <div className="mt-12 space-y-3">
            {[
              "Real-time sync — no conflicts, ever",
              "Live cursors with user names",
              "Save notes to your account",
              "Share with a link — no signup required",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right — mockup */}
        <div className="flex-1 hidden lg:block">
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-2xl">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0f0f0f]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 mx-3 bg-white/5 rounded px-3 h-5 flex items-center">
                <span className="text-[10px] text-gray-600">collabnotes.app/doc/abc123</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-bold">S</div>
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold">A</div>
                <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] font-bold">R</div>
                <span className="text-[10px] text-gray-600 ml-1.5">3 online</span>
              </div>
            </div>

            {/* Fake editor */}
            <div className="p-8">
              <div className="text-xl font-bold text-white mb-5">Q3 Planning Notes</div>
              <div className="space-y-2.5">
                <div className="h-2.5 bg-white/10 rounded-full w-4/5" />
                <div className="h-2.5 bg-white/10 rounded-full w-3/5" />
                <div className="h-2.5 bg-white/10 rounded-full w-full" />
                <div className="h-2.5 bg-white/5 rounded-full w-2/3 mt-5" />
                <div className="h-2.5 bg-white/5 rounded-full w-4/5" />
                <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
                {/* Fake cursor */}
                <div className="relative mt-3">
                  <div className="h-2.5 bg-white/5 rounded-full w-3/4" />
                  <div className="absolute left-3/4 top-0 flex flex-col items-start -translate-y-full pb-0.5">
                    <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap">User</span>
                    <div className="w-px h-3.5 bg-indigo-500 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-8 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-700">© 2025 Collab Notes</span>
        <div className="flex items-center gap-5 text-xs text-gray-700">
          <span>Yjs</span>
          <span>TipTap</span>
          <span>Socket.IO</span>
          <span>Redis</span>
          <span>PostgreSQL</span>
        </div>
      </div>
    </main>
  );
}