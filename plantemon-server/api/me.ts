import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { requireUser } from "../src/lib/auth.js";
import { db, schema } from "../src/db/client.js";
import { fail } from "../src/lib/respond.js";

/**
 * GET  /api/me  → { user, garden: Plant[] }
 * PATCH /api/me → update username / activePlantId / healCharges
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);

    if (req.method === "GET") {
      const garden = await db.query.plants.findMany({
        where: eq(schema.plants.ownerId, user.id),
      });
      return res.status(200).json({ user, garden });
    }

    if (req.method === "PATCH") {
      const { username, activePlantId, healCharges } = req.body as Partial<{
        username: string;
        activePlantId: string | null;
        healCharges: number;
      }>;
      const [updated] = await db
        .update(schema.users)
        .set({
          ...(username !== undefined && { username }),
          ...(activePlantId !== undefined && { activePlantId }),
          ...(healCharges !== undefined && { healCharges }),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id))
        .returning();
      return res.status(200).json(updated);
    }

    return res.status(405).end();
  } catch (err) {
    return fail(res, err);
  }
}
