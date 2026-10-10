import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RoleShell } from "./components/layout/RoleShell";

// Auth pages
import { Login }          from "./pages/Login";
import { Register }       from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword }  from "./pages/ResetPassword";

// Government pages (admin role)
import { GovDashboard }    from "./pages/gov/GovDashboard";
import { GovTenderList }   from "./pages/gov/GovTenderList";
import { GovTenderDetail } from "./pages/gov/GovTenderDetail";
import { CreateTender }    from "./pages/gov/CreateTender";
import { GovBidAnalytics } from "./pages/gov/GovBidAnalytics";
import { GovRiskAnalysis }  from "./pages/gov/GovRiskAnalysis";
import { GovBidderNetwork } from "./pages/gov/GovBidderNetwork";

// Bidder pages (reviewer role)
import { BidderDashboard } from "./pages/bidder/BidderDashboard";
import { OpenTenders }     from "./pages/bidder/OpenTenders";
import { MyBids }          from "./pages/bidder/MyBids";

// Shared
import { About }     from "./pages/About";
import { RoleHome }  from "./pages/RoleHome";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public ── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />

          {/* ── Root: redirect to correct dashboard by role ── */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<RoleHome />} />
          </Route>

          {/* ── Government dashboard (admin only) ── */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<RoleShell />}>
              <Route path="/gov"                  element={<GovDashboard />} />
              <Route path="/gov/tenders"          element={<GovTenderList />} />
              <Route path="/gov/tenders/new"      element={<CreateTender />} />
              <Route path="/gov/tenders/:id"      element={<GovTenderDetail />} />
              <Route path="/gov/bids"             element={<GovBidAnalytics />} />
              <Route path="/gov/risk"             element={<GovRiskAnalysis />} />
              <Route path="/gov/network"          element={<GovBidderNetwork />} />
              <Route path="/gov/about"            element={<About />} />
            </Route>
          </Route>

          {/* ── Bidder dashboard (reviewer only) ── */}
          <Route element={<ProtectedRoute role="reviewer" />}>
            <Route element={<RoleShell />}>
              <Route path="/bidder"              element={<BidderDashboard />} />
              <Route path="/bidder/tenders"      element={<OpenTenders />} />
              <Route path="/bidder/my-bids"      element={<MyBids />} />
              <Route path="/bidder/about"        element={<About />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
