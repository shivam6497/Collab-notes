"use client";

import { useState, useEffect } from "react";
import { X, Link, Eye, Lock, Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import type { ShareMode } from "@repo/types";

interface Props {
  docId: string;
  isOwner: boolean;
  onClose: () => void;
}

const MODES: {
  value: ShareMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "EDIT",
    label: "Anyone can edit",
    desc: "Anyone with the link can view and edit",
    icon: <Link className="w-4 h-4" />,
  },
  {
    value: "VIEW",
    label: "View only",
    desc: "Anyone with the link can only read",
    icon: <Eye className="w-4 h-4" />,
  },
  {
    value: "PASSWORD",
    label: "Password protected",
    desc: "Require a password to access",
    icon: <Lock className="w-4 h-4" />,
  },
];

export default function ShareModal({ docId, isOwner, onClose }: Props) {
  const [shareMode, setShareMode] = useState<ShareMode>("EDIT");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShareSettings() {
      try {
        const { data } = await api.get(`/api/docs/${docId}/share`);
        setShareMode(data.shareMode);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchShareSettings();
  }, [docId]);

  async function saveSettings() {
    if (shareMode === "PASSWORD" && !password) return;
    setSaving(true);
    try {
      await api.patch(`/api/docs/${docId}/share`, {
        shareMode,
        password: shareMode === "PASSWORD" ? password : undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Share document</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-xs text-gray-500 flex-1 truncate">
            {typeof window !== "undefined" ? window.location.href : ""}
          </span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs text-black bg-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-colors shrink-0"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Share mode — only owner can change */}
        {isOwner ? (
          <>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">
              Access
            </p>
            <div className="space-y-2 mb-4">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setShareMode(mode.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    shareMode === mode.value
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/5 bg-white/5 hover:bg-white/[0.07]"
                  }`}
                >
                  <div
                    className={`shrink-0 ${shareMode === mode.value ? "text-indigo-400" : "text-gray-600"}`}
                  >
                    {mode.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="text-xs text-gray-600">{mode.desc}</p>
                  </div>
                  {shareMode === mode.value && (
                    <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Password input */}
            {shareMode === "PASSWORD" && (
              <div className="mb-4">
                <label className="block text-xs text-gray-600 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            )}

            <button
              onClick={saveSettings}
              disabled={saving || (shareMode === "PASSWORD" && !password)}
              className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600 text-center py-2">
            Only the document owner can change access settings.
          </p>
        )}
      </div>
    </div>
  );
}
