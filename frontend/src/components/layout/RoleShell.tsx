/**
 * RoleShell — wraps the correct sidebar based on the logged-in user's role.
 * admin    → GovSidebar
 * reviewer → BidderSidebar
 */
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, UserCircle2 } from "lucide-react";
import { GovSidebar }    from "./GovSidebar";
import { BidderSidebar } from "./BidderSidebar";
import { useAuth }       from "../../contexts/AuthContext";

export function RoleShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-gem-bg">
      {isAdmin ? <GovSidebar /> : <BidderSidebar />}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-end gap-3 px-6 py-3 border-b border-gem-border bg-gem-card sticky top-0 z-10 shadow-card">
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gem-muted">
                <UserCircle2 size={14} className="shrink-0" />
                <span className="font-medium text-gem-text capitalize">{user.username}</span>
                <span className={`badge text-[10px] ${isAdmin ? "bg-blue-50 text-blue-700 border border-blue-200" : "badge-teal"}`}>
                  {isAdmin ? "Government" : "Bidder"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                           text-gem-muted hover:text-red-600 hover:bg-red-50
                           border border-transparent hover:border-red-200 transition-colors duration-150"
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
