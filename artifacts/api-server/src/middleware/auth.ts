import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env["ADMIN_JWT_SECRET"] ?? "";

if (!JWT_SECRET) {
  logger.warn(
    "ADMIN_JWT_SECRET is not set — admin tokens will use an empty secret. Set this env var in production."
  );
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TokenPayload {
  username: string;
  exp: number;
}

export function createAdminToken(username: string): string {
  const payload: TokenPayload = { username, exp: Date.now() + TOKEN_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64url");

  // Constant-time comparison — pads to same length to avoid length leak
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString()
    ) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
