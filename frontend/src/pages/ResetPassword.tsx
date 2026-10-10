import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { apiResetPassword } from "../lib/api";

export function ResetPassword() {
  const navigate = useNavigate();

  const [token, setToken]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const checks = {
    length:  password.length >= 8,
    letter:  /[a-zA-Z]/.test(password),
    digit:   /\d/.test(password),
    match:   password !== "" && password === confirm,
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token.trim() || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!Object.values(checks).every(Boolean)) {
      setError("Please satisfy all password requirements.");
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(token.trim(), password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
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
            <h2 className="text-sm font-semibold text-gem-text">Set a new password</h2>
            <p className="text-xs text-gem-muted mt-0.5">
              Paste your reset token and choose a new password.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={14} className="text-gem-emerald shrink-0 mt-0.5" />
                <p className="text-xs text-gem-emerald-text">
                  Password updated successfully. You can now sign in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Go to Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Token */}
              <div className="space-y-1.5">
                <label htmlFor="rp-token" className="block text-xs font-medium text-gem-text">
                  Reset token
                </label>
                <div className="relative">
                  <input
                    id="rp-token"
                    type="text"
                    autoFocus
                    className="input pl-9 font-mono text-[12px]"
                    placeholder="Paste your token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={loading}
                  />
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gem-subtle pointer-events-none" />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="rp-password" className="block text-xs font-medium text-gem-text">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="rp-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gem-muted hover:text-gem-text transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {password && (
                  <ul className="mt-2 space-y-1">
                    {[
                      { ok: checks.length, text: "At least 8 characters" },
                      { ok: checks.letter, text: "Contains a letter" },
                      { ok: checks.digit,  text: "Contains a number" },
                    ].map(({ ok, text }) => (
                      <li key={text} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-gem-emerald" : "text-gem-subtle"}`}>
                        <CheckCircle2 size={11} className={ok ? "text-gem-emerald" : "text-gem-subtle"} />
                        {text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <label htmlFor="rp-confirm" className="block text-xs font-medium text-gem-text">
                  Confirm new password
                </label>
                <input
                  id="rp-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`input ${confirm && !checks.match ? "border-red-300 focus:ring-red-400" : ""}`}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
                {confirm && !checks.match && (
                  <p className="text-[11px] text-red-500">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Updating password…
                  </>
                ) : (
                  "Update password"
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
