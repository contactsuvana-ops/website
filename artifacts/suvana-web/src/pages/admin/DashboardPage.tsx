import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetSubmissionStats,
  getGetSubmissionStatsQueryKey,
} from "@workspace/api-client-react";
import {
  Users,
  FileText,
  Calendar,
  Globe,
  CreditCard,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { getAdminToken } from "@/hooks/use-admin-auth";

const apiBase = import.meta.env.VITE_API_URL || "";

async function adminFetch(path: string): Promise<Response> {
  const token = getAdminToken();
  return fetch(`${apiBase}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const PROJECT_LABELS: Record<string, string> = {
  "kitchen-remodeling": "Kitchen Remodeling",
  drywall: "Drywall",
  plumbing: "Plumbing",
  electrical: "Electrical",
  flooring: "Flooring",
  fireplace: "Fireplace",
  basement: "Basement",
  painting: "Painting",
  remodeling: "Remodeling",
  handyman: "Handyman",
};

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function DashboardPage() {
  const [, navigate] = useLocation();

  const { data: stats } = useGetSubmissionStats({
    query: { queryKey: getGetSubmissionStatsQueryKey() },
  });

  const { data: qrScans } = useQuery<{ items: { id: string; count: number }[] }>({
    queryKey: ["/api/admin/qr-scans"],
    queryFn: async () => {
      const res = await adminFetch("/admin/qr-scans");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: recentEstimates } = useQuery<{
    items: { id: string; title: string; customerName: string; status: string; updatedAt: string }[];
  }>({
    queryKey: ["/api/admin/estimates/recent"],
    queryFn: async () => {
      const res = await adminFetch("/admin/estimates?limit=5");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const siteVisitCount = qrScans?.items?.find((i) => i.id === "site-visit")?.count;
  const bizCardCount = qrScans?.items?.find((i) => i.id === "quote-request")?.count;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of your business</p>
        </div>
        <button
          onClick={() => navigate("/admin/estimates")}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Estimate
        </button>
      </div>

      {/* Prospect stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {[
          { icon: Users, label: "Total Contacts", value: stats?.totalContacts ?? "—", color: "text-blue-600 bg-blue-50" },
          { icon: FileText, label: "Total Quotes", value: stats?.totalQuotes ?? "—", color: "text-accent bg-accent/10" },
          { icon: Calendar, label: "Last 30 Days", value: stats?.recentSubmissions ?? "—", color: "text-green-600 bg-green-50" },
        ].map(({ icon: Icon, label, value, color }) => (
          <motion.div key={label} variants={fadeUp} className="bg-background rounded-sm border border-border p-5">
            <div className={`w-9 h-9 rounded-sm flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Traffic cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="bg-background rounded-sm border border-border p-5">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 text-indigo-600 bg-indigo-50">
            <Globe className="h-4 w-4" />
          </div>
          <div className="font-display text-2xl font-bold text-foreground">{siteVisitCount ?? "—"}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Site Visits</div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Unique browser sessions</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-background rounded-sm border border-border p-5">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 text-amber-600 bg-amber-50">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="font-display text-2xl font-bold text-foreground">{bizCardCount ?? "—"}</div>
          <div className="text-sm text-muted-foreground mt-0.5">Business Card Visits</div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Scans from printed QR code</p>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent estimates */}
        <motion.div
          className="bg-background rounded-sm border border-border"
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Estimates</h3>
            <button
              onClick={() => navigate("/admin/estimates")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {!recentEstimates?.items?.length ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No estimates yet.{" "}
              <button onClick={() => navigate("/admin/estimates")} className="text-accent underline">
                Create one
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentEstimates.items.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => navigate(`/admin/estimates/${e.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.customerName}</p>
                    </div>
                    <span className={`ml-3 flex-shrink-0 inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${ESTIMATE_STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"}`}>
                      {e.status.replace(/_/g, " ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Project type breakdown */}
        {stats?.byProjectType && stats.byProjectType.length > 0 && (
          <motion.div
            className="bg-background rounded-sm border border-border"
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Quotes by Project Type</h3>
            </div>
            <div className="p-5 flex flex-wrap gap-2">
              {stats.byProjectType.sort((a, b) => b.count - a.count).map((item) => (
                <span
                  key={item.projectType}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {PROJECT_LABELS[item.projectType] ?? item.projectType}
                  <span className="rounded-full bg-accent text-white px-1.5 py-0.5 text-xs font-bold">{item.count}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
