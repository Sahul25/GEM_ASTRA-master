import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { govCreateTender } from "../../lib/api";

const DEPARTMENTS = [
  "Ministry of Defence", "Ministry of Health", "Ministry of Education",
  "Public Works Department", "Ministry of IT", "Railways",
  "Ministry of Finance", "Urban Development", "Agriculture",
  "Water Resources", "Other",
];

const CATEGORIES = [
  "IT Equipment", "Construction", "Vehicles", "Medical Supplies",
  "Furniture", "Stationery", "Software", "Services", "Infrastructure", "Other",
];

export function CreateTender() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    category: "",
    quantity: "",
    unit: "",
    budget_estimate: "",
    start_date: today,
    end_date: nextMonth,
  });

  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.department || !form.start_date || !form.end_date) {
      setError("Title, department, start date, and end date are required.");
      return;
    }
    if (form.end_date <= form.start_date) {
      setError("End date must be after start date.");
      return;
    }

    setLoading(true);
    try {
      await govCreateTender({
        title: form.title.trim(),
        description: form.description.trim(),
        department: form.department,
        category: form.category,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit.trim(),
        budget_estimate: parseFloat(form.budget_estimate) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      setSuccess(true);
      setTimeout(() => navigate("/gov/tenders"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tender.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <div>
        <h2 className="text-base font-semibold text-gem-text">Post a New Tender</h2>
        <p className="text-xs text-gem-muted mt-1">
          Fill in the procurement details. Once published, registered builders can submit bids.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={14} className="text-gem-emerald" />
          <p className="text-xs text-gem-emerald-text font-medium">
            Tender created successfully! Redirecting…
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card space-y-5">

        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gem-text">
            Tender Title <span className="text-red-500">*</span>
          </label>
          <input className="input" placeholder="e.g. Supply of 500 Desktop Computers"
            value={form.title} onChange={e => set("title", e.target.value)} disabled={loading} />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gem-text">Description</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Specifications, delivery conditions, technical requirements…"
            value={form.description} onChange={e => set("description", e.target.value)}
            disabled={loading} />
        </div>

        {/* Department + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">
              Department <span className="text-red-500">*</span>
            </label>
            <select className="select" value={form.department}
              onChange={e => set("department", e.target.value)} disabled={loading}>
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">Category</label>
            <select className="select" value={form.category}
              onChange={e => set("category", e.target.value)} disabled={loading}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">Quantity</label>
            <input className="input" type="number" min="0" placeholder="e.g. 500"
              value={form.quantity} onChange={e => set("quantity", e.target.value)}
              disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">Unit</label>
            <input className="input" placeholder="e.g. units, kg, metres"
              value={form.unit} onChange={e => set("unit", e.target.value)}
              disabled={loading} />
          </div>
        </div>

        {/* Budget estimate */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gem-text">Budget Estimate (₹)</label>
          <input className="input" type="number" min="0" placeholder="e.g. 2500000"
            value={form.budget_estimate} onChange={e => set("budget_estimate", e.target.value)}
            disabled={loading} />
          <p className="text-[10px] text-gem-subtle">
            Approximate upper limit. Bidders will see this as a reference.
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input className="input" type="date" value={form.start_date}
              onChange={e => set("start_date", e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gem-text">
              Bid Deadline <span className="text-red-500">*</span>
            </label>
            <input className="input" type="date" value={form.end_date}
              onChange={e => set("end_date", e.target.value)} disabled={loading} />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Publishing…</>
            ) : (
              <><PlusCircle size={14} />Publish Tender</>
            )}
          </button>
          <button type="button" onClick={() => navigate("/gov/tenders")}
            className="px-4 py-2 rounded-lg border border-gem-border text-sm text-gem-muted hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
