import { Router, type IRouter } from "express";
import { z } from "zod";
import { getSiteConfigRepository } from "../db";
import { logger } from "../lib/logger";

export const siteConfigPublicRouter: IRouter = Router();
export const siteConfigAdminRouter: IRouter = Router();

const DEFAULTS = {
  phone: "(302) 844-8097",
  email: "contactsuvana@gmail.com",
  serviceArea: "Proudly serving the New Castle, DE area",
  address: "",
  hours: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
};

siteConfigPublicRouter.get("/", async (_req, res): Promise<void> => {
  try {
    const data = await getSiteConfigRepository().getContact();
    res.json(data ?? DEFAULTS);
  } catch (error) {
    logger.error({ error }, "Error fetching site config");
    res.status(500).json({ error: "Internal server error" });
  }
});

const UpdateContactBody = z.object({
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  serviceArea: z.string().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

siteConfigAdminRouter.get("/", async (_req, res): Promise<void> => {
  try {
    const data = await getSiteConfigRepository().getContact();
    res.json(data ?? DEFAULTS);
  } catch (error) {
    logger.error({ error }, "Error fetching site config");
    res.status(500).json({ error: "Internal server error" });
  }
});

siteConfigAdminRouter.put("/", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateContactBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getSiteConfigRepository().updateContact(parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating site config");
    res.status(500).json({ error: "Internal server error" });
  }
});
