import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq } from "drizzle-orm";
import { requireUser } from "../../src/lib/auth.js";
import { db, schema } from "../../src/db/client.js";
import { fail } from "../../src/lib/respond.js";

/**
 * PATCH  /api/plants/:id → mutate hp / moves / etc. after a battle
 * DELETE /api/plants/:id → release a plant
 *
 * Ownership enforced by ANDing ownerId into every WHERE — a request for
 * someone else's plant id returns 404, not 403, so we don't leak existence.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);
    const id = req.query.id;
    if (typeof id !== "string") return res.status(400).json({ error: "bad id" });

    const where = and(eq(schema.plants.id, id), eq(schema.plants.ownerId, user.id));

    if (req.method === "PATCH") {
      const body = req.body as Record<string, unknown>;
      const [updated] = await db
        .update(schema.plants)
        .set(body)
        .where(where)
        .returning();
      if (!updated) return res.status(404).end();
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const [deleted] = await db.delete(schema.plants).where(where).returning();
      if (!deleted) return res.status(404).end();
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err) {
    return fail(res, err);
  }
}
