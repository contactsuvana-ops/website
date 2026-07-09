import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  GripVertical,
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

interface Section {
  id: string;
  title: string;
  position: number;
  isCollapsed: boolean;
  notes?: string;
}

interface Task {
  id: string;
  sectionId?: string;
  title: string;
  status: string;
  priority: string;
  position: number;
  assignedTo: string[];
  estimatedHours?: number;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

const TASK_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  ready: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  blocked: "bg-red-50 text-red-700",
  inspection_pending: "bg-orange-50 text-orange-700",
  approved: "bg-purple-50 text-purple-700",
  done: "bg-green-50 text-green-700",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  not_started: Circle,
  ready: Circle,
  in_progress: Clock,
  blocked: AlertCircle,
  inspection_pending: Clock,
  approved: CheckCircle2,
  done: CheckCircle2,
  cancelled: Circle,
};

const TASK_STATUSES = ["not_started", "ready", "in_progress", "blocked", "inspection_pending", "approved", "done", "cancelled"] as const;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  projectId,
  onDelete,
}: {
  task: Task;
  projectId: string;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const Icon = STATUS_ICONS[task.status] ?? Circle;
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setShowStatusMenu(false);
      qc.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await adminFetch(`/admin/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
    },
    onSuccess: onDelete,
  });

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-muted/10 transition-colors">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 flex-shrink-0 cursor-grab" />

      {/* Status toggle */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowStatusMenu((v) => !v)}
          className="transition-transform hover:scale-110"
        >
          <Icon
            className={`h-4 w-4 ${
              task.status === "done" || task.status === "approved"
                ? "text-green-500"
                : task.status === "blocked"
                ? "text-red-500"
                : task.status === "in_progress"
                ? "text-blue-500"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
        {showStatusMenu && (
          <div className="absolute left-0 top-6 z-20 bg-background border border-border rounded-sm shadow-lg py-1 min-w-44">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate(s)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-muted/50 ${
                  task.status === s ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm text-foreground truncate ${task.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        {(task.plannedStartDate || task.plannedEndDate) && (
          <p className="text-xs text-muted-foreground">
            {fmtDate(task.plannedStartDate)} {task.plannedStartDate && task.plannedEndDate ? "→" : ""} {fmtDate(task.plannedEndDate)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`flex-shrink-0 inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${TASK_STATUS_COLORS[task.status] ?? "bg-muted text-muted-foreground"}`}>
        {task.status.replace(/_/g, " ")}
      </span>

      {/* Hours */}
      {task.estimatedHours != null && (
        <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
          {task.estimatedHours}h
        </span>
      )}

      {/* Delete */}
      <button
        onClick={() => deleteMutation.mutate()}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  tasks,
  projectId,
  onRefresh,
  onDeleteSection,
}: {
  section: Section;
  tasks: Task[];
  projectId: string;
  onRefresh: () => void;
  onDeleteSection: () => void;
}) {
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(section.isCollapsed ?? false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const sectionTasks = tasks
    .filter((t) => t.sectionId === section.id)
    .sort((a, b) => a.position - b.position);

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, sectionId: section.id, status: "not_started", priority: "normal" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setNewTaskTitle("");
      setAddingTask(false);
      qc.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "tasks"] });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async () => {
      await adminFetch(`/admin/projects/${projectId}/sections/${section.id}`, { method: "DELETE" });
    },
    onSuccess: onDeleteSection,
  });

  const done = sectionTasks.filter((t) => t.status === "done" || t.status === "approved").length;

  return (
    <div className="bg-background rounded-sm border border-border overflow-hidden mb-3">
      {/* Section header */}
      <div className="flex items-center gap-3 bg-muted/20 px-4 py-3 group">
        <button onClick={() => setCollapsed((v) => !v)} className="flex-shrink-0">
          {collapsed
            ? <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        <span className="flex-1 text-sm font-semibold text-foreground">{section.title}</span>
        <span className="text-xs text-muted-foreground">{done}/{sectionTasks.length} done</span>
        <button
          onClick={() => deleteSectionMutation.mutate()}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Tasks */}
          <div className="divide-y divide-border/50">
            {sectionTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={projectId}
                onDelete={() => qc.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "tasks"] })}
              />
            ))}
          </div>

          {/* Add task inline */}
          {addingTask ? (
            <div className="px-4 py-2.5 border-t border-dashed border-border/50">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle.trim());
                  if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                }}
                placeholder="Task title… (Enter to save, Esc to cancel)"
                className="w-full text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-dashed border-border/50 hover:bg-muted/10"
            >
              <Plus className="h-3.5 w-3.5" /> Add task
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const { data: projectData } = useQuery<{ id: string; name: string; projectNumber?: string }>({
    queryKey: ["/api/admin/projects", projectId],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: sections = [], refetch: refetchSections } = useQuery<Section[]>({
    queryKey: ["/api/admin/projects", projectId, "sections"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/sections`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ["/api/admin/projects", projectId, "tasks"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const createSectionMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/sections`, {
        method: "POST",
        body: JSON.stringify({ title, position: sections.length }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setNewSectionTitle("");
      setAddingSection(false);
      refetchSections();
    },
  });

  const sortedSections = [...sections].sort((a, b) => a.position - b.position);
  const unsectionedTasks = tasks.filter((t) => !t.sectionId).sort((a, b) => a.position - b.position);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "approved").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <button
          onClick={() => navigate(`/admin/projects/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {projectData?.projectNumber ? `${projectData.projectNumber} — ${projectData.name}` : "Project"}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Work Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doneTasks}/{totalTasks} tasks complete
            </p>
          </div>
          <button
            onClick={() => setAddingSection(true)}
            className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-3 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Section
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedSections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            tasks={tasks}
            projectId={projectId}
            onRefresh={refetchTasks}
            onDeleteSection={() => {
              refetchSections();
              refetchTasks();
            }}
          />
        ))}

        {/* Unsectioned tasks */}
        {unsectionedTasks.length > 0 && (
          <div className="bg-background rounded-sm border border-dashed border-border overflow-hidden mb-3">
            <div className="px-4 py-3 bg-muted/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unsectioned</span>
            </div>
            <div className="divide-y divide-border/50">
              {unsectionedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  onDelete={() => qc.invalidateQueries({ queryKey: ["/api/admin/projects", projectId, "tasks"] })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add section inline */}
        {addingSection ? (
          <div className="bg-background rounded-sm border border-border px-4 py-3 mb-3">
            <input
              autoFocus
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSectionTitle.trim()) createSectionMutation.mutate(newSectionTitle.trim());
                if (e.key === "Escape") { setAddingSection(false); setNewSectionTitle(""); }
              }}
              placeholder="Section name… (Enter to save, Esc to cancel)"
              className="w-full text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/50 font-semibold"
            />
          </div>
        ) : (
          sections.length === 0 && tasks.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-3">No sections or tasks yet.</p>
              <button
                onClick={() => setAddingSection(true)}
                className="flex items-center gap-2 mx-auto text-sm font-semibold text-foreground border border-border rounded-sm px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add First Section
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
