import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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

        {/* Card */}
        <div className="card space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gem-text">Sign in to your account</h2>
            <p className="text-xs text-gem-muted mt-0.5">Authorised reviewers only. All access is logged.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-medium text-gem-text">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                className="input"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-gem-text">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-gem-emerald hover:text-gem-emerald-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-gem-muted mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-gem-emerald hover:text-gem-emerald-hover font-medium transition-colors">
            Create one
          </Link>
        </p>

        <p className="text-center text-[10px] text-gem-subtle mt-6">
          GeM Astra v0.1 · Prototype · Authorised use only
        </p>
      </div>
    </div>
  );
}
