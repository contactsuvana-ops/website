import { Router, type IRouter } from "express";
import {
  getCatalogCategoriesRepository,
  getCatalogItemsRepository,
} from "../db";
import {
  CreateCatalogCategoryBody,
  UpdateCatalogCategoryBody,
  CreateCatalogItemBody,
  UpdateCatalogItemBody,
  GetCatalogItemsQuery,
} from "../validation";
import { logger } from "../lib/logger";

export const catalogRouter: IRouter = Router();

// ─── Categories ───────────────────────────────────────────────────────────────

catalogRouter.get("/categories", async (_req, res): Promise<void> => {
  try {
    const items = await getCatalogCategoriesRepository().listCategories();
    res.json(items);
  } catch (error) {
    logger.error({ error }, "Error listing catalog categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.post("/categories", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCatalogCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const category = await getCatalogCategoriesRepository().createCategory(parsed.data);
    res.status(201).json(category);
  } catch (error) {
    logger.error({ error }, "Error creating catalog category");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.put("/categories/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCatalogCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await getCatalogCategoriesRepository().updateCategory(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating catalog category");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.delete("/categories/:id", async (req, res): Promise<void> => {
  try {
    await getCatalogCategoriesRepository().deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting catalog category");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Items ────────────────────────────────────────────────────────────────────

catalogRouter.get("/items", async (req, res): Promise<void> => {
  try {
    const parsed = GetCatalogItemsQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const items = await getCatalogItemsRepository().listItems(parsed.data);
    res.json({ items });
  } catch (error) {
    logger.error({ error }, "Error listing catalog items");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.get("/items/:id", async (req, res): Promise<void> => {
  try {
    const item = await getCatalogItemsRepository().getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Catalog item not found" });
      return;
    }
    res.json(item);
  } catch (error) {
    logger.error({ error }, "Error fetching catalog item");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.post("/items", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCatalogItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const item = await getCatalogItemsRepository().createItem({
      ...parsed.data,
      tags: parsed.data.tags ?? [],
      createdBy: "admin",
    });
    res.status(201).json(item);
  } catch (error) {
    logger.error({ error }, "Error creating catalog item");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.put("/items/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCatalogItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const repo = getCatalogItemsRepository();
    const existing = await repo.getItem(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Catalog item not found" });
      return;
    }
    await repo.updateItem(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating catalog item");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.post("/items/:id/archive", async (req, res): Promise<void> => {
  try {
    const repo = getCatalogItemsRepository();
    const existing = await repo.getItem(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Catalog item not found" });
      return;
    }
    await repo.archiveItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error archiving catalog item");
    res.status(500).json({ error: "Internal server error" });
  }
});

catalogRouter.post("/items/:id/duplicate", async (req, res): Promise<void> => {
  try {
    const item = await getCatalogItemsRepository().duplicateItem(req.params.id);
    res.status(201).json(item);
  } catch (error) {
    logger.error({ error }, "Error duplicating catalog item");
    res.status(500).json({ error: "Internal server error" });
  }
});
