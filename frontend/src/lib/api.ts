const BASE = "https://gem-astra-backend.onrender.com/api";

// --------------------------------------------------------------------------
// Types matching the backend Pydantic models exactly
// --------------------------------------------------------------------------

export interface TenderRecord {
  tender_id: string;
  item_name: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  quantity: number | null;
  official_url: string | null;
  source_type: string;
  source_document: string | null;
  created_at: string | null;
}

export interface TenderListResponse {
  items: TenderRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface FilterOptions {
  departments: string[];
  statuses: string[];
  source_types: string[];
}

export interface ImportResult {
  inserted: number;
  skipped_duplicate: number;
  rejected: number;
  errors: string[];
}

export interface TenderListParams {
  search?: string;
  department?: string;
  status?: string;
  source_type?: string;
  page?: number;
  page_size?: number;
}

// --------------------------------------------------------------------------
// Auth types
// --------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token: string;
}

// --------------------------------------------------------------------------
// Token storage
// --------------------------------------------------------------------------

const TOKEN_KEY = "gem_astra_token";
const USER_KEY  = "gem_astra_user";

export function saveSession(token: string, user: AuthUser): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// --------------------------------------------------------------------------
// Auth endpoints
// --------------------------------------------------------------------------

export async function apiRegister(payload: RegisterPayload): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(username: string, password: string): Promise<TokenResponse> {
  // OAuth2PasswordRequestForm expects form-encoded body
  const form = new URLSearchParams({ username, password });
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

export async function apiGetMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export async function apiForgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function apiResetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
}

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  return apiFetch("/health");
}

// --------------------------------------------------------------------------
// Tenders
// --------------------------------------------------------------------------

export async function fetchTenders(params: TenderListParams = {}): Promise<TenderListResponse> {
  const qs = new URLSearchParams();
  if (params.search)      qs.set("search", params.search);
  if (params.department)  qs.set("department", params.department);
  if (params.status)      qs.set("status", params.status);
  if (params.source_type) qs.set("source_type", params.source_type);
  if (params.page)        qs.set("page", String(params.page));
  if (params.page_size)   qs.set("page_size", String(params.page_size));
  const q = qs.toString();
  return apiFetch(`/tenders${q ? "?" + q : ""}`);
}

export async function fetchTenderCount(): Promise<number> {
  const res = await fetchTenders({ page: 1, page_size: 1 });
  return res.total;
}

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------

export interface SummaryData {
  tender_count: number;
  tender_source: string;
  bid_record_count: number | null;
  unique_bidder_count: number | null;
  bid_source: string;
  bid_source_label: string;
  active_findings_count: number | null;
  findings_source: string;
  findings_source_label: string;
}

