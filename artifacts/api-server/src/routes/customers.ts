import { Router, type IRouter } from "express";
import admin from "firebase-admin";
import { getCustomersRepository, type CustomerDoc } from "../db";
import { CreateCustomerBody, UpdateCustomerBody, GetCustomersQuery } from "../validation";
import { logger } from "../lib/logger";

export const customersRouter: IRouter = Router();

function tsToIso(ts: admin.firestore.Timestamp | undefined | null): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function serializeCustomer(doc: CustomerDoc) {
  return {
    ...doc,
    createdAt: tsToIso(doc.createdAt as admin.firestore.Timestamp),
    updatedAt: tsToIso(doc.updatedAt as admin.firestore.Timestamp),
  };
}

customersRouter.get("/", async (req, res): Promise<void> => {
  try {
    const parsed = GetCustomersQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { status, page, limit } = parsed.data;
    const result = await getCustomersRepository().listCustomers({
      status: status as CustomerDoc["status"] | "all" | undefined,
      page,
      limit,
    });
    res.json({ items: result.items.map(serializeCustomer), total: result.total });
  } catch (error) {
    logger.error({ error }, "Error listing customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

customersRouter.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const customer = await getCustomersRepository().createCustomer(parsed.data);
    res.status(201).json(serializeCustomer(customer));
  } catch (error) {
    logger.error({ error }, "Error creating customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

customersRouter.get("/:id", async (req, res): Promise<void> => {
  try {
    const customer = await getCustomersRepository().getCustomer(req.params.id);
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(serializeCustomer(customer));
  } catch (error) {
    logger.error({ error }, "Error fetching customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

customersRouter.put("/:id", async (req, res): Promise<void> => {
  try {
    const parsed = UpdateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = await getCustomersRepository().getCustomer(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    await getCustomersRepository().updateCustomer(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error updating customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

customersRouter.delete("/:id", async (req, res): Promise<void> => {
  try {
    const existing = await getCustomersRepository().getCustomer(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    await getCustomersRepository().deleteCustomer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting customer");
    res.status(500).json({ error: "Internal server error" });
  }
});
