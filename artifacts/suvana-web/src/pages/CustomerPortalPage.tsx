import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  MessageSquare,
  AlertCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const apiBase = import.meta.env.VITE_API_URL || "";

interface PortalData {
  tokenId: string;
  estimateId: string;
  versionId: string;
  versionNumber: number;
  expiresAt: string;
  snapshot: SnapshotData;
  estimateStatus: string;
  acceptedAt: string | null;
}

interface SnapshotData {
  estimate?: {
    title?: string;
    customerName?: string;
    customerEmail?: string;
    taxRate?: number;
    markupPct?: number;
    depositPct?: number;
    discountAmount?: number | null;
    validUntil?: string | null;
    description?: string | null;
  };
  sections?: SnapshotSection[];
  items?: SnapshotItem[];
  totals?: {
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    grandTotal?: number;
    depositAmount?: number;
  };
}

interface SnapshotSection {
  id: string;
  title: string;
  position: number;
}

interface SnapshotItem {
  id: string;
  sectionId: string;
  description: string;
  qty: number;
  unit: string;
  isOptional: boolean;
  isVisibleToCustomer: boolean;
  lineTotal?: number;
  position: number;
}

type PortalState = "idle" | "accepted" | "declined" | "changes_requested";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  items,
  optionalSelected,
  onToggleOptional,
}: {
  section: SnapshotSection;
  items: SnapshotItem[];
  optionalSelected: Set<string>;
  onToggleOptional: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visible = items.filter((i) => i.isVisibleToCustomer);

  if (visible.length === 0) return null;

  return (
    <div className="border border-border rounded-sm overflow-hidden mb-3">
      <button
        className="w-full flex items-center gap-3 px-5 py-3 bg-muted/20 text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground flex-1">{section.title}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border">
              {visible.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 px-5 py-3 ${item.isOptional ? "bg-blue-50/30" : ""}`}
                >
                  {item.isOptional && (
                    <input
                      type="checkbox"
                      checked={optionalSelected.has(item.id)}
                      onChange={() => onToggleOptional(item.id)}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.qty} {item.unit}
                      {item.isOptional && <span className="ml-2 text-blue-600 font-medium">Optional add-on</span>}
                    </p>
                  </div>
                  {item.lineTotal !== undefined && (
                    <p className="text-sm font-semibold text-foreground flex-shrink-0">
                      ${fmt(item.lineTotal)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CustomerPortalPage ────────────────────────────────────────────────────────

export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [portalState, setPortalState] = useState<PortalState>("idle");
  const [declineReason, setDeclineReason] = useState("");
  const [changesMessage, setChangesMessage] = useState("");
  const [optionalSelected, setOptionalSelected] = useState<Set<string>>(new Set());
  const [actionView, setActionView] = useState<"none" | "decline" | "changes">("none");

  const { data, isLoading, error } = useQuery<PortalData>({
    queryKey: ["/api/portal", token],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/portal/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error("Failed"), { status: res.status, body });
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/portal/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOptionalIds: [...optionalSelected] }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => setPortalState("accepted"),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/portal/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => setPortalState("declined"),
  });

  const changesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/portal/${token}/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: changesMessage.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => setPortalState("changes_requested"),
  });

  function toggleOptional(id: string) {
    setOptionalSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your quote…</p>
        </div>
      </div>
    );
  }

  if (error) {
    const status = (error as { status?: number }).status;
    const isExpired = status === 410;
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            {isExpired ? <Clock className="h-6 w-6 text-muted-foreground" /> : <AlertCircle className="h-6 w-6 text-muted-foreground" />}
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isExpired ? "Quote Link Expired" : "Quote Not Found"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? "This quote link has expired or been revoked. Please contact us for an updated quote."
              : "This quote link is invalid. Please contact us if you believe this is an error."}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Already accepted in a previous session — show read-only confirmation
  if (data.estimateStatus === "accepted" && portalState !== "accepted") {
    const siteUrl = import.meta.env.VITE_SITE_URL || "https://suvana-97279.web.app";
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Quote Already Accepted</h2>
          {data.acceptedAt && (
            <p className="text-sm text-muted-foreground mb-3">
              Accepted on {new Date(data.acceptedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-6">
            This quote has already been accepted. We'll be in touch to confirm next steps.
          </p>
          <a
            href={`${siteUrl}/quote`}
            className="inline-flex items-center gap-2 border border-border text-sm font-medium px-5 py-2.5 rounded-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            Request a New Quote
          </a>
        </motion.div>
      </div>
    );
  }

  const snap = data.snapshot;
  const est = snap.estimate ?? {};
  const sections = (snap.sections ?? []).sort((a, b) => a.position - b.position);
  const items = snap.items ?? [];

  // Recompute totals live so toggling optional items updates the summary
  const activeItems = items.filter(
    (i) => i.isVisibleToCustomer && (!i.isOptional || optionalSelected.has(i.id))
  );
  const dynamicSubtotal = activeItems.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  const discountAmt = snap.totals?.discountAmount ?? 0;
  const afterDiscount = Math.max(0, dynamicSubtotal - discountAmt);
  const taxAmt = afterDiscount * ((est.taxRate ?? 0) / 100);
  const grandTotalAmt = afterDiscount + taxAmt;
  const depositAmt = grandTotalAmt * ((est.depositPct ?? 0) / 100);
  const totals = {
    subtotal: dynamicSubtotal,
    discountAmount: discountAmt,
    taxAmount: taxAmt,
    grandTotal: grandTotalAmt,
    depositAmount: depositAmt,
  };

  // ─── Confirmation states ──────────────────────────────────────────────────

  if (portalState === "accepted") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Quote Accepted!</h2>
          <p className="text-sm text-muted-foreground">
            Thank you! We've received your acceptance and will be in touch shortly to confirm next steps.
          </p>
        </motion.div>
      </div>
    );
  }

  if (portalState === "declined") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
            <X className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Response Received</h2>
          <p className="text-sm text-muted-foreground">
            We've noted your response. Please reach out if you'd like to discuss further options.
          </p>
        </motion.div>
      </div>
    );
  }

  if (portalState === "changes_requested") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
            <MessageSquare className="h-8 w-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Changes Requested</h2>
          <p className="text-sm text-muted-foreground">
            We've received your revision request and will follow up with an updated quote.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Main quote view ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-foreground py-10">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Suvana Constructions</p>
          <h1 className="font-display text-3xl font-bold text-white mb-1">{est.title ?? "Your Quote"}</h1>
          <p className="text-sm text-white/60">
            Prepared for {est.customerName}
            {est.validUntil && (
              <> · Valid until {new Date(est.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
            )}
          </p>
          <p className="text-xs text-white/40 mt-1">Version {data.versionNumber}</p>
          {data.acceptedAt && (
            <p className="text-xs text-green-400 mt-1 font-medium">
              ✓ Accepted {new Date(data.acceptedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-3xl py-10">
        {/* Description */}
        {est.description && (
          <div className="bg-background rounded-sm border border-border p-5 mb-6">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{est.description}</p>
          </div>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            items={items.filter((i) => i.sectionId === section.id).sort((a, b) => a.position - b.position)}
            optionalSelected={optionalSelected}
            onToggleOptional={toggleOptional}
          />
        ))}

        {/* Totals */}
        <div className="bg-background rounded-sm border border-border p-5 mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> Summary
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${fmt(totals.subtotal ?? 0)}</span>
            </div>
            {(totals.discountAmount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">–${fmt(totals.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-foreground">${fmt(totals.taxAmount ?? 0)}</span>
            </div>
          </div>
          <div className="border-t border-border mt-4 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">${fmt(totals.grandTotal ?? 0)}</span>
            </div>
            {(totals.depositAmount ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deposit Required</span>
                <span className="text-sm font-semibold text-foreground">${fmt(totals.depositAmount ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-background rounded-sm border border-border p-5">
          <p className="text-sm text-muted-foreground mb-4">Ready to move forward with this quote?</p>

          <AnimatePresence mode="wait">
            {actionView === "none" && (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-3"
              >
                <button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {acceptMutation.isPending ? "Accepting…" : "Accept Quote"}
                </button>
                <button
                  onClick={() => setActionView("changes")}
                  className="flex items-center gap-2 border border-border text-sm font-medium px-5 py-2.5 rounded-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Request Changes
                </button>
                <button
                  onClick={() => setActionView("decline")}
                  className="flex items-center gap-2 border border-border text-sm font-medium px-5 py-2.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Decline
                </button>
              </motion.div>
            )}

            {actionView === "decline" && (
              <motion.div
                key="decline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-3"
              >
                <p className="text-sm font-medium text-foreground">Why are you declining? (optional)</p>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="Let us know your reason…"
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => declineMutation.mutate()}
                    disabled={declineMutation.isPending}
                    className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
                  >
                    {declineMutation.isPending ? "Sending…" : "Confirm Decline"}
                  </button>
                  <button
                    onClick={() => setActionView("none")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {actionView === "changes" && (
              <motion.div
                key="changes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-3"
              >
                <p className="text-sm font-medium text-foreground">What would you like changed?</p>
                <textarea
                  value={changesMessage}
                  onChange={(e) => setChangesMessage(e.target.value)}
                  rows={3}
                  placeholder="Describe the changes you'd like…"
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => changesMutation.mutate()}
                    disabled={changesMutation.isPending || !changesMessage.trim()}
                    className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
                  >
                    {changesMutation.isPending ? "Sending…" : "Send Request"}
                  </button>
                  <button
                    onClick={() => setActionView("none")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
