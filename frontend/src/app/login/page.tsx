"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthCache } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail ?? "Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setAuthCache({ email: data.email });
      router.push("/");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-navy">Prelegal</h1>
        <p className="text-brand-gray mt-1 text-sm">
          AI-assisted legal document drafting
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setTab("signin"); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "signin"
                ? "text-brand-navy border-b-2 border-brand-blue"
                : "text-brand-gray hover:text-brand-navy"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "signup"
                ? "text-brand-navy border-b-2 border-brand-blue"
                : "text-brand-gray hover:text-brand-navy"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-brand-navy mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-brand-navy mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="••••••••"
              />
              {tab === "signup" && (
                <p className="text-xs text-brand-gray mt-1">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-purple text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 mt-2"
            >
              {loading
                ? tab === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : tab === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-xs text-brand-gray text-center max-w-sm">
        Documents generated by this platform are AI-assisted drafts and should be
        reviewed by a qualified attorney before use.
      </p>
    </div>
  );
}
