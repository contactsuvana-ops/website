import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  ChevronLeft,
  Plus,
  Cloud,
  Users,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  X,
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

interface DailyLog {
  id: string;
  date: string;
  status: string;
  weather?: string;
  completedWork: string;
  totalHours: number;
  crew: Array<{ name: string; role?: string; hours: number }>;
  issues?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

interface NewLogForm {
  date: string;
  weather: string;
  temperature: string;
  completedWork: string;
  totalHours: number;
  crew: Array<{ name: string; role: string; hours: number }>;
  materials: string;
  issues: string;
  delays: string;
  safetyNotes: string;
  generalNotes: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  archived: "bg-muted text-muted-foreground",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const DEFAULT_FORM: NewLogForm = {
  date: today(),
  weather: "",
  temperature: "",
  completedWork: "",
  totalHours: 0,
  crew: [],
  materials: "",
  issues: "",
  delays: "",
  safetyNotes: "",
  generalNotes: "",
};

export default function ProjectLogsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewLogForm>(DEFAULT_FORM);
  const [crewEntry, setCrewEntry] = useState({ name: "", role: "", hours: 0 });
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const { data: project } = useQuery<{ name: string; projectNumber?: string }>({
    queryKey: ["/api/admin/projects", projectId],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: logs = [], refetch } = useQuery<DailyLog[]>({
    queryKey: ["/api/admin/projects", projectId, "logs"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/logs`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: selectedLogData } = useQuery<DailyLog>({
    queryKey: ["/api/admin/projects", projectId, "logs", selectedLog],
    queryFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/logs/${selectedLog}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedLog,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/admin/projects/${projectId}/logs`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      refetch();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/logs/${logId}/submit`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => refetch(),
  });

  const approveMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await adminFetch(`/admin/projects/${projectId}/logs/${logId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => refetch(),
  });

  const addCrewEntry = () => {
    if (!crewEntry.name.trim()) return;
    setForm((f) => ({ ...f, crew: [...f.crew, { ...crewEntry }] }));
    setCrewEntry({ name: "", role: "", hours: 0 });
  };

  const removeCrewEntry = (index: number) => {
    setForm((f) => ({ ...f, crew: f.crew.filter((_, i) => i !== index) }));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: log list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <button
            onClick={() => navigate(`/admin/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            {project?.projectNumber ?? "Project"}
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Daily Logs</h2>
            <button
              onClick={() => { setShowCreate(true); setSelectedLog(null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {logs.length === 0 && !showCreate && (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No logs yet.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 text-xs text-foreground underline"
              >
                Create first log
              </button>
            </div>
          )}
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => { setSelectedLog(log.id); setShowCreate(false); }}
              className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors ${selectedLog === log.id ? "bg-muted/30" : ""}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-foreground">{log.date}</span>
                <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[log.status] ?? "bg-muted text-muted-foreground"}`}>
                  {log.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{log.totalHours}h</span>
                {log.weather && <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />{log.weather}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: create form or log detail */}
      <div className="flex-1 overflow-y-auto">
        {showCreate && (
          <div className="p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">New Daily Log</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Date + weather */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full text-sm border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/20 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Weather</label>
                  <input
                    value={form.weather}
                    onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
                    placeholder="Sunny, 72°F"
                    className="w-full text-sm border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/20 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Total Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={form.totalHours}
                    onChange={(e) => setForm((f) => ({ ...f, totalHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-sm border border-border rounded-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-foreground/20 bg-background"
                  />
                </div>
              </div>

              {/* Completed work */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Work Completed *</label>
                <textarea
                  value={form.completedWork}
                  onChange={(e) => setForm((f) => ({ ...f, completedWork: e.target.value }))}
                  rows={3}
                  placeholder="Describe work completed today…"
                  className="w-full text-sm border border-border rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-foreground/20 bg-background resize-none"
                />
              </div>

              {/* Crew */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Crew Present</label>
                {form.crew.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="flex-1 text-sm text-foreground">{c.name}{c.role ? ` (${c.role})` : ""}</span>
                    <span className="text-xs text-muted-foreground">{c.hours}h</span>
                    <button onClick={() => removeCrewEntry(i)} className="text-muted-foreground/40 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    value={crewEntry.name}
                    onChange={(e) => setCrewEntry((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Name"
                    className="flex-1 text-sm border border-border rounded-sm px-2 py-1 focus:outline-none bg-background"
                  />
                  <input
                    value={crewEntry.role}
                    onChange={(e) => setCrewEntry((c) => ({ ...c, role: e.target.value }))}
                    placeholder="Role"
                    className="w-24 text-sm border border-border rounded-sm px-2 py-1 focus:outline-none bg-background"
                  />
                  <input
                    type="number"
                    min="0"
                    value={crewEntry.hours}
                    onChange={(e) => setCrewEntry((c) => ({ ...c, hours: parseFloat(e.target.value) || 0 }))}
                    placeholder="Hrs"
                    className="w-16 text-sm border border-border rounded-sm px-2 py-1 focus:outline-none bg-background"
                  />
                  <button
                    onClick={addCrewEntry}
                    className="px-2 py-1 text-xs bg-foreground text-background rounded-sm hover:bg-foreground/80 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Optional fields */}
              {[
                { key: "materials" as const, label: "Materials Used" },
                { key: "issues" as const, label: "Issues / Problems" },
                { key: "delays" as const, label: "Delays" },
                { key: "safetyNotes" as const, label: "Safety Notes" },
                { key: "generalNotes" as const, label: "General Notes" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    rows={2}
                    className="w-full text-sm border border-border rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-foreground/20 bg-background resize-none"
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.completedWork.trim() || createMutation.isPending}
                  className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Save Draft
                </button>
                <button
                  onClick={() => { setShowCreate(false); setForm(DEFAULT_FORM); }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedLog && selectedLogData && !showCreate && (
          <div className="p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">{fmtDate(selectedLogData.date)}</h3>
                <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-medium mt-1 ${STATUS_COLORS[selectedLogData.status] ?? "bg-muted text-muted-foreground"}`}>
                  {selectedLogData.status}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedLogData.status === "draft" && (
                  <button
                    onClick={() => submitMutation.mutate(selectedLog)}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 bg-foreground text-background rounded-sm hover:bg-foreground/80 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit
                  </button>
                )}
                {selectedLogData.status === "submitted" && (
                  <button
                    onClick={() => approveMutation.mutate(selectedLog)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Stats row */}
              <div className="flex gap-4">
                {selectedLogData.weather && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Cloud className="h-4 w-4" /> {selectedLogData.weather}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> {selectedLogData.totalHours}h total
                </div>
                {selectedLogData.crew.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {selectedLogData.crew.length} crew
                  </div>
                )}
              </div>

              {/* Work completed */}
              <div className="bg-background border border-border rounded-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Work Completed</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedLogData.completedWork}</p>
              </div>

              {/* Crew */}
              {selectedLogData.crew.length > 0 && (
                <div className="bg-background border border-border rounded-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Crew</p>
                  <div className="divide-y divide-border">
                    {selectedLogData.crew.map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{c.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {[
                { label: "Issues", value: selectedLogData.issues },
              ].filter((n) => n.value).map(({ label, value }) => (
                <div key={label} className="bg-background border border-border rounded-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showCreate && !selectedLog && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a log or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
