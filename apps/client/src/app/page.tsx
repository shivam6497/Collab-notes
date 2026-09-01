"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { CreateDocResponse } from "@repo/types";

/* ── Animation Variants ── */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
} as const;

const featureVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
} as const;

const mockupVariants = {
  hidden: { opacity: 0, scale: 0.92, rotateY: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.4 },
  },
} as const;

const navVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} as const;

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

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

  /* ── 3D Tilt Handler ── */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = tiltRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = tiltRef.current;
    if (!card) return;
    card.style.transform = "rotateX(0deg) rotateY(0deg)";
  }, []);

  const features = [
    "Real-time sync — no conflicts, ever",
    "Live cursors with user names",
    "Save notes to your account",
    "Share with a link — no signup required",
  ];

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col relative overflow-hidden">
      {/* Floating glow orbs */}
      <div className="glow-orb glow-orb-1" aria-hidden="true" />
      <div className="glow-orb glow-orb-2" aria-hidden="true" />
      <div className="glow-orb glow-orb-3" aria-hidden="true" />

      {/* Navbar */}
      <motion.header
        variants={navVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        <nav
          className="flex items-center justify-between px-8 py-4 border-b border-white/5"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center gap-1.5" aria-label="Collab Notes Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 3h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5"/>
              <path d="M14 3v4a1 1 0 001 1h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="12" x2="15" y2="12" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round"/>
              <line x1="8" y1="15" x2="13" y2="15" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" strokeLinecap="round"/>
              <circle cx="17" cy="18" r="2.5" fill="#818cf8"/>
            </svg>
            <span className="font-medium text-sm tracking-tight">Collab Notes</span>
          </Link>
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
      </motion.header>

      {/* Hero — two column */}
      <section className="flex-1 flex items-center px-8 py-16 gap-16 max-w-7xl mx-auto w-full relative z-10">
        {/* Left */}
        <motion.div
          className="flex-1 flex flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="mb-6 inline-flex">
            <span className="text-xs text-gray-500 border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 backdrop-blur-sm bg-white/[0.02]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block pulse-dot" />
              Powered by CRDTs — zero conflicts
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl font-bold leading-[1.05] tracking-tight mb-6"
          >
            Collaborative notes
            <br />
            for teams and
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
              solo writers
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs"
          >
            Create a note, share the link. Anyone can join and edit in real-time
            — no account needed to start.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <button
              id="create-note-btn"
              onClick={createDoc}
              disabled={loading}
              className="btn-glow text-sm text-black bg-white font-medium px-5 py-2.5 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create a note"}
            </button>
            <Link
              href="/login"
              className="text-sm text-white border border-white/20 px-5 py-2.5 rounded-full hover:bg-white/5 transition-colors"
            >
              Sign in →
            </Link>
          </motion.div>

          {/* Features list */}
          <motion.div
            className="mt-12 space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            transition={{ delayChildren: 0.8, staggerChildren: 0.1 }}
          >
            {features.map((f) => (
              <motion.div
                key={f}
                variants={featureVariants}
                className="flex items-center gap-3 text-sm text-gray-500"
              >
                <svg
                  className="w-3.5 h-3.5 text-indigo-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {f}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — 3D tilt mockup */}
        <motion.div
          className="flex-1 hidden lg:block tilt-card"
          variants={mockupVariants}
          initial="hidden"
          animate="visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="animated-border">
            <div ref={tiltRef} className="tilt-card-inner rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-2xl">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0f0f0f]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 mx-3 bg-white/5 rounded px-3 h-5 flex items-center">
                  <span className="text-[10px] text-gray-600">
                    collabnotes.app/doc/abc123
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-bold">
                    S
                  </div>
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold">
                    A
                  </div>
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] font-bold">
                    R
                  </div>
                  <span className="text-[10px] text-gray-600 ml-1.5">
                    3 online
                  </span>
                </div>
              </div>

              {/* Fake editor */}
              <div className="p-8">
                <div className="text-xl font-bold text-white mb-5">
                  Q3 Planning Notes
                </div>
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
                      <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                        User
                      </span>
                      <div className="w-px h-3.5 bg-indigo-500 ml-1 cursor-blink" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-700">© 2025 Collab Notes</span>
        <div className="flex items-center gap-5 text-xs text-gray-700">
          <span>Yjs</span>
          <span>TipTap</span>
          <span>Socket.IO</span>
          <span>Redis</span>
          <span>PostgreSQL</span>
        </div>
      </footer>
    </main>
  );
}