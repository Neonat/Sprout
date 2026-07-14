import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import type { VercelRequest } from "@vercel/node";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";

/**
 * Verify the Authorization: Bearer <jwt> header against Clerk and return
 * the matching row from our `users` table, creating one on first sight.
 *
 * Throws on missing/invalid token — call sites should catch and 401.
 */
export async function requireUser(req: VercelRequest): Promise<User> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
  const clerkId = payload.sub;
  if (!clerkId) throw new AuthError("Token has no subject");

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.clerkId, clerkId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(schema.users)
    .values({ clerkId })
    .returning();
  return created;
}

export class AuthError extends Error {}
