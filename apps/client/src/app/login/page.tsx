"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Link2, Save, Users, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";

type Mode = "login" | "register";

function AuthPageInner() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const saveDocId = searchParams.get("save");

  async function handleSubmit() {
    setError("");
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const { data } = await api.post(endpoint, { email, password });
      setAuth(data.user);

      if (redirect && saveDocId) {
        try {
          await api.patch(`/api/docs/${saveDocId}/save`);
        } catch {}
        router.push(redirect);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Zap, text: "Real-time sync across all users" },
    { icon: Link2, text: "Shareable links — no signup to edit" },
    { icon: Save, text: "Save and manage your notes" },
    { icon: Users, text: "Live cursors with user names" },
  ];

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center px-8 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="font-medium text-sm tracking-tight">
            Collab Notes
          </span>
        </Link>
      </nav>

      {/* Body */}
      <div className="flex-1 grid lg:grid-cols-[1fr_auto_1fr]">
        {/* Left */}
        <div className="hidden lg:flex flex-col justify-center items-center px-8 py-14">
          <div className="max-w-xs w-full">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Write together.
            </h2>
            <h2 className="text-3xl font-bold tracking-tight text-gray-500 mb-6">
              Instantly.
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-10">
              Real-time collaborative notes powered by CRDTs. No conflicts, no
              friction.
            </p>

            <div className="space-y-5">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <span className="text-sm text-gray-500">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <div className="w-px h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </div>

        {/* Right */}
        <div className="flex items-center justify-center px-4 py-14">
          <div className="w-full max-w-sm">
            {/* Toggle */}
            <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mb-10">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                    mode === m
                      ? "bg-white text-black"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-gray-600 text-sm mb-8">
              {mode === "login"
                ? "Sign in to access your saved notes"
                : "Start saving and managing your notes"}
            </p>

            {/* Error */}
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="mb-8">
              <label className="block text-xs text-gray-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-white/30 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log in →"
                  : "Create account →"}
            </button>

            <p className="text-center text-gray-700 text-xs mt-6">
              By continuing you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  );
}
