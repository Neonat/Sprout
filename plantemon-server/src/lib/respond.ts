import type { VercelResponse } from "@vercel/node";
import { AuthError } from "./auth.js";

export function fail(res: VercelResponse, err: unknown) {
  if (err instanceof AuthError) {
    return res.status(401).json({ error: err.message });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal error";
  return res.status(500).json({ error: message });
}
