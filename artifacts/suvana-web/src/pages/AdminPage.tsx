import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetSubmissions,
  useGetSubmissionStats,
  useGetComments,
  useAddComment,
  useDeleteComment,
  getGetSubmissionsQueryKey,
  getGetSubmissionStatsQueryKey,
  getGetCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Trash2,
  Lock,
  Globe,
} from "lucide-react";

type FilterType = "all" | "contact" | "quote";

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

const BUDGET_LABELS: Record<string, string> = {
  "under-5k": "< $5K",
  "5k-15k": "$5K–$15K",
  "15k-50k": "$15K–$50K",
  "50k-100k": "$50K–$100K",
  "over-100k": "> $100K",
  "not-sure": "Not sure",
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: "ASAP",
  "1-3-months": "1–3 months",
  "3-6-months": "3–6 months",
  "6-12-months": "6–12 months",
  flexible: "Flexible",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function CommentsPanel({ submissionId }: { submissionId: number }) {
  const qc = useQueryClient();
  const { data: comments, isLoading } = useGetComments(submissionId, {
    query: { queryKey: getGetCommentsQueryKey(submissionId) },
  });
  const addMutation = useAddComment();
  const deleteMutation = useDeleteComment();

  const [text, setText] = useState("");
  const [isShared, setIsShared] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMutation.mutate(
      { id: submissionId, data: { content: trimmed, isShared } },
      {
        onSuccess: () => {
          setText("");
          setIsShared(false);
          qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(submissionId) });
        },
      }
    );
  }

  function handleDelete(commentId: number) {
    deleteMutation.mutate(
      { id: submissionId, commentId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(submissionId) });
        },
      }
    );
  }

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Internal Notes {comments?.length ? `(${comments.length})` : ""}
        </span>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">Loading notes…</p>
      ) : comments?.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 italic">No notes yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {comments?.map((c) => (
            <li
              key={c.id}
              className="group flex items-start gap-3 rounded-sm bg-muted/40 border border-border px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {c.isShared ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600 font-medium">
                      <Globe className="h-3 w-3" /> Shared
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Internal
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-sm p-1 hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add note */}
      <div className="rounded-sm border border-border bg-background overflow-hidden">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
          placeholder="Add an internal note… (⌘↵ to submit)"
          rows={2}
          className="w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
          <button
            onClick={() => setIsShared((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-sm px-2.5 py-1 transition-colors ${
              isShared
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isShared ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isShared ? "Shared with customer" : "Internal only"}
          </button>
          <button
            onClick={handleAdd}
            disabled={!text.trim() || addMutation.isPending}
            className="flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-4 py-1.5 rounded-sm hover:bg-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({
  s,
}: {
  s: {
    id: number;
    type: string;
    name: string;
    email: string;
    phone: string;
    projectType?: string | null;
    location?: string | null;
    budget?: string | null;
    timeline?: string | null;
    message: string;
    createdAt: string | Date;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-4 text-muted-foreground font-mono text-xs">#{s.id}</td>
        <td className="px-5 py-4">
          <span
            className={`inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold ${
              s.type === "quote" ? "bg-accent/15 text-accent" : "bg-blue-50 text-blue-700"
            }`}
          >
            {s.type}
          </span>
        </td>
        <td className="px-5 py-4 font-medium text-foreground">{s.name}</td>
        <td className="px-5 py-4 text-muted-foreground">
          <a
            href={`mailto:${s.email}`}
            className="hover:text-accent transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {s.email}
          </a>
        </td>
        <td className="px-5 py-4 text-muted-foreground">{s.phone}</td>
        <td className="px-5 py-4 text-muted-foreground">
          {s.projectType ? PROJECT_LABELS[s.projectType] ?? s.projectType : "—"}
        </td>
        <td className="px-5 py-4 text-muted-foreground">
          {s.budget ? BUDGET_LABELS[s.budget] ?? s.budget : "—"}
        </td>
        <td className="px-5 py-4 text-muted-foreground text-xs">
          {new Date(s.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </td>
        <td className="px-5 py-4 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </td>
      </tr>

      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={9} className="p-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-5 bg-muted/10 border-b border-border">
                  {/* Detail grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    {s.location && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Location</p>
                        <p className="text-sm text-foreground">{s.location}</p>
                      </div>
                    )}
                    {s.timeline && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Timeline</p>
                        <p className="text-sm text-foreground">{TIMELINE_LABELS[s.timeline] ?? s.timeline}</p>
                      </div>
                    )}
                    {s.budget && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Budget</p>
                        <p className="text-sm text-foreground">{BUDGET_LABELS[s.budget] ?? s.budget}</p>
                      </div>
                    )}
                    {s.projectType && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Service</p>
                        <p className="text-sm text-foreground">{PROJECT_LABELS[s.projectType] ?? s.projectType}</p>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="mb-1">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Message</p>
                    <div className="rounded-sm border border-border bg-background px-4 py-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{s.message}</p>
                    </div>
                  </div>

                  {/* Comments */}
                  <CommentsPanel submissionId={s.id} />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AdminPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  const params = { type: filter, page, limit };

  const { data: submissions, isLoading } = useGetSubmissions(params, {
    query: { queryKey: getGetSubmissionsQueryKey(params) },
  });

  const { data: stats } = useGetSubmissionStats({
    query: { queryKey: getGetSubmissionStatsQueryKey() },
  });

  const totalPages = submissions ? Math.ceil(submissions.total / limit) : 1;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-foreground py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-background">Admin Dashboard</h1>
          <p className="text-background/50 mt-2">Suvana Constructions — Form Submissions</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {[
            {
              icon: Users,
              label: "Total Contacts",
              value: stats?.totalContacts ?? "—",
              color: "text-blue-600 bg-blue-50",
            },
            {
              icon: FileText,
              label: "Total Quotes",
              value: stats?.totalQuotes ?? "—",
              color: "text-accent bg-accent/10",
            },
            {
              icon: Calendar,
              label: "Last 30 Days",
              value: stats?.recentSubmissions ?? "—",
              color: "text-green-600 bg-green-50",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <motion.div key={label} variants={fadeUp} className="bg-background rounded-sm border border-border p-6">
              <div className={`w-10 h-10 rounded-sm flex items-center justify-center mb-3 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-display text-3xl font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Project Type Breakdown */}
        {stats?.byProjectType && stats.byProjectType.length > 0 && (
          <motion.div
            className="bg-background rounded-sm border border-border p-6 mb-8"
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <h3 className="font-semibold text-foreground mb-4">Quotes by Project Type</h3>
            <div className="flex flex-wrap gap-2">
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

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter:</span>
          {(["all", "contact", "quote"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`rounded-sm px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-foreground hover:bg-muted/50"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">Click any row to expand</span>
        </div>

        {/* Table */}
        <div className="bg-background rounded-sm border border-border overflow-hidden">
          {isLoading ? (
            <div className="py-24 text-center text-muted-foreground text-sm">Loading submissions…</div>
          ) : !submissions?.submissions.length ? (
            <div className="py-24 text-center text-muted-foreground text-sm">No submissions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-5 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.submissions.map((s) => (
                    <SubmissionRow key={s.id} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {submissions && submissions.total > limit && (
            <div className="border-t border-border px-5 py-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {(page - 1) * limit + 1}–{Math.min(page * limit, submissions.total)} of {submissions.total} submissions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-sm border border-border p-1.5 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-foreground font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-sm border border-border p-1.5 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
