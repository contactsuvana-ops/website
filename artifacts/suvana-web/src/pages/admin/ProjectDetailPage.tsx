import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  ChevronLeft,
  ClipboardList,
  ListChecks,
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  status: string;
  projectNumber?: string;
  propertyAddress?: string;
  contractValue?: number;
  priority?: string;
  startTarget?: string | null;
  completionTarget?: string | null;
  assignedPM?: string;
  crewIds?: string[];
  tags?: string[];
  scopeId?: string;
  charterId?: string;
  description?: string;
  createdAt: string;
}

interface Milestone {
  id: string;
  title: string;
  status: string;
  position: number;
  targetDate?: string | null;
  notes?: string;
}

interface Activity {
  id: string;
  type: string;
  summary: string;
  actorId: string;
  createdAt: string;
}

interface Scope {
  estimateTitle: string;
  contractValue: number;
  totals: {
    grandTotal: number;
    subtotal: number;
    depositAmount: number;
    laborCost: number;
    materialCost: number;
  };
  sections: Array<{ id: string; title: string; position: number }>;
  lineItems: Array<{
    id: string;
    sectionId: string;
    description: string;
    qty: number;
    unit: string;
    isOptional: boolean;
    isIncluded: boolean;
    lineTotal: number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  on_hold: "bg-yellow-50 text-yellow-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-50 text-red-700",
};

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertCircle,
  skipped: Circle,
};

const MILESTONE_COLORS: Record<string, string> = {
  not_started: "text-muted-foreground/40",
  in_progress: "text-blue-500",
  completed: "text-green-500",
  blocked: "text-red-500",
  skipped: "text-muted-foreground/20",
};

