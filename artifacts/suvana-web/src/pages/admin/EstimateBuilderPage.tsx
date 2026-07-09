import { useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getAdminToken } from "@/hooks/use-admin-auth";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Send,
  Save,
  X,
  Search,
  Star,
  FileText,
  Check,
  ArrowRight,
  FolderOpen,
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

interface EstimateDoc {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  projectAddress?: string | null;
  description?: string | null;
  status: string;
  taxRate: number;
  markupPct: number;
  depositPct: number;
  discountAmount?: number | null;
  validUntil?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SectionDoc {
  id: string;
  estimateId: string;
  title: string;
  position: number;
  notes?: string | null;
}

interface LineItemDoc {
  id: string;
  estimateId: string;
  sectionId: string;
  catalogItemId?: string | null;
  description: string;
  qty: number;
  unit: string;
  laborUnitPrice: number;
  materialUnitPrice: number;
  markupPct: number;
  discountPct?: number | null;
  isOptional: boolean;
  isVisibleToCustomer: boolean;
  notes?: string | null;
  position: number;
  lineTotal?: number;
  lineSubtotal?: number;
}

interface EstimateTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  markupAmount: number;
  grandTotal: number;
  depositAmount: number;
}

interface CatalogItem {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  laborUnitPrice: number;
  materialUnitPrice: number;
  defaultMarkupPct: number;
  isActive: boolean;
}

interface CatalogCategory {
  id: string;
  name: string;
  parentId?: string | null;
  position: number;
}

interface EstimateData {
  estimate: EstimateDoc;
  sections: SectionDoc[];
  items: LineItemDoc[];
  acceptedAt?: string | null;
  acceptedOptionalIds?: string[] | null;
}

export const CONSTRUCTION_UNITS = [
  { value: "", label: "—" },
  { value: "ea", label: "Each (ea)" },
  { value: "sqft", label: "Sq Ft" },
  { value: "lnft", label: "Lin Ft" },
  { value: "hr", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "lb", label: "Lb" },
  { value: "ton", label: "Ton" },
  { value: "cy", label: "Cu Yd" },
  { value: "bag", label: "Bag" },
  { value: "roll", label: "Roll" },
  { value: "sheet", label: "Sheet" },
  { value: "box", label: "Box" },
  { value: "gal", label: "Gallon" },
  { value: "set", label: "Set" },
  { value: "lot", label: "Lot" },
  { value: "job", label: "Job" },
];

const STATUS_COLORS: Record<string, string> = {
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

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  ) as T;
}

// ─── Sortable Line Item ───────────────────────────────────────────────────────

function SortableLineItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: LineItemDoc;
  onUpdate: (id: string, patch: Partial<LineItemDoc>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "line-item", sectionId: item.sectionId },
  });

  // Local state so inputs don't re-render on every server refetch
  const [desc, setDesc] = useState(item.description);
  const [qty, setQty] = useState(item.qty);
  const [unit, setUnit] = useState(item.unit);
  const [labor, setLabor] = useState(item.laborUnitPrice);
  const [material, setMaterial] = useState(item.materialUnitPrice);
  const [markup, setMarkup] = useState(item.markupPct);

  // Compute total locally so the row reflects changes before the server responds
  const lineTotal =
    qty * (labor + material) * (1 + markup / 100) * (1 - ((item.discountPct ?? 0) / 100));

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="py-2 border-b border-border last:border-0">
      {/* Row 1: main fields + delete */}
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 grid grid-cols-12 gap-1.5 items-center">
          {/* Description — col 1-3 */}
          <div className="col-span-3">
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => { if (desc !== item.description) onUpdate(item.id, { description: desc }); }}
              className="w-full text-sm text-foreground bg-transparent border-0 border-b border-transparent focus:border-border focus:outline-none pb-0.5 placeholder:text-muted-foreground"
              placeholder="Description"
            />
          </div>

          {/* Qty — col 5 */}
          <div className="col-span-1">
            <input
              type="number"
              min="0"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              onBlur={() => { if (qty !== item.qty) onUpdate(item.id, { qty }); }}
              className="w-full text-sm text-right text-foreground bg-transparent border-b border-transparent focus:border-border focus:outline-none pb-0.5"
            />
          </div>

          {/* Unit — col 6 */}
          <div className="col-span-1">
            <select
              value={unit}
              onChange={(e) => { setUnit(e.target.value); onUpdate(item.id, { unit: e.target.value }); }}
              className="w-full text-xs text-muted-foreground bg-background border border-border rounded-sm px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              {CONSTRUCTION_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Labor — col 8 */}
          <div className="col-span-2">
            <div className="relative">
              <span className="absolute left-0 top-0.5 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={labor}
                onChange={(e) => setLabor(parseFloat(e.target.value) || 0)}
                onBlur={() => { if (labor !== item.laborUnitPrice) onUpdate(item.id, { laborUnitPrice: labor }); }}
                className="w-full pl-3 text-sm text-right text-foreground bg-transparent border-b border-transparent focus:border-border focus:outline-none pb-0.5"
              />
            </div>
          </div>

          {/* Material — col 9 */}
          <div className="col-span-2">
            <div className="relative">
              <span className="absolute left-0 top-0.5 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={material}
                onChange={(e) => setMaterial(parseFloat(e.target.value) || 0)}
                onBlur={() => { if (material !== item.materialUnitPrice) onUpdate(item.id, { materialUnitPrice: material }); }}
                className="w-full pl-3 text-sm text-right text-foreground bg-transparent border-b border-transparent focus:border-border focus:outline-none pb-0.5"
              />
            </div>
          </div>

          {/* Markup — col 10 */}
          <div className="col-span-1">
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                onBlur={() => { if (markup !== item.markupPct) onUpdate(item.id, { markupPct: markup }); }}
                className="w-full pr-3 text-sm text-right text-foreground bg-transparent border-b border-transparent focus:border-border focus:outline-none pb-0.5"
              />
              <span className="absolute right-0 top-0.5 text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Total — col 11-12 */}
          <div className="col-span-2 text-right">
            <p className="text-sm font-semibold text-foreground">${fmt(lineTotal)}</p>
          </div>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          className="flex-shrink-0 p-1 rounded-sm hover:text-red-600 text-muted-foreground/30 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Row 2: visibility + optional toggles */}
      <div className="flex items-center gap-2 mt-1 pl-6">
        <button
          onClick={() => onUpdate(item.id, { isVisibleToCustomer: !item.isVisibleToCustomer })}
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors ${
            item.isVisibleToCustomer
              ? "border-border text-muted-foreground hover:text-foreground"
              : "border-amber-200 bg-amber-50 text-amber-600"
          }`}
        >
          {item.isVisibleToCustomer ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{item.isVisibleToCustomer ? "Visible" : "Hidden"}</span>
        </button>
        <button
          onClick={() => onUpdate(item.id, { isOptional: !item.isOptional })}
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors ${
            item.isOptional
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Optional</span>
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  section,
  items,
  onUpdateSection,
  onDeleteSection,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: {
  section: SectionDoc;
  items: LineItemDoc[];
  onUpdateSection: (id: string, patch: Partial<SectionDoc>) => void;
  onDeleteSection: (id: string) => void;
  onUpdateItem: (id: string, patch: Partial<LineItemDoc>) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (sectionId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(section.title);
  const sectionTotal = items.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: section.id,
    data: { type: "section", sectionId: section.id },
  });

  return (
    <div className="bg-background rounded-sm border border-border overflow-hidden mb-3">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-muted/20 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {editingTitle ? (
          <input
            type="text"
            autoFocus
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (localTitle !== section.title) onUpdateSection(section.id, { title: localTitle });
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-semibold text-foreground bg-transparent border-b border-accent focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-foreground hover:text-accent transition-colors cursor-text"
            onClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
          >
            {section.title}
          </span>
        )}

        <span className="text-xs text-muted-foreground">{items.length} items</span>
        <span className="text-sm font-semibold text-foreground">${fmt(sectionTotal)}</span>

        <button
          onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
          className="p-1 rounded-sm hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors"
          title="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              ref={setDropRef}
              className={`px-4 pt-1 pb-2 transition-colors ${isDropOver ? "bg-accent/5 ring-1 ring-accent/30 ring-inset" : ""}`}
            >
              {/* Column headers — mirrors exact flex structure of SortableLineItem row 1 */}
              {items.length > 0 && (
                <div className="flex items-center gap-2 pb-1 border-b border-border/50 mb-1">
                  <GripVertical className="h-4 w-4 invisible flex-shrink-0" />
                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-1.5">
                    <div className="col-span-3 text-[10px] uppercase tracking-wider text-muted-foreground">Description</div>
                    <div className="col-span-1 text-[10px] uppercase tracking-wider text-muted-foreground text-right">Qty</div>
                    <div className="col-span-1 text-[10px] uppercase tracking-wider text-muted-foreground">Unit</div>
                    <div className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground text-right">Labor/u</div>
                    <div className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground text-right">Mat/u</div>
                    <div className="col-span-1 text-[10px] uppercase tracking-wider text-muted-foreground text-right">Markup</div>
                    <div className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground text-right">Total</div>
                  </div>
                  {/* right spacer: matches trash button */}
                  <div className="invisible flex-shrink-0 p-1"><Trash2 className="h-3.5 w-3.5" /></div>
                </div>
              )}

              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableLineItem
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    onDelete={onDeleteItem}
                  />
                ))}
              </SortableContext>

              {items.length === 0 && (
                <p className={`py-4 text-center text-xs transition-colors ${isDropOver ? "text-accent font-medium" : "text-muted-foreground"}`}>
                  {isDropOver ? "Release to add item" : "Drop catalog items here or add manually"}
                </p>
              )}

              <button
                onClick={() => onAddItem(section.id)}
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add item manually
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Catalog Panel ────────────────────────────────────────────────────────────

function CatalogPanel({ onDragStart }: { onDragStart?: () => void }) {
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("catalog_favorites") ?? "[]")); }
    catch { return new Set(); }
  });

  const { data: categories = [] } = useQuery<CatalogCategory[]>({
    queryKey: ["/api/admin/catalog/categories"],
    queryFn: async () => {
      const res = await adminFetch("/admin/catalog/categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: itemsData } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["/api/admin/catalog/items/all", search],
    queryFn: async () => {
      const params = new URLSearchParams({ isActive: "true" });
      if (search) params.set("search", search);
      const res = await adminFetch(`/admin/catalog/items?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const allItems = itemsData?.items ?? [];

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("catalog_favorites", JSON.stringify([...next]));
      return next;
    });
  }

  function toggleCat(id: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.position - b.position);
  const filtered = search ? allItems : null;
  const favItems = allItems.filter((i) => favorites.has(i.id));

  return (
    <div className="h-full flex flex-col overflow-hidden border-r border-border">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Catalog</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-8 pr-3 py-1.5 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered ? (
          <div className="p-2">
            {filtered.map((item) => (
              <DraggableCatalogItem key={item.id} item={item} isFavorite={favorites.has(item.id)} onToggleFavorite={toggleFavorite} />
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">No items found.</p>
            )}
          </div>
        ) : (
          <>
            {favItems.length > 0 && (
              <div className="p-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-1">Favorites</p>
                {favItems.map((item) => (
                  <DraggableCatalogItem key={item.id} item={item} isFavorite={true} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            )}
            {roots.map((cat) => {
              const catItems = allItems.filter((i) => i.categoryId === cat.id);
              const isExpanded = expandedCats.has(cat.id);
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {cat.name.toUpperCase()}
                    <span className="ml-auto">{catItems.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-2 pb-1">
                      {catItems.map((item) => (
                        <DraggableCatalogItem key={item.id} item={item} isFavorite={favorites.has(item.id)} onToggleFavorite={toggleFavorite} />
                      ))}
                      {catItems.length === 0 && (
                        <p className="py-2 text-center text-xs text-muted-foreground">No items in this category.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function DraggableCatalogItem({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: CatalogItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${item.id}`,
    data: { type: "catalog", catalogItem: item },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 rounded-sm cursor-grab active:cursor-grabbing hover:bg-muted/30 transition-colors group ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {item.unit} · L${item.laborUnitPrice} / M${item.materialUnitPrice}
        </p>
      </div>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
        className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${
          isFavorite ? "text-amber-400" : "text-muted-foreground/40 hover:text-amber-400"
        }`}
      >
        <Star className="h-3 w-3" fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

// ─── Accepted Estimate (read-only) ───────────────────────────────────────────

function AcceptedEstimateView({
  estimate,
  sections,
  items,
  acceptedAt,
  acceptedOptionalIds,
}: {
  estimate: EstimateDoc;
  sections: SectionDoc[];
  items: LineItemDoc[];
  acceptedAt: string | null;
  acceptedOptionalIds: string[];
}) {
  const [, navigate] = useLocation();
  const acceptedSet = new Set(acceptedOptionalIds);

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/admin/estimates/${estimate.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to convert");
      return res.json() as Promise<{ projectId: string }>;
    },
    onSuccess: (result) => {
      navigate(`/admin/projects/${result.projectId}`);
    },
  });
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);

  const acceptedItems = items.filter(
    (i) => i.isVisibleToCustomer && (!i.isOptional || acceptedSet.has(i.id))
  );
  const subtotal = acceptedItems.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  const discountAmt = estimate.discountAmount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const taxAmt = afterDiscount * (estimate.taxRate / 100);
  const grandTotal = afterDiscount + taxAmt;
  const depositAmt = grandTotal * (estimate.depositPct / 100);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Center workspace */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Back + status */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate("/admin/estimates")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Estimates
            </button>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Accepted
            </span>
            {acceptedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(acceptedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground mb-1">{estimate.title}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>{estimate.customerName}</span>
              {estimate.customerEmail && <span>{estimate.customerEmail}</span>}
              {estimate.customerPhone && <span>{estimate.customerPhone}</span>}
              {estimate.projectAddress && <span>{estimate.projectAddress}</span>}
            </div>
          </div>

          {/* Sections */}
          {sortedSections.map((section) => {
            const sectionItems = items
              .filter((i) => i.sectionId === section.id)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={section.id} className="mb-4 border border-border rounded-sm overflow-hidden">
                <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5">
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  <span className="text-xs text-muted-foreground">
                    ${fmt(
                      sectionItems
                        .filter((i) => i.isVisibleToCustomer && (!i.isOptional || acceptedSet.has(i.id)))
                        .reduce((s, i) => s + (i.lineTotal ?? 0), 0)
                    )}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {sectionItems.map((item) => {
                    const included = !item.isOptional || acceptedSet.has(item.id);
                    const isOptionalDeclined = item.isOptional && !acceptedSet.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 px-4 py-2.5 ${isOptionalDeclined ? "opacity-40" : ""}`}
                      >
                        {item.isOptional && (
                          <Check
                            className={`h-3.5 w-3.5 flex-shrink-0 ${included ? "text-green-600" : "text-muted-foreground/30"}`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-foreground ${isOptionalDeclined ? "line-through" : ""}`}>
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.qty} {item.unit}
                            {item.isOptional && (
                              <span className={`ml-2 font-medium text-[11px] ${included ? "text-green-600" : "text-muted-foreground"}`}>
                                {included ? "Optional · Included" : "Optional · Not included"}
                              </span>
                            )}
                          </p>
                        </div>
                        {item.isVisibleToCustomer && !isOptionalDeclined && (
                          <span className="text-sm font-semibold text-foreground flex-shrink-0">
                            ${fmt(item.lineTotal ?? 0)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <EstimateCommentsPanel estimateId={estimate.id} />
        </div>
      </div>

      {/* Right: Accepted totals */}
      <div className="w-64 flex-shrink-0 border-l border-border overflow-y-auto">
        <div className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Accepted Totals</h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">${fmt(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-red-600">–${fmt(discountAmt)}</span>
              </div>
            )}
            {taxAmt > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax ({estimate.taxRate}%)</span>
                <span className="font-medium text-foreground">${fmt(taxAmt)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Grand Total</span>
              <span className="text-lg font-bold text-foreground">${fmt(grandTotal)}</span>
            </div>
            {depositAmt > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Deposit ({estimate.depositPct}%)</span>
                <span className="text-sm font-semibold text-foreground">${fmt(depositAmt)}</span>
              </div>
            )}
          </div>

          {acceptedAt && (
            <div className="rounded-sm bg-green-50 border border-green-200 px-3 py-2.5 mb-3">
              <p className="text-xs font-semibold text-green-700 mb-0.5">Accepted</p>
              <p className="text-xs text-green-600">
                {new Date(acceptedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}

          {estimate.status === "converted_to_project" ? (
            <button
              onClick={() => navigate(`/admin/projects`)}
              className="w-full flex items-center justify-center gap-2 bg-muted text-foreground text-xs font-semibold px-3 py-2 rounded-sm hover:bg-muted/80 transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              View Project
            </button>
          ) : (
            <button
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background text-xs font-semibold px-3 py-2 rounded-sm hover:bg-foreground/80 transition-colors disabled:opacity-50"
            >
              {convertMutation.isPending ? (
                <span>Converting…</span>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Convert to Project
                </>
              )}
            </button>
          )}
          {convertMutation.isError && (
            <p className="text-xs text-red-600 mt-2 text-center">Conversion failed. Try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Estimate Comments Panel ──────────────────────────────────────────────────

interface EstimateComment {
  id: string;
  content: string;
  createdBy: string;
  source: "manual" | "carried_over";
  createdAt: string;
}

function EstimateCommentsPanel({ estimateId }: { estimateId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments = [], isLoading, isError } = useQuery<EstimateComment[]>({
    queryKey: ["/api/admin/estimates", estimateId, "comments"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/estimates/${estimateId}/comments`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!estimateId,
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await adminFetch(`/admin/estimates/${estimateId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", estimateId, "comments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await adminFetch(`/admin/estimates/${estimateId}/comments/${commentId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/estimates", estimateId, "comments"] }),
  });

  return (
    <div className="border-t border-border pt-5 mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Internal Notes {comments.length > 0 ? `(${comments.length})` : ""}
      </h3>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-1">Loading…</p>
      ) : isError ? (
        <p className="text-xs text-red-500 py-1">Could not load notes. The database index may still be building — try refreshing in a moment.</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">No notes yet.</p>
      ) : (
        <ul className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <li key={c.id} className="group relative rounded-sm bg-muted/30 border border-border px-3 py-2">
              {c.source === "carried_over" && (
                <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">From prospect</span>
              )}
              <p className="text-xs text-foreground whitespace-pre-wrap break-words pr-5">{c.content}</p>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {new Date(c.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-600 text-muted-foreground/40"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-sm border border-border bg-background overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (text.trim()) addMutation.mutate(text.trim()); }}}
          placeholder="Add a note… (⌘↵)"
          rows={2}
          className="w-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
        />
        <div className="flex justify-end px-3 py-1.5 border-t border-border bg-muted/20">
          <button
            onClick={() => { if (text.trim()) addMutation.mutate(text.trim()); }}
            disabled={!text.trim() || addMutation.isPending}
            className="flex items-center gap-1.5 bg-foreground text-background text-[11px] font-semibold px-3 py-1 rounded-sm hover:bg-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3 w-3" /> Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

function SendModal({
  estimate,
  onClose,
  onSent,
}: {
  estimate: EstimateDoc;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState(estimate.customerEmail ?? "");
  const [message, setMessage] = useState("");
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().substring(0, 10);
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) { setError("Customer email is required."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await adminFetch(`/admin/estimates/${estimate.id}/send`, {
        method: "POST",
        body: JSON.stringify({
          customerEmail: email.trim(),
          message: message.trim() || undefined,
          validUntil: validUntil || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to send.");
        return;
      }
      onSent();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md bg-background rounded-sm border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Send Quote to Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Send To *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal note for the customer…"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-semibold py-2 rounded-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send Quote"}
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

// ─── EstimateBuilderPage ──────────────────────────────────────────────────────

export default function EstimateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showSendModal, setShowSendModal] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "saved">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data, isLoading, error: loadError } = useQuery<EstimateData>({
    queryKey: ["/api/admin/estimates", id],
    queryFn: async () => {
      const res = await adminFetch(`/admin/estimates/${id}`);
      if (!res.ok) throw new Error("Failed to load estimate");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: totalsData } = useQuery<EstimateTotals>({
    queryKey: ["/api/admin/estimates", id, "totals"],
    queryFn: async () => {
      const res = await adminFetch(`/admin/estimates/${id}/totals`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!id,
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async (patch: Partial<EstimateDoc>) => {
      await adminFetch(`/admin/estimates/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] });
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id, "totals"] });
      setSaveIndicator("saved");
      setTimeout(() => setSaveIndicator("idle"), 2000);
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch(`/admin/estimates/${id}/sections`, {
        method: "POST",
        body: JSON.stringify({ title: "New Section" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] }),
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ sectionId, patch }: { sectionId: string; patch: Partial<SectionDoc> }) => {
      await adminFetch(`/admin/estimates/${id}/sections/${sectionId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    // Optimistic update already applied by caller; no refetch needed to avoid mid-type re-renders
    onSuccess: () => {},
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await adminFetch(`/admin/estimates/${id}/sections/${sectionId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] }),
  });

  const addItemMutation = useMutation({
    mutationFn: async (body: Partial<LineItemDoc> & { sectionId: string }) => {
      const res = await adminFetch(`/admin/estimates/${id}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] });
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id, "totals"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, patch }: { itemId: string; patch: Partial<LineItemDoc> }) => {
      await adminFetch(`/admin/estimates/${id}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      // Only refresh totals — the estimate data is already up-to-date via optimistic update
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id, "totals"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await adminFetch(`/admin/estimates/${id}/items/${itemId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] });
      qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id, "totals"] });
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: async (items: { id: string; sectionId: string; position: number }[]) => {
      await adminFetch(`/admin/estimates/${id}/items/reorder`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] }),
  });

  const debouncedUpdateEstimate = useDebounce(
    useCallback(
      (patch: Partial<EstimateDoc>) => {
        setSaveIndicator("saving");
        updateEstimateMutation.mutate(patch);
      },
      [updateEstimateMutation]
    ),
    600
  );

  function handleUpdateItem(itemId: string, patch: Partial<LineItemDoc>) {
    // Optimistic update: apply patch and recompute lineTotal so section subtotals stay live
    qc.setQueryData<EstimateData>(["/api/admin/estimates", id], (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((i) => {
          if (i.id !== itemId) return i;
          const u = { ...i, ...patch };
          u.lineTotal =
            u.qty *
            (u.laborUnitPrice + u.materialUnitPrice) *
            (1 + u.markupPct / 100) *
            (1 - ((u.discountPct ?? 0) / 100));
          return u;
        }),
      };
    });
    updateItemMutation.mutate({ itemId, patch });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || !data) return;

    const activeData = active.data.current as { type: string; sectionId?: string; catalogItem?: CatalogItem } | undefined;
    const overData = over.data.current as { type: string; sectionId?: string } | undefined;

    // Catalog item dropped into a section
    if (activeData?.type === "catalog") {
      const catalogItem = activeData.catalogItem!;
      // overData.sectionId is set by both line-item droppables and section droppable
      const targetSectionId = overData?.sectionId ?? String(over.id);
      const section = data.sections.find((s) => s.id === targetSectionId);
      if (section) {
        addItemMutation.mutate({
          sectionId: section.id,
          description: catalogItem.name,
          qty: 1,
          unit: catalogItem.unit,
          laborUnitPrice: catalogItem.laborUnitPrice,
          materialUnitPrice: catalogItem.materialUnitPrice,
          markupPct: catalogItem.defaultMarkupPct,
          isOptional: false,
          isVisibleToCustomer: true,
          catalogItemId: catalogItem.id,
        });
      }
      return;
    }

    // Line item reorder
    if (activeData?.type === "line-item" && overData?.type === "line-item") {
      const fromSectionId = activeData.sectionId!;
      const toSectionId = overData.sectionId!;
      const allItems = [...data.items];

      const fromIndex = allItems.findIndex((i) => i.id === String(active.id));
      const toIndex = allItems.findIndex((i) => i.id === String(over.id));

      if (fromIndex === -1 || toIndex === -1) return;

      let reordered = arrayMove(allItems, fromIndex, toIndex);
      if (fromSectionId !== toSectionId) {
        reordered = reordered.map((item) =>
          item.id === String(active.id) ? { ...item, sectionId: toSectionId } : item
        );
      }

      // Optimistic update
      qc.setQueryData<EstimateData>(["/api/admin/estimates", id], (old) =>
        old ? { ...old, items: reordered } : old
      );

      // Build per-section ordered arrays
      const sectionIds = new Set(reordered.map((i) => i.sectionId));
      const reorderPayload: { id: string; sectionId: string; position: number }[] = [];
      sectionIds.forEach((sid) => {
        reordered
          .filter((i) => i.sectionId === sid)
          .forEach((item, idx) => {
            reorderPayload.push({ id: item.id, sectionId: sid, position: idx });
          });
      });
      reorderItemsMutation.mutate(reorderPayload);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading estimate…</p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-muted-foreground">Failed to load estimate.</p>
        <button onClick={() => navigate("/admin/estimates")} className="text-sm text-accent underline">
          Back to estimates
        </button>
      </div>
    );
  }

  const { estimate, sections, items, acceptedAt = null, acceptedOptionalIds = null } = data;
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);

  if (estimate.status === "accepted") {
    return (
      <AcceptedEstimateView
        estimate={estimate}
        sections={sections}
        items={items}
        acceptedAt={acceptedAt}
        acceptedOptionalIds={acceptedOptionalIds ?? []}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full overflow-hidden">
        {/* Left: Catalog Panel */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <CatalogPanel />
        </div>

        {/* Center: Estimate Workspace */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Back + status */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => navigate("/admin/estimates")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Estimates
              </button>
              <span className="text-muted-foreground">·</span>
              <span className={`inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[estimate.status] ?? "bg-muted text-muted-foreground"}`}>
                {estimate.status.replace(/_/g, " ")}
              </span>
              {saveIndicator === "saving" && <span className="text-xs text-muted-foreground ml-auto">Saving…</span>}
              {saveIndicator === "saved" && (
                <span className="flex items-center gap-1 text-xs text-green-600 ml-auto">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>

            {/* Estimate header */}
            <div className="mb-6">
              <input
                type="text"
                defaultValue={estimate.title}
                onBlur={(e) => {
                  if (e.target.value !== estimate.title) {
                    debouncedUpdateEstimate({ title: e.target.value });
                  }
                }}
                className="w-full text-xl font-bold text-foreground bg-transparent border-0 border-b-2 border-transparent focus:border-accent focus:outline-none pb-1 mb-2"
              />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>{estimate.customerName}</span>
                {estimate.customerEmail && <span>{estimate.customerEmail}</span>}
                {estimate.customerPhone && <span>{estimate.customerPhone}</span>}
                {estimate.projectAddress && <span>{estimate.projectAddress}</span>}
              </div>
            </div>

            {/* Sections */}
            {sortedSections.map((section) => {
              const sectionItems = items
                .filter((i) => i.sectionId === section.id)
                .sort((a, b) => a.position - b.position);
              return (
                <SectionCard
                  key={section.id}
                  section={section}
                  items={sectionItems}
                  onUpdateSection={(sectionId, patch) => {
                    qc.setQueryData<EstimateData>(["/api/admin/estimates", id], (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        sections: old.sections.map((s) =>
                          s.id === sectionId ? { ...s, ...patch } : s
                        ),
                      };
                    });
                    updateSectionMutation.mutate({ sectionId, patch });
                  }}
                  onDeleteSection={(sectionId) => deleteSectionMutation.mutate(sectionId)}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={(itemId) => deleteItemMutation.mutate(itemId)}
                  onAddItem={(sectionId) =>
                    addItemMutation.mutate({
                      sectionId,
                      description: "New Item",
                      qty: 1,
                      unit: "",
                      laborUnitPrice: 0,
                      materialUnitPrice: 0,
                      markupPct: estimate.markupPct,
                      isOptional: false,
                      isVisibleToCustomer: true,
                    })
                  }
                />
              );
            })}

            <button
              onClick={() => addSectionMutation.mutate()}
              disabled={addSectionMutation.isPending}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-sm px-4 py-3 w-full justify-center hover:bg-muted/20 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Section
            </button>

            <EstimateCommentsPanel estimateId={estimate.id} />
          </div>
        </div>

        {/* Right: Totals + Actions */}
        <div className="w-64 flex-shrink-0 border-l border-border overflow-y-auto">
          <div className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Totals</h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">${fmt(totalsData?.subtotal ?? 0)}</span>
              </div>
              {(totalsData?.discountAmount ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-red-600">–${fmt(totalsData!.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax ({estimate.taxRate}%)</span>
                <span className="font-medium text-foreground">${fmt(totalsData?.taxAmount ?? 0)}</span>
              </div>
            </div>

            <div className="border-t border-border pt-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Grand Total</span>
                <span className="text-lg font-bold text-foreground">${fmt(totalsData?.grandTotal ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Deposit ({estimate.depositPct}%)</span>
                <span className="text-sm font-semibold text-foreground">${fmt(totalsData?.depositAmount ?? 0)}</span>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Tax Rate %</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={estimate.taxRate}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== estimate.taxRate) {
                      debouncedUpdateEstimate({ taxRate: val });
                    }
                  }}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Default Markup %</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={estimate.markupPct}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== estimate.markupPct) {
                      debouncedUpdateEstimate({ markupPct: val });
                    }
                  }}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Deposit %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={estimate.depositPct}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== estimate.depositPct) {
                      debouncedUpdateEstimate({ depositPct: val });
                    }
                  }}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={estimate.discountAmount ?? 0}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (val !== (estimate.discountAmount ?? 0)) {
                      debouncedUpdateEstimate({ discountAmount: val || null });
                    }
                  }}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setSaveIndicator("saving");
                  updateEstimateMutation.mutate({});
                }}
                className="w-full flex items-center justify-center gap-2 border border-border rounded-sm py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Save className="h-4 w-4" /> Save Draft
              </button>

              <button
                onClick={() => setShowSendModal(true)}
                disabled={["accepted", "declined", "expired"].includes(estimate.status)}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-sm py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" /> Send Quote
              </button>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeId.startsWith("catalog-") && (
          <div className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-medium text-foreground shadow-lg opacity-90">
            <FileText className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
            Dropping item…
          </div>
        )}
      </DragOverlay>

      <AnimatePresence>
        {showSendModal && (
          <SendModal
            estimate={estimate}
            onClose={() => setShowSendModal(false)}
            onSent={() => {
              qc.invalidateQueries({ queryKey: ["/api/admin/estimates", id] });
              qc.invalidateQueries({ queryKey: ["/api/admin/estimates"] });
            }}
          />
        )}
      </AnimatePresence>
    </DndContext>
  );
}
