import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getAdminToken } from "@/hooks/use-admin-auth";
import { PlusCircle, HardHat, ChevronRight, Search } from "lucide-react";

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

interface ProjectItem {
  id: string;
  name: string;
  clientName: string;
  status: string;
  projectNumber?: string;
  propertyAddress?: string;
  contractValue?: number;
  priority?: string;
  startTarget?: string | null;
  completionTarget?: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  on_hold: "bg-yellow-50 text-yellow-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-50 text-red-700",
};

const PRIORITY_DOTS: Record<string, string> = {
  low: "bg-muted-foreground/30",
  normal: "bg-blue-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

const STATUS_OPTIONS = ["all", "planning", "active", "on_hold", "completed", "cancelled"] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProjectsListPage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ items: ProjectItem[]; total: number }>({
    queryKey: ["/api/admin/projects", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await adminFetch(`/admin/projects?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = (data?.items ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      (p.projectNumber ?? "").toLowerCase().includes(q) ||
      (p.propertyAddress ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} project{data?.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/estimates")}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <HardHat className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground">
            Projects are created when an accepted estimate is converted.
          </p>
        </div>
      )}

      {/* Project list */}
      {filtered.length > 0 && (
        <motion.div
          className="space-y-2"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {filtered.map((project) => (
            <motion.button
              key={project.id}
              variants={fadeUp}
              onClick={() => navigate(`/admin/projects/${project.id}`)}
              className="w-full text-left bg-background rounded-sm border border-border hover:border-foreground/20 hover:shadow-sm transition-all p-4 flex items-center gap-4"
            >
              {/* Priority dot */}
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOTS[project.priority ?? "normal"] ?? "bg-blue-400"}`}
              />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {project.projectNumber && (
                    <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                      {project.projectNumber}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{project.clientName}</span>
                  {project.propertyAddress && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="truncate max-w-40">{project.propertyAddress}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Contract value */}
              {project.contractValue != null && project.contractValue > 0 && (
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">${fmt(project.contractValue)}</p>
                  <p className="text-xs text-muted-foreground">contract</p>
                </div>
              )}

              {/* Status badge */}
              <span
                className={`flex-shrink-0 inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] ?? "bg-muted text-muted-foreground"}`}
              >
                {project.status.replace(/_/g, " ")}
              </span>

              <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