export async function fetchSummary(): Promise<SummaryData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    return await apiFetch("/summary", { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTenderById(tenderId: string): Promise<TenderRecord> {
  return apiFetch(`/tenders/${encodeURIComponent(tenderId)}`);
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  return apiFetch("/tenders/filters");
}

// --------------------------------------------------------------------------
// Bidder Network
// --------------------------------------------------------------------------

export interface BidderNode {
  bidder_id: string;
  tender_count: number;
  source_type: string;
}

export interface BidderEdge {
  bidder_a: string;
  bidder_b: string;
  shared_tender_count: number;
  shared_tender_ids: string[];
  source_type: string;
}

export interface NetworkData {
  nodes: BidderNode[];
  edges: BidderEdge[];
  source_label: string;
  disclaimer: string;
  total_bidders: number;
  total_edges: number;
}

export async function fetchNetwork(): Promise<NetworkData> {
  return apiFetch("/network");
}

export async function importTendersCsv(
  file: File,
  sourceTypeOverride?: string,
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const qs = sourceTypeOverride ? `?source_type_override=${encodeURIComponent(sourceTypeOverride)}` : "";
  return apiFetch(`/tenders/import${qs}`, { method: "POST", body: form });
}

// --------------------------------------------------------------------------
// Government / Bidder types
// --------------------------------------------------------------------------

export interface GovTender {
  id: number;
  title: string;
  description: string;
  department: string;
  category: string;
  quantity: number;
  unit: string;
  budget_estimate: number;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "awarded" | "cancelled";
  created_by: number;
  created_at: string;
  bid_count: number;
}

export interface Bid {
  id: number;
  tender_id: number;
  bidder_id: number;
  amount: number;
  note: string;
  status: string;
  submitted_at: string;
  username?: string;
  email?: string;
  tender_title?: string;
  department?: string;
  tender_status?: string;
  budget_estimate?: number;
}

export interface GovStats {
  total_tenders: number;
  open_tenders: number;
  closed_tenders: number;
  awarded_tenders: number;
  total_bids: number;
  total_bidders: number;
}

export interface CreateTenderPayload {
  title: string;
  description: string;
  department: string;
  category: string;
  quantity: number;
  unit: string;
  budget_estimate: number;
  start_date: string;
  end_date: string;
}

// --------------------------------------------------------------------------
// Government API
// --------------------------------------------------------------------------

export async function govCreateTender(payload: CreateTenderPayload): Promise<GovTender> {
  return apiFetch<GovTender>("/gov/tenders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function govListTenders(params: {
  status?: string; department?: string; search?: string;
} = {}): Promise<GovTender[]> {
  const qs = new URLSearchParams();
  if (params.status)     qs.set("status", params.status);
  if (params.department) qs.set("department", params.department);
  if (params.search)     qs.set("search", params.search);
  const q = qs.toString();
  return apiFetch<GovTender[]>(`/gov/tenders${q ? "?" + q : ""}`);
}

export async function govGetTender(id: number): Promise<GovTender> {
  return apiFetch<GovTender>(`/gov/tenders/${id}`);
}

export async function govUpdateStatus(id: number, status: string): Promise<GovTender> {
  return apiFetch<GovTender>(`/gov/tenders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function govGetBids(tenderId: number): Promise<Bid[]> {
  return apiFetch<Bid[]>(`/gov/tenders/${tenderId}/bids`);
}

export async function govGetStats(): Promise<GovStats> {
  return apiFetch<GovStats>("/gov/stats");
}

// --------------------------------------------------------------------------
// Bidder API
// --------------------------------------------------------------------------

export async function bidderListOpenTenders(params: {
  search?: string; department?: string;
} = {}): Promise<GovTender[]> {
  const qs = new URLSearchParams();
  if (params.search)     qs.set("search", params.search);
  if (params.department) qs.set("department", params.department);
  const q = qs.toString();
  return apiFetch<GovTender[]>(`/gov/open-tenders${q ? "?" + q : ""}`);
}

export async function bidderSubmitBid(tenderId: number, amount: number, note = ""): Promise<Bid> {
  return apiFetch<Bid>(`/gov/tenders/${tenderId}/bid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, note }),
  });
}

export async function bidderMyBids(): Promise<Bid[]> {
  return apiFetch<Bid[]>("/gov/my-bids");
}

// --------------------------------------------------------------------------
// Risk Analysis
// --------------------------------------------------------------------------

export interface RiskFinding {
  rule: string;
  rule_name: string;
  tender_ids: string[];
  bidder_ids: string[];
  evidence: Record<string, unknown>;
  threshold_or_criterion: string;
  explanation: string;
  source_type: string;
  data_limitations: string;
  insufficient_data: boolean;
}

export interface RiskResult {
  score: number;
  score_band: "Low" | "Moderate" | "Elevated" | "High";
  score_explanation: string;
  source_type: string;
  real_data_available: boolean;
  total_bids_analysed: number;
  total_tenders_analysed: number;
  findings: RiskFinding[];
  warnings: string[];
  config_weights: {
    rule_a_price_similarity: string;
    rule_b_co_participation: string;
    rule_c_winner_rotation: string;
    note: string;
  };
  error?: string;
}

export async function govGetRiskAnalysis(): Promise<RiskResult> {
  return apiFetch<RiskResult>("/gov/risk-analysis");
}

// --------------------------------------------------------------------------
// Bidder Network (gov bids)
// --------------------------------------------------------------------------

export interface NetworkNode {
  bidder_id: string;
  tender_count: number;
}

export interface NetworkEdge {
  bidder_a: string;
  bidder_b: string;
  shared_tender_count: number;
  shared_tenders: { tender_id: number; tender_title: string }[];
}

export interface GovNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  disclaimer: string;
  total_bidders: number;
  total_edges: number;
  error?: string;
}

export async function govGetBidderNetwork(): Promise<GovNetworkData> {
  return apiFetch<GovNetworkData>("/gov/bidder-network");
}
