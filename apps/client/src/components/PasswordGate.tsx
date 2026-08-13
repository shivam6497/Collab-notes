"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  docId: string;
  onSuccess: () => void;
}

export default function PasswordGate({ docId, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!password) return;
    setError("");
    setLoading(true);
    try {
      await api.post(`/api/docs/${docId}/verify-password`, { password });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Incorrect password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[40%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Password required</h1>
          <p className="text-gray-600 text-sm mt-1">This document is password protected</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Enter password"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-white/30 transition-colors mb-4"
          autoFocus
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? "Verifying..." : "Access document →"}
        </button>
      </div>
    </div>
  );
}