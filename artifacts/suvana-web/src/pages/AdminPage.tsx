import { useState } from "react";
import { motion } from "framer-motion";
import { useGetSubmissions, useGetSubmissionStats, getGetSubmissionsQueryKey, getGetSubmissionStatsQueryKey } from "@workspace/api-client-react";
import { Users, FileText, Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type FilterType = "all" | "contact" | "quote";

const PROJECT_LABELS: Record<string, string> = {
  "general-construction": "General Construction",
  handyman: "Handyman",
  remodeling: "Remodeling",
  roofing: "Roofing",
  painting: "Painting",
  flooring: "Flooring",
  electrical: "Electrical",
  plumbing: "Plumbing",
  landscaping: "Landscaping",
  other: "Other",
};

const BUDGET_LABELS: Record<string, string> = {
  "under-5k": "< $5K",
  "5k-15k": "$5K–$15K",
  "15k-50k": "$15K–$50K",
  "50k-100k": "$50K–$100K",
  "over-100k": "> $100K",
  "not-sure": "Not sure",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

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
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-sm px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-foreground hover:bg-muted/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-background rounded-sm border border-border overflow-hidden">
          {isLoading ? (
            <div className="py-24 text-center text-muted-foreground text-sm">Loading submissions...</div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-muted-foreground font-mono text-xs">#{s.id}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold ${
                          s.type === "quote"
                            ? "bg-accent/15 text-accent"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {s.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">{s.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <a href={`mailto:${s.email}`} className="hover:text-accent transition-colors">{s.email}</a>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{s.phone}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.projectType ? PROJECT_LABELS[s.projectType] ?? s.projectType : "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {s.budget ? BUDGET_LABELS[s.budget] ?? s.budget : "—"}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
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
                <span className="text-foreground font-medium">{page} / {totalPages}</span>
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
