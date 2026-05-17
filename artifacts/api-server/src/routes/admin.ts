import { Router } from "express";
import crypto from "crypto";
import { AdminAuth } from "../validation";
import { createAdminToken } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "";

if (!ADMIN_PASSWORD) {
  logger.warn("ADMIN_PASSWORD is not set — admin login will be disabled");
}

router.post("/authenticate", async (req, res): Promise<void> => {
  try {
    const parsed = AdminAuth.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const { username, password } = parsed.data;

    const userMatch = crypto.timingSafeEqual(
      Buffer.from(username),
      Buffer.from(ADMIN_USERNAME)
    );
    const passMatch =
      ADMIN_PASSWORD.length > 0 &&
      crypto.timingSafeEqual(
        Buffer.from(password),
        Buffer.from(ADMIN_PASSWORD)
      );

    if (!userMatch || !passMatch) {
      logger.warn({ username }, "Failed admin authentication attempt");
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = createAdminToken(username);
    logger.info({ username }, "Successful admin authentication");

    res.json({ success: true, token });
  } catch (error) {
    logger.error({ error }, "Admin authentication error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
