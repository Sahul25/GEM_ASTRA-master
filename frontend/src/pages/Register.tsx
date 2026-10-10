import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [role, setRole]               = useState<"reviewer" | "admin">("reviewer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  // Live password strength check
  const checks = {
    length:  password.length >= 8,
    letter:  /[a-zA-Z]/.test(password),
    digit:   /\d/.test(password),
    match:   password !== "" && password === confirm,
  };
  const allPassing = Object.values(checks).every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!allPassing) {
      setError("Please satisfy all password requirements.");
      return;
    }

    setLoading(true);
    try {
      await register({ username: username.trim(), email: email.trim(), password, role });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gem-bg flex flex-col items-center justify-center px-4 py-10">
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
            <h2 className="text-sm font-semibold text-gem-text">Create an account</h2>
            <p className="text-xs text-gem-muted mt-0.5">Fill in the details below to register.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="block text-xs font-medium text-gem-text">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                autoFocus
                className="input"
                placeholder="e.g. john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <p className="text-[10px] text-gem-subtle">
                3–50 characters, letters, digits, hyphens, and underscores only.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-medium text-gem-text">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label htmlFor="reg-role" className="block text-xs font-medium text-gem-text">
                Role
              </label>
              <select
                id="reg-role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value as "reviewer" | "admin")}
                disabled={loading}
              >
                <option value="reviewer">Builder / Bidder</option>
                <option value="admin">Government Officer</option>
              </select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-xs font-medium text-gem-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
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

              {/* Strength checklist */}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirm" className="block text-xs font-medium text-gem-text">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
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
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Create account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gem-muted mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-gem-emerald hover:text-gem-emerald-hover font-medium transition-colors">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[10px] text-gem-subtle mt-6">
          GeM Astra v0.1 · Prototype · Authorised use only
        </p>
      </div>
    </div>
  );
}
