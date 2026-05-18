"use client";

import { useState } from "react";
import type { AuthUser } from "@/types";

interface Props {
  onAuth: (user: AuthUser) => void;
}

export function AuthGate({ onAuth }: Props) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sign in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suRole, setSuRole] = useState<"admin" | "business_developer">("business_developer");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); return; }
      onAuth(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suName, email: suEmail, password: suPassword, role: suRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      onAuth(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-white/5 bg-[#0d0f1e]/95 text-white">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-12 h-12 premium-gradient rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">B</div>
            <span className="text-2xl font-bold">Bitzsol <span className="text-[#03D9AF] font-black">CRM</span></span>
          </div>
          <p className="text-[#888d9f] text-xs mt-1">Lead Management Portal</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#131627] border border-[#1f233d] p-1 rounded-2xl mb-6">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                tab === t
                  ? t === "signin" ? "bg-[#0164DA] text-white" : "bg-[#FB66BC] text-white"
                  : "text-[#888d9f] hover:text-white"
              }`}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center mb-4">
            {error}
          </div>
        )}

        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131627] border border-[#1f233d] text-white focus:outline-none focus:border-[#0164DA] text-sm"
                placeholder="you@bitzsol.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131627] border border-[#1f233d] text-white focus:outline-none focus:border-[#0164DA] text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#0164DA] to-[#FB66BC] hover:opacity-90 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text" required value={suName} onChange={(e) => setSuName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131627] border border-[#1f233d] text-white focus:outline-none focus:border-[#FB66BC] text-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131627] border border-[#1f233d] text-white focus:outline-none focus:border-[#FB66BC] text-sm"
                placeholder="you@bitzsol.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password" required value={suPassword} onChange={(e) => setSuPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#131627] border border-[#1f233d] text-white focus:outline-none focus:border-[#FB66BC] text-sm"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#888d9f] uppercase tracking-wider mb-2">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSuRole("business_developer")}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${suRole === "business_developer" ? "bg-[#FB66BC]/10 border-[#FB66BC] text-[#FB66BC]" : "bg-[#131627] border-[#1f233d] text-[#888d9f]"}`}>
                  Business Dev
                </button>
                <button type="button" onClick={() => setSuRole("admin")}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${suRole === "admin" ? "bg-[#0164DA]/10 border-[#0164DA] text-[#0164DA]" : "bg-[#131627] border-[#1f233d] text-[#888d9f]"}`}>
                  Admin
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold bg-gradient-to-r from-[#FB66BC] to-[#0164DA] hover:opacity-90 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] text-[#888d9f] mt-6 border-t border-[#1f233d] pt-4">
          Sessions expire daily · © bitzsol.com
        </p>
      </div>
    </div>
  );
}
