import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
  Database,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface Service {
  id: string;
  title: string;
  tag: string;
  desc: string;
  bullets: string[];
  mediaUrl: string;
  mediaType: "image" | "video";
  mediaItems: MediaItem[];
  order: number;
}

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

// ─── MediaItemRow ──────────────────────────────────────────────────────────────

function MediaItemRow({
  item,
  index,
  total,
  onChange,
  onRemove,
}: {
  item: MediaItem;
  index: number;
  total: number;
  onChange: (item: MediaItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-shrink-0 mt-2 text-muted-foreground/30">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
        <input
          type="url"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          placeholder="https://…"
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as "image" | "video" })}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </div>
      {/* Thumbnail preview */}
      {item.url && (
        <div className="w-12 h-9 rounded-sm overflow-hidden border border-border bg-muted flex-shrink-0 mt-0.5">
          {item.type === "video" ? (
            <video key={item.url} src={item.url} muted className="w-full h-full object-cover" />
          ) : (
            <img key={item.url} src={item.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <button
        onClick={onRemove}
        disabled={total <= 1}
        className="flex-shrink-0 mt-2 text-muted-foreground/40 hover:text-red-500 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── ServiceEditRow ────────────────────────────────────────────────────────────

function ServiceEditRow({ service, onSaved }: { service: Service; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initItems = (): MediaItem[] =>
    service.mediaItems?.length
      ? service.mediaItems
      : [{ url: service.mediaUrl, type: service.mediaType }];

  const [title, setTitle] = useState(service.title);
  const [tag, setTag] = useState(service.tag);
  const [desc, setDesc] = useState(service.desc);
  const [bulletsText, setBulletsText] = useState(service.bullets.join("\n"));
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initItems);

  function resetForm() {
    setTitle(service.title);
    setTag(service.tag);
    setDesc(service.desc);
    setBulletsText(service.bullets.join("\n"));
    setMediaItems(initItems());
    setError(null);
    setSuccess(false);
  }

  function updateItem(i: number, updated: MediaItem) {
    setMediaItems((prev) => prev.map((m, j) => (j === i ? updated : m)));
  }

  function removeItem(i: number) {
    setMediaItems((prev) => prev.filter((_, j) => j !== i));
  }

  function addItem() {
    setMediaItems((prev) => [...prev, { url: "", type: "image" }]);
  }

  async function handleSave() {
    const bullets = bulletsText
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    const validItems = mediaItems.filter((m) => m.url.trim());

    if (!title || !tag || !desc || bullets.length === 0) {
      setError("Title, tag, description, and at least one bullet are required.");
      return;
    }
    if (validItems.length === 0) {
      setError("At least one media URL is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await adminFetch(`/admin/services/${service.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          tag,
          desc,
          bullets,
          mediaItems: validItems,
          order: service.order,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to save.");
        return;
      }

      setMediaItems(validItems);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const previewItem = mediaItems.find((m) => m.url) ?? { url: service.mediaUrl, type: service.mediaType };

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
        onClick={() => {
          setExpanded((v) => !v);
          if (expanded) resetForm();
        }}
      >
        <div className="w-14 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
          {previewItem.type === "video" ? (
            <video src={previewItem.url} muted className="w-full h-full object-cover" />
          ) : (
            <img src={previewItem.url} alt={service.title} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{service.title}</p>
          <p className="text-xs text-muted-foreground truncate">{service.tag}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {(service.mediaItems?.length ?? 1)} media
          </span>
          <span className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border bg-muted/10 px-5 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Tag / Subtitle</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                  Bullet Points <span className="normal-case font-normal text-muted-foreground">(one per line)</span>
                </label>
                <textarea
                  value={bulletsText}
                  onChange={(e) => setBulletsText(e.target.value)}
                  rows={5}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none font-mono"
                />
              </div>

              {/* Multi-media editor */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  Media <span className="normal-case font-normal text-muted-foreground">— multiple items will slideshow</span>
                </label>
                <div className="space-y-2">
                  {mediaItems.map((item, i) => (
                    <MediaItemRow
                      key={i}
                      item={item}
                      index={i}
                      total={mediaItems.length}
                      onChange={(updated) => updateItem(i, updated)}
                      onRemove={() => removeItem(i)}
                    />
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add media
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-foreground text-background text-sm font-semibold px-5 py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {success ? (
                    <><Check className="h-4 w-4 text-green-400" /> Saved</>
                  ) : saving ? (
                    "Saving…"
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  onClick={() => { setExpanded(false); resetForm(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AdminServicesPage ────────────────────────────────────────────────────────

export default function AdminServicesPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const { data: services, isLoading, refetch } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/services`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await adminFetch("/admin/services/seed", { method: "POST" });
      if (res.ok) {
        setSeedMsg("Seeded 10 default services into Firestore.");
        refetch();
      } else {
        setSeedMsg("Seed failed. Check the console.");
      }
    } catch {
      setSeedMsg("Network error during seed.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit titles, descriptions, bullet points, and media. Multiple media items will be shown as a slideshow.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Database className="h-4 w-4" />
          {seeding ? "Seeding…" : "Seed Defaults"}
        </button>
      </div>

      {seedMsg && (
        <p className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded-sm px-4 py-2">
          {seedMsg}
        </p>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading services…</div>
      ) : !services?.length ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No services found in Firestore.{" "}
          <button onClick={handleSeed} className="text-accent underline">Seed defaults</button> to populate them.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <ServiceEditRow key={svc.id} service={svc} onSaved={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
