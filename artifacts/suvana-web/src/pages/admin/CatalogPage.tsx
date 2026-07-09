import { useState } from "react";
import { CONSTRUCTION_UNITS } from "./EstimateBuilderPage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Archive,
  Copy,
  Pencil,
  X,
  Check,
  Tag,
  Layers,
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

interface CatalogCategory {
  id: string;
  name: string;
  parentId?: string | null;
  position: number;
  createdAt: string;
}

interface CatalogItem {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  pricingModel: "fixed" | "unit" | "formula";
  laborUnitPrice: number;
  materialUnitPrice: number;
  defaultMarkupPct: number;
  minimumCharge?: number | null;
  tags: string[];
  notes?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const PRICING_MODEL_LABELS: Record<string, string> = {
  fixed: "Fixed",
  unit: "Per Unit",
  formula: "Formula",
};

// ─── Item Drawer ──────────────────────────────────────────────────────────────

interface ItemDrawerProps {
  item: CatalogItem | null;
  categories: CatalogCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ItemDrawer({ item, categories, onClose, onSaved }: ItemDrawerProps) {
  const isNew = !item;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [pricingModel, setPricingModel] = useState<"fixed" | "unit" | "formula">(item?.pricingModel ?? "unit");
  const [laborUnitPrice, setLaborUnitPrice] = useState(String(item?.laborUnitPrice ?? 0));
  const [materialUnitPrice, setMaterialUnitPrice] = useState(String(item?.materialUnitPrice ?? 0));
  const [defaultMarkupPct, setDefaultMarkupPct] = useState(String(item?.defaultMarkupPct ?? 20));
  const [minimumCharge, setMinimumCharge] = useState(String(item?.minimumCharge ?? ""));
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [tagsText, setTagsText] = useState(item?.tags?.join(", ") ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      unit: unit.trim(),
      pricingModel,
      laborUnitPrice: parseFloat(laborUnitPrice) || 0,
      materialUnitPrice: parseFloat(materialUnitPrice) || 0,
      defaultMarkupPct: parseFloat(defaultMarkupPct) || 20,
      minimumCharge: minimumCharge ? parseFloat(minimumCharge) : null,
      categoryId,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      notes: notes.trim() || null,
      isActive: true,
    };
    try {
      const res = isNew
        ? await adminFetch("/admin/catalog/items", { method: "POST", body: JSON.stringify(body) })
        : await adminFetch(`/admin/catalog/items/${item!.id}`, { method: "PUT", body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to save.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md bg-background border-l border-border flex flex-col h-full overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{isNew ? "New Item" : "Edit Item"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="e.g. Drywall Installation"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {CONSTRUCTION_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Pricing Model</label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value as "fixed" | "unit" | "formula")}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="unit">Per Unit</option>
                <option value="fixed">Fixed</option>
                <option value="formula">Formula</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Labor / Unit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={laborUnitPrice}
                onChange={(e) => setLaborUnitPrice(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Material / Unit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={materialUnitPrice}
                onChange={(e) => setMaterialUnitPrice(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Default Markup %</label>
              <input
                type="number"
                min="0"
                step="1"
                value={defaultMarkupPct}
                onChange={(e) => setDefaultMarkupPct(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Minimum Charge ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minimumCharge}
                onChange={(e) => setMinimumCharge(e.target.value)}
                placeholder="None"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="e.g. interior, drywall, labor"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-semibold py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isNew ? "Create Item" : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery<CatalogCategory[]>({
    queryKey: ["/api/admin/catalog/categories"],
    queryFn: async () => {
      const res = await adminFetch("/admin/catalog/categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await adminFetch("/admin/catalog/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      qc.invalidateQueries({ queryKey: ["/api/admin/catalog/categories"] });
    } finally {
      setSaving(false);
    }
  }

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parentId === id).sort((a, b) => a.position - b.position);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New category name…"
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={handleCreate}
          disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : roots.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No categories yet. Add one above.</div>
      ) : (
        <div className="space-y-1">
          {roots.map((cat) => {
            const children = childrenOf(cat.id);
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-sm border border-border bg-background">
                  <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {children.length > 0 ? `${children.length} sub` : ""}
                  </span>
                </div>
                {children.map((child) => (
                  <div key={child.id} className="ml-6 mt-1 flex items-center gap-3 px-4 py-2.5 rounded-sm border border-border bg-muted/20">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground flex-1">{child.name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

function ItemsTab() {
  const qc = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerItem, setDrawerItem] = useState<CatalogItem | null | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories = [] } = useQuery<CatalogCategory[]>({
    queryKey: ["/api/admin/catalog/categories"],
    queryFn: async () => {
      const res = await adminFetch("/admin/catalog/categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: itemsData, isLoading } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["/api/admin/catalog/items", selectedCategoryId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
      if (search) params.set("search", search);
      const res = await adminFetch(`/admin/catalog/items?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/admin/catalog/items/${id}/archive`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/catalog/items"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/admin/catalog/items/${id}/duplicate`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/catalog/items"] }),
  });

  const toggleCategory = (id: string) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);

  return (
    <div className="flex gap-6">
      {/* Category sidebar */}
      <div className="w-48 flex-shrink-0">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`w-full text-left px-3 py-2 rounded-sm text-sm font-medium mb-1 transition-colors ${
            selectedCategoryId === null ? "bg-foreground text-background" : "text-foreground hover:bg-muted/50"
          }`}
        >
          All Items
        </button>
        {roots.map((cat) => {
          const children = categories.filter((c) => c.parentId === cat.id);
          const isExpanded = expandedCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    selectedCategoryId === cat.id ? "bg-foreground text-background" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  {cat.name}
                </button>
                {children.length > 0 && (
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {isExpanded && children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedCategoryId(child.id)}
                  className={`w-full text-left pl-6 pr-3 py-1.5 rounded-sm text-xs transition-colors ${
                    selectedCategoryId === child.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Items list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="w-full pl-9 pr-3 py-2 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => setDrawerItem(null)}
            className="flex items-center gap-1.5 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-sm hover:bg-foreground/80 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading items…</div>
        ) : !itemsData?.items.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No items found.{" "}
            <button onClick={() => setDrawerItem(null)} className="text-accent underline">Add one</button>
          </div>
        ) : (
          <div className="space-y-2">
            {itemsData.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-sm border border-border bg-background ${
                  !item.isActive ? "opacity-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    {!item.isActive && (
                      <span className="text-[10px] rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground font-medium">Archived</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{PRICING_MODEL_LABELS[item.pricingModel]}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      L: ${item.laborUnitPrice} / M: ${item.materialUnitPrice}
                    </span>
                    {item.tags.length > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" />
                          {item.tags.slice(0, 2).join(", ")}
                          {item.tags.length > 2 && ` +${item.tags.length - 2}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setDrawerItem(item)}
                    className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => duplicateMutation.mutate(item.id)}
                    disabled={duplicateMutation.isPending}
                    className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => archiveMutation.mutate(item.id)}
                    disabled={archiveMutation.isPending}
                    className={`p-1.5 rounded-sm transition-colors ${
                      item.isActive
                        ? "hover:bg-red-50 text-muted-foreground hover:text-red-600"
                        : "hover:bg-green-50 text-muted-foreground hover:text-green-600"
                    }`}
                    title={item.isActive ? "Archive" : "Restore"}
                  >
                    {item.isActive ? <Archive className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item drawer */}
      <AnimatePresence>
        {drawerItem !== undefined && (
          <ItemDrawer
            item={drawerItem}
            categories={categories}
            onClose={() => setDrawerItem(undefined)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["/api/admin/catalog/items"] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CatalogPage ──────────────────────────────────────────────────────────────

type CatalogTab = "categories" | "items";

export default function CatalogPage() {
  const [tab, setTab] = useState<CatalogTab>("items");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Catalog</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your pricing items and categories</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { id: "items" as CatalogTab, label: "Items" },
          { id: "categories" as CatalogTab, label: "Categories" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "items" ? <ItemsTab /> : <CategoriesTab />}
    </div>
  );
}
