import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/auth";
import { getServicesRepository, type ServiceDoc, type ServiceMediaItem } from "../db";
import { logger } from "../lib/logger";
import type admin from "firebase-admin";

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string {
  if (!ts) return new Date(0).toISOString();
  return ts.toDate().toISOString();
}

function resolveMediaItems(doc: ServiceDoc): ServiceMediaItem[] {
  if (doc.mediaItems && doc.mediaItems.length > 0) return doc.mediaItems;
  return [{ url: doc.mediaUrl, type: doc.mediaType }];
}

function toApiService(doc: ServiceDoc) {
  return { ...doc, updatedAt: tsToIso(doc.updatedAt), mediaItems: resolveMediaItems(doc) };
}

const SEED_SERVICES: Omit<ServiceDoc, "updatedAt">[] = [
  {
    id: "kitchen-remodeling",
    title: "Kitchen Remodeling",
    tag: "Full Kitchen Transformations",
    desc: "The kitchen is the heart of your home — and it should look like it. We handle complete kitchen remodels from layout changes and custom cabinetry to countertops, backsplash, lighting, and plumbing. We work with your style and budget to deliver a kitchen you'll love for years.",
    bullets: ["Custom cabinetry & layout design", "Countertop installation (granite, quartz, butcher block)", "Backsplash tile work", "Appliance hookups", "Lighting & electrical upgrades"],
    mediaUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    mediaType: "image",
    order: 0,
  },
  {
    id: "drywall",
    title: "Drywall",
    tag: "Installation & Repair",
    desc: "Whether you need new drywall hung in a freshly framed space or seamless repairs on existing walls, our crew delivers a finish that paints up perfectly. We handle everything from small patches to full room installs with precision taping, mudding, and sanding.",
    bullets: ["New drywall installation", "Patch & repair (holes, water damage, cracks)", "Tape, mud & sand finish", "Texture matching", "Ceiling drywall"],
    mediaUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    mediaType: "image",
    order: 1,
  },
  {
    id: "plumbing",
    title: "Plumbing",
    tag: "From Drips to Full Installs",
    desc: "Pipe leaks, clogged drains, fixture replacements, water heater installs — our licensed plumbers respond quickly and fix it right the first time. We work on residential and light commercial plumbing with transparency on pricing before any work begins.",
    bullets: ["Pipe repair & replacement", "Fixture installation (sinks, toilets, showers)", "Water heater service & install", "Drain cleaning", "Bathroom & kitchen plumbing"],
    mediaUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
    mediaType: "image",
    order: 2,
  },
  {
    id: "electrical",
    title: "Electrical",
    tag: "Safe & Code-Compliant",
    desc: "Our licensed electricians handle everything from outlet installation to full panel upgrades. All work is code-compliant and inspected, giving you peace of mind that your home's electrical system is safe, modern, and reliable.",
    bullets: ["Panel upgrades & replacements", "Outlet & switch installation", "Lighting fixtures & ceiling fans", "EV charger installation", "Whole-home rewiring"],
    mediaUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    mediaType: "image",
    order: 3,
  },
  {
    id: "flooring",
    title: "Flooring",
    tag: "Every Surface, Done Right",
    desc: "From rustic hardwood to modern luxury vinyl, we install flooring that completes a room. We handle subfloor repair and prep, installation, and finishing with the care that protects your investment for decades.",
    bullets: ["Hardwood installation & refinishing", "Tile & stone (kitchen, bath, entry)", "Luxury vinyl plank (LVP)", "Carpet installation", "Subfloor leveling & repair"],
    mediaUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    mediaType: "image",
    order: 4,
  },
  {
    id: "fireplace",
    title: "Fireplace",
    tag: "Installation & Surround Work",
    desc: "A fireplace transforms any room. We install gas, electric, and wood-burning fireplaces and build custom surrounds — from sleek modern stone to classic craftsman tile — that become the focal point of your living space.",
    bullets: ["Gas & electric fireplace installation", "Wood-burning fireplace builds", "Custom tile & stone surrounds", "Mantel installation", "Fireplace refacing & updates"],
    mediaUrl: "https://firebasestorage.googleapis.com/v0/b/suvana-97279.firebasestorage.app/o/website_media%2Ffireplace.mp4?alt=media&token=4608bd7a-198f-4d7a-ac20-9cfd8a7404d8",
    mediaType: "video",
    order: 5,
  },
  {
    id: "basement",
    title: "Basement",
    tag: "Finishing & Conversion",
    desc: "Your unfinished basement is untapped square footage. We convert raw basement space into livable, comfortable rooms — home offices, gyms, playrooms, in-law suites, or entertainment spaces — with full framing, insulation, drywall, flooring, and electrical.",
    bullets: ["Full basement finishing", "Framing & insulation", "Egress window installation", "Waterproofing coordination", "In-law suite & rental unit conversions"],
    mediaUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    mediaType: "image",
    order: 6,
  },
  {
    id: "painting",
    title: "Painting",
    tag: "Interior & Exterior",
    desc: "Professional painting transforms a space more than almost anything else. Our painters are meticulous — proper surface preparation, quality primer, clean lines, and a durable finish that looks great and holds up over time. Residential and commercial clients welcome.",
    bullets: ["Interior painting (walls, ceilings, trim)", "Exterior painting & staining", "Cabinet refinishing & painting", "Commercial painting", "Deck & fence staining"],
    mediaUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
    mediaType: "image",
    order: 7,
  },
  {
    id: "remodeling",
    title: "Remodeling",
    tag: "Full-Room Renovations",
    desc: "Beyond kitchens, we handle bathrooms, living rooms, additions, and whole-home renovations. Bring us your vision — a layout change, an aging space that needs refreshing, or a new addition — and we'll make it happen with craftsmanship that lasts.",
    bullets: ["Bathroom remodels", "Room additions", "Open floor plan conversions", "Whole-home renovations", "Custom built-ins & millwork"],
    mediaUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    mediaType: "image",
    order: 8,
  },
  {
    id: "handyman",
    title: "Handyman",
    tag: "Repairs & Maintenance",
    desc: "Not every job needs a full crew — but every job deserves quality work. Our handyman team handles the everyday repairs, fixes, and small improvements that keep your home or business running at its best. Fast response, reliable service, fair pricing.",
    bullets: ["Door & window repairs", "Drywall patching & touch-ups", "Fixture installation", "Caulking & weatherstripping", "General home maintenance"],
    mediaUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    mediaType: "image",
    order: 9,
  },
];

