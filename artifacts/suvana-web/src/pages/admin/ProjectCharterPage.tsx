import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminToken } from "@/hooks/use-admin-auth";
import { ChevronLeft, BookOpen, Edit3, Check, Send, Plus, Trash2 } from "lucide-react";

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

interface Charter {
  id: string;
  projectId: string;
  status: "draft" | "published";
  version: number;
  summary: string;
  customerSummary?: string;
  scopeSummary?: string;
  assumptions?: string;
  constraints?: string;
  risks?: string;
  successCriteria?: string;
  communicationPlan?: string;
  teamAssignments?: string;
  milestones: Array<{ title: string; targetDate?: string; description?: string }>;
  approvals?: string;
  publishedAt?: string | null;
  updatedAt: string;
}

// ─── Field Editor ─────────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  onSave,
  multiline = true,
  placeholder,
}: {
  label: string;
  value?: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-foreground"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          {multiline ? (
            <textarea
              autoFocus
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              rows={4}
              className="w-full text-sm border border-foreground/20 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-foreground/30 bg-background resize-none"
            />
          ) : (
            <input
              autoFocus
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="w-full text-sm border border-foreground/20 rounded-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/30 bg-background"
            />
          )}
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={() => { onSave(local); setEditing(false); }}
              className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700"
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              onClick={() => { setLocal(value ?? ""); setEditing(false); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-foreground whitespace-pre-wrap min-h-[1.5rem] cursor-text"
          onClick={() => setEditing(true)}
        >
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground/40 italic">{placeholder ?? "Click to add…"}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Milestone Editor ─────────────────────────────────────────────────────────

function MilestoneEditor({
  milestones,
  onChange,
}: {
  milestones: Array<{ title: string; targetDate?: string; description?: string }>;
  onChange: (m: typeof milestones) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
        Milestones
      </label>
      <div className="space-y-2 mb-2">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
            <span className="flex-1 text-sm text-foreground">{m.title}</span>
            {m.targetDate && (
              <span className="text-xs text-muted-foreground">{m.targetDate}</span>
            )}
            <button
              onClick={() => onChange(milestones.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                onChange([...milestones, { title: newTitle.trim() }]);
                setNewTitle("");
                setAdding(false);
              }
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            placeholder="Milestone title…"
            className="flex-1 text-sm border border-border rounded-sm px-2 py-1 focus:outline-none bg-background"
          />
          <button
            onClick={() => {
              if (newTitle.trim()) onChange([...milestones, { title: newTitle.trim() }]);
              setNewTitle("");
              setAdding(false);
            }}
            className="text-xs px-2 py-1 bg-foreground text-background rounded-sm"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add milestone
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectCharterPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: project } = useQuery<{ name: string; projectNumber?: string }>({
    queryKey: ["/api/admin/projects", projectId],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: charter, isLoading, refetch } = useQuery<Charter>({
    queryKey: ["/api/admin/projects", projectId, "charter"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/charter`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Charter>) => {
      const res = await adminFetch(`/admin/projects/${projectId}/charter`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => refetch(),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/charter/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => refetch(),
  });

  const saveField = (field: keyof Charter) => (value: string) => {
    updateMutation.mutate({ [field]: value });
  };

  const saveMilestones = (
    milestones: Array<{ title: string; targetDate?: string; description?: string }>
  ) => {
    updateMutation.mutate({ milestones });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>;
  }

  if (!charter) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No charter found for this project.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <button
          onClick={() => navigate(`/admin/projects/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {project?.projectNumber ?? "Project"}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Project Charter</h2>
            <span
              className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium ${
                charter.status === "published"
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
              }`}
            >
              {charter.status} · v{charter.version}
            </span>
          </div>
          {charter.status === "draft" && (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Publish Charter
            </button>
          )}
        </div>
        {charter.publishedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Published {new Date(charter.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Summary */}
          <div className="bg-background rounded-sm border border-border p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overview</h3>
            <EditableField
              label="Project Summary"
              value={charter.summary}
              onSave={saveField("summary")}
              placeholder="High-level project summary…"
            />
            <EditableField
              label="Customer Summary"
              value={charter.customerSummary}
              onSave={saveField("customerSummary")}
              placeholder="Customer context and background…"
            />
            <EditableField
              label="Scope Summary"
              value={charter.scopeSummary}
              onSave={saveField("scopeSummary")}
              placeholder="Scope of work description…"
            />
          </div>

          {/* Milestones */}
          <div className="bg-background rounded-sm border border-border p-5">
            <MilestoneEditor milestones={charter.milestones} onChange={saveMilestones} />
          </div>

          {/* Team + Constraints */}
          <div className="bg-background rounded-sm border border-border p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team & Planning</h3>
            <EditableField
              label="Team Assignments"
              value={charter.teamAssignments}
              onSave={saveField("teamAssignments")}
              placeholder="PM, crew leads, subcontractors…"
            />
            <EditableField
              label="Communication Plan"
              value={charter.communicationPlan}
              onSave={saveField("communicationPlan")}
              placeholder="Meeting schedule, contacts, escalation…"
            />
          </div>

          {/* Risks + Constraints */}
          <div className="bg-background rounded-sm border border-border p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Risk & Constraints</h3>
            <EditableField
              label="Assumptions"
              value={charter.assumptions}
              onSave={saveField("assumptions")}
              placeholder="Project assumptions…"
            />
            <EditableField
              label="Constraints"
              value={charter.constraints}
              onSave={saveField("constraints")}
              placeholder="Budget, timeline, access constraints…"
            />
            <EditableField
              label="Risks"
              value={charter.risks}
              onSave={saveField("risks")}
              placeholder="Identified risks and mitigations…"
            />
          </div>

          {/* Success + Approvals */}
          <div className="bg-background rounded-sm border border-border p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Completion</h3>
            <EditableField
              label="Success Criteria"
              value={charter.successCriteria}
              onSave={saveField("successCriteria")}
              placeholder="How we define project success…"
            />
            <EditableField
              label="Approvals"
              value={charter.approvals}
              onSave={saveField("approvals")}
              placeholder="Sign-off requirements…"
            />
          </div>

          {/* Last updated */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Last edited {new Date(charter.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {updateMutation.isPending && " · Saving…"}
          </p>
        </div>
      </div>
    </div>
  );
}
