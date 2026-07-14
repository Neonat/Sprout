import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { requireUser } from "../../src/lib/auth.js";
import { db, schema } from "../../src/db/client.js";
import { fail } from "../../src/lib/respond.js";
import type { NewPlant } from "../../src/db/schema.js";

/**
 * GET  /api/plants        → list this user's plants
 * POST /api/plants  body=Plant → insert a new one
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);

    if (req.method === "GET") {
      const rows = await db.query.plants.findMany({
        where: eq(schema.plants.ownerId, user.id),
      });
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const body = req.body as Omit<NewPlant, "id" | "ownerId" | "createdAt">;
      // Garden cap: 6 plants (matches GardenActivity 6-pot shelf)
      const existing = await db.query.plants.findMany({
        where: eq(schema.plants.ownerId, user.id),
        columns: { id: true },
      });
      if (existing.length >= 6) {
        return res.status(409).json({ error: "Garden full (max 6 plants)" });
      }
      const [created] = await db
        .insert(schema.plants)
        .values({ ...body, ownerId: user.id })
        .returning();
      return res.status(201).json(created);
    }

    return res.status(405).end();
  } catch (err) {
    return fail(res, err);
  }
}