// ─── Public router ─────────────────────────────────────────────────────────────

export const servicesPublicRouter: IRouter = Router();

// GET /api/services
servicesPublicRouter.get("/", async (req, res): Promise<void> => {
  try {
    const repo = getServicesRepository();
    const services = await repo.listServices();
    res.json(services.map(toApiService));
  } catch (error) {
    logger.error({ error }, "Error fetching services");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin router ──────────────────────────────────────────────────────────────

export const servicesAdminRouter: IRouter = Router();

// GET /admin/services — same list for the admin UI
servicesAdminRouter.get("/", async (req, res): Promise<void> => {
  try {
    const repo = getServicesRepository();
    const services = await repo.listServices();
    res.json(services.map(toApiService));
  } catch (error) {
    logger.error({ error }, "Error fetching services");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/services/seed — upsert all default services
servicesAdminRouter.post("/seed", async (req, res): Promise<void> => {
  try {
    const repo = getServicesRepository();
    await Promise.all(
      SEED_SERVICES.map(({ id, ...data }) => repo.upsertService(id, data))
    );
    res.json({ success: true, count: SEED_SERVICES.length });
  } catch (error) {
    logger.error({ error }, "Error seeding services");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/services/:id — update a single service
servicesAdminRouter.put("/:id", async (req, res): Promise<void> => {
  try {
    const id = String(req.params["id"]).trim();
    const { title, tag, desc, bullets, mediaItems, order } = req.body as {
      title?: string;
      tag?: string;
      desc?: string;
      bullets?: unknown;
      mediaItems?: unknown;
      order?: number;
    };

    if (!title || !tag || !desc || !Array.isArray(bullets)) {
      res.status(400).json({ error: "title, tag, desc, and bullets (array) are required" });
      return;
    }

    if (
      !Array.isArray(mediaItems) ||
      mediaItems.length === 0 ||
      !(mediaItems as { url?: unknown; type?: unknown }[]).every(
        (m) => typeof m.url === "string" && m.url && ["image", "video"].includes(String(m.type))
      )
    ) {
      res.status(400).json({ error: "mediaItems must be a non-empty array of {url, type}" });
      return;
    }

    const items = (mediaItems as { url: string; type: "image" | "video" }[]);
    const repo = getServicesRepository();
    await repo.updateService(id, {
      title,
      tag,
      desc,
      bullets: bullets as string[],
      mediaUrl: items[0].url,
      mediaType: items[0].type,
      mediaItems: items,
      ...(typeof order === "number" ? { order } : {}),
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating service");
    res.status(500).json({ error: "Internal server error" });
  }
});
