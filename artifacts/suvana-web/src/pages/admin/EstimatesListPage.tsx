import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  PlusCircle,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";

const apiBase = import.meta.env.VITE_API_URL || "";

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  return fetch(`${apiBase}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

interface EstimateListItem {
  id: string;
  title: string;
  customerName: string;
  customerEmail?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "declined";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  reviewing: "bg-yellow-50 text-yellow-700",
  ready_to_send: "bg-blue-50 text-blue-700",
  sent: "bg-indigo-50 text-indigo-700",
  viewed: "bg-purple-50 text-purple-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  revision_requested: "bg-orange-50 text-orange-700",
  expired: "bg-muted text-muted-foreground",
  converted_to_project: "bg-green-100 text-green-800",
};

const STATUS_FILTER_MAP: Record<StatusFilter, string | undefined> = {
  all: undefined,
  draft: "draft",
  sent: "sent",
  accepted: "accepted",
  declined: "declined",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── New Estimate Modal ───────────────────────────────────────────────────────

interface NewEstimateModalProps {
  onClose: () => void;
  onCreate: (id: string) => void;
}

function NewEstimateModal({ onClose, onCreate }: NewEstimateModalProps) {
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || !customerName.trim()) {
      setError("Title and customer name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/estimates", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          status: "draft",
          taxRate: 0,
          markupPct: 20,
          depositPct: 30,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create.");
        return;
      }
      const data = await res.json();
      onCreate(data.id);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md bg-background rounded-sm border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">New Estimate</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Estimate Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Kitchen Remodel — Johnson Residence"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Customer Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Customer Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Customer Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 bg-foreground text-background text-sm font-semibold py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create & Open Builder"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── EstimatesListPage ────────────────────────────────────────────────────────

export default function EstimatesListPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (STATUS_FILTER_MAP[statusFilter]) queryParams.set("status", STATUS_FILTER_MAP[statusFilter]!);

  const { data, isLoading } = useQuery<{ items: EstimateListItem[]; total: number }>({
    queryKey: ["/api/admin/estimates", statusFilter, page],
    queryFn: async () => {
      const res = await adminFetch(`/admin/estimates?${queryParams}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "sent", label: "Sent" },
    { id: "accepted", label: "Accepted" },
    { id: "declined", label: "Declined" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build and send quotes to customers</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Estimate
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {STATUS_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setStatusFilter(id); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading estimates…</div>
      ) : !data?.items.length ? (
        <div className="py-24 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No estimates yet.</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> Create your first estimate
          </button>
        </div>
      ) : (
        <motion.div
          className="bg-background rounded-sm border border-border overflow-hidden"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((e) => (
                  <motion.tr
                    key={e.id}
                    variants={fadeUp}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/estimates/${e.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{e.title}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground">{e.customerName}</p>
                      <p className="text-xs text-muted-foreground">{e.customerEmail || "No email provided"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"}`}>
                        {e.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {new Date(e.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > limit && (
            <div className="border-t border-border px-5 py-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total} estimates</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-foreground font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showNewModal && (
          <NewEstimateModal
            onClose={() => setShowNewModal(false)}
            onCreate={(id) => {
              setShowNewModal(false);
              qc.invalidateQueries({ queryKey: ["/api/admin/estimates"] });
              navigate(`/admin/estimates/${id}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
