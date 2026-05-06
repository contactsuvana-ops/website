import { Router } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

// Admin credentials - in production, these should be stored in environment variables
// For added security, consider storing hashed credentials in a database
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

logger.info({ ADMIN_USERNAME, ADMIN_PASSWORD }, "Admin credentials loaded");

/**
 * POST /api/admin/authenticate
 * Validates admin credentials
 */
router.post("/authenticate", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
      return;
    }

    // Basic validation - in production use constant-time comparison
    const isValid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    if (!isValid) {
      // Log failed attempts (optional - for security monitoring)
      logger.warn({ username }, "Failed admin authentication attempt");
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Generate a session token (optional - for enhanced security)
    const sessionToken = crypto.randomBytes(32).toString("hex");

    logger.info({ username }, "Successful admin authentication");

    res.json({
      success: true,
      message: "Authentication successful",
      token: sessionToken,
    });
  } catch (error) {
    logger.error({ error }, "Admin authentication error");
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