const TABS: Array<{ id: string; label: string; icon: React.ElementType; href?: string }> = [
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "scope", label: "Scope", icon: FileText },
  { id: "tasks", label: "Tasks", icon: ListChecks, href: "tasks" },
  { id: "logs", label: "Daily Logs", icon: ClipboardList, href: "logs" },
  { id: "charter", label: "Charter", icon: BookOpen, href: "charter" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  projectId,
  onRefresh,
}: {
  milestone: Milestone;
  projectId: string;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const Icon = MILESTONE_ICONS[milestone.status] ?? Circle;
  const colorClass = MILESTONE_COLORS[milestone.status] ?? "text-muted-foreground";

  const NEXT_STATUS: Record<string, string> = {
    not_started: "in_progress",
    in_progress: "completed",
    blocked: "in_progress",
    skipped: "not_started",
  };

  const updateMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/milestones/${milestone.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "milestones"] });
      onRefresh();
    },
  });

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <button
        onClick={() => {
          const next = NEXT_STATUS[milestone.status];
          if (next) updateMutation.mutate(next);
        }}
        disabled={milestone.status === "completed" || milestone.status === "skipped" || updateMutation.isPending}
        className={`flex-shrink-0 transition-transform hover:scale-110 disabled:cursor-default ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${milestone.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {milestone.title}
        </p>
        {milestone.targetDate && (
          <p className="text-xs text-muted-foreground">Target: {fmtDate(milestone.targetDate)}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {milestone.status.replace(/_/g, " ")}
      </span>
    </div>
  );
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <div className="space-y-0">
      {activities.slice(0, 20).map((a) => (
        <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{a.summary}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(a.createdAt)}</p>
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<string>("overview");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/admin/projects", projectId],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: milestones = [], refetch: refetchMilestones } = useQuery<Milestone[]>({
    queryKey: ["/api/admin/projects", projectId, "milestones"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/milestones`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/admin/projects", projectId, "activities"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/activities`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: scope } = useQuery<Scope>({
    queryKey: ["/api/admin/projects", projectId, "scope"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/scope`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId && (tab === "scope" || !!project?.scopeId),
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const milestoneProgress = milestones.length > 0
    ? Math.round((completedMilestones / milestones.length) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <button
          onClick={() => navigate("/admin/projects")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Projects
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {project.projectNumber && (
                <span className="text-xs font-mono text-muted-foreground">{project.projectNumber}</span>
              )}
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] ?? "bg-muted text-muted-foreground"}`}>
                {project.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>{project.clientName}</span>
              {project.propertyAddress && <span>{project.propertyAddress}</span>}
              {project.contractValue != null && (
                <span className="font-semibold text-foreground">${fmt(project.contractValue)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-4 -mb-4">
          {TABS.map(({ id, label, icon: Icon, href }) => (
            <button
              key={id}
              onClick={() => {
                if (href) {
                  navigate(`/admin/projects/${projectId}/${href}`);
                } else {
                  setTab(id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === id && !href
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "overview" && (
          <motion.div
            className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          >
            {/* Left: project info + milestones */}
            <div className="lg:col-span-2 space-y-5">
              {/* Stats */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Contract", value: project.contractValue != null ? `$${fmt(project.contractValue)}` : "—" },
                  { label: "Milestones", value: `${completedMilestones}/${milestones.length}` },
                  { label: "Progress", value: `${milestoneProgress}%` },
                  { label: "Target", value: fmtDate(project.completionTarget) ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-background rounded-sm border border-border p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </motion.div>

              {/* Milestone progress bar */}
              {milestones.length > 0 && (
                <motion.div variants={fadeUp} className="bg-background rounded-sm border border-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Milestones</h3>
                    <span className="text-xs text-muted-foreground">{milestoneProgress}% complete</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mb-4">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${milestoneProgress}%` }}
                    />
                  </div>
                  <div className="divide-y divide-border">
                    {milestones.map((m) => (
                      <MilestoneRow
                        key={m.id}
                        milestone={m}
                        projectId={projectId}
                        onRefresh={() => refetchMilestones()}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: activity + quick info */}
            <div className="space-y-5">
              {/* Quick actions */}
              <motion.div variants={fadeUp} className="bg-background rounded-sm border border-border p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Links</h3>
                <div className="space-y-1">
                  {[
                    { label: "Manage Tasks", href: `/admin/projects/${projectId}/tasks` },
                    { label: "Daily Logs", href: `/admin/projects/${projectId}/logs` },
                    { label: "Project Charter", href: `/admin/projects/${projectId}/charter` },
                  ].map(({ label, href }) => (
                    <button
                      key={href}
                      onClick={() => navigate(href)}
                      className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground py-1.5 transition-colors"
                    >
                      {label}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Activity */}
              <motion.div variants={fadeUp} className="bg-background rounded-sm border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
                <ActivityFeed activities={activities} />
              </motion.div>
            </div>
          </motion.div>
        )}

        {tab === "scope" && (
          <div className="p-6 max-w-4xl">
            {!scope ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No scope snapshot linked to this project.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Totals header */}
                <div className="bg-background rounded-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">{scope.estimateTitle}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Contract Value", value: `$${fmt(scope.totals.grandTotal)}` },
                      { label: "Deposit", value: `$${fmt(scope.totals.depositAmount)}` },
                      { label: "Labor Cost", value: `$${fmt(scope.totals.laborCost)}` },
                      { label: "Material Cost", value: `$${fmt(scope.totals.materialCost)}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-base font-bold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sections + items */}
                {[...scope.sections]
                  .sort((a, b) => a.position - b.position)
                  .map((section) => {
                    const sectionItems = scope.lineItems
                      .filter((i) => i.sectionId === section.id)
                      .sort((a, b) => a.isOptional ? 1 : b.isOptional ? -1 : 0);
                    const sectionTotal = sectionItems
                      .filter((i) => i.isIncluded)
                      .reduce((sum, i) => sum + i.lineTotal, 0);

                    return (
                      <div key={section.id} className="bg-background rounded-sm border border-border overflow-hidden">
                        <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5">
                          <span className="text-sm font-semibold text-foreground">{section.title}</span>
                          <span className="text-sm font-semibold text-foreground">${fmt(sectionTotal)}</span>
                        </div>
                        <div className="divide-y divide-border">
                          {sectionItems.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 px-4 py-2.5 ${item.isOptional && !item.isIncluded ? "opacity-40" : ""}`}
                            >
                              {item.isOptional && (
                                <CheckCircle2
                                  className={`h-3.5 w-3.5 flex-shrink-0 ${item.isIncluded ? "text-green-600" : "text-muted-foreground/30"}`}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm text-foreground ${item.isOptional && !item.isIncluded ? "line-through" : ""}`}>
                                  {item.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.qty} {item.unit}
                                  {item.isOptional && (
                                    <span className={`ml-2 ${item.isIncluded ? "text-green-600" : ""}`}>
                                      Optional · {item.isIncluded ? "Included" : "Not included"}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {item.isIncluded && (
                                <span className="text-sm font-semibold text-foreground flex-shrink-0">
                                  ${fmt(item.lineTotal)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
