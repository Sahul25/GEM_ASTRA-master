import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiForgotPassword } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiForgotPassword(email.trim());
      // Backend always returns 200; show token only when one was actually generated
      setToken(res.reset_token || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gem-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gem-emerald-soft border border-emerald-200">
            <ShieldAlert size={22} className="text-gem-emerald" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gem-text tracking-tight">GeM Astra</h1>
            <p className="text-xs text-gem-muted mt-0.5 uppercase tracking-widest">
              Procurement Intelligence Platform
            </p>
          </div>
        </div>

        <div className="card space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gem-text">Reset your password</h2>
            <p className="text-xs text-gem-muted mt-0.5">
              Enter your account email and we'll generate a reset token.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {token !== null ? (
            /* ── Success state ── */
            <div className="space-y-4">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={14} className="text-gem-emerald shrink-0 mt-0.5" />
                <p className="text-xs text-gem-emerald-text">
                  If an account with that email exists, a reset token has been generated.
                </p>
              </div>

              {token && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gem-text">Your reset token:</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-gem-border">
                    <code className="text-[11px] text-gem-text font-mono break-all flex-1">{token}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(token)}
                      className="shrink-0 text-[10px] font-medium text-gem-emerald hover:text-gem-emerald-hover transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-gem-subtle">
                    Valid for 1 hour · single use. Paste it on the reset page.
                  </p>
                </div>
              )}

              <Link
                to="/reset-password"
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Go to Reset Password
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="fp-email" className="block text-xs font-medium text-gem-text">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="input pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gem-subtle pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send reset token"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gem-muted mt-4">
          <Link to="/login" className="inline-flex items-center gap-1 text-gem-emerald hover:text-gem-emerald-hover font-medium transition-colors">
            <ArrowLeft size={11} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
