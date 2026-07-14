import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../src/lib/auth.js";
import { generateSprite } from "../src/lib/sprite.js";
import { fail } from "../src/lib/respond.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    await requireUser(req);
    const { name, imageBase64 } = req.body as { name?: string; imageBase64?: string };
    if (!name || !imageBase64) {
      return res.status(400).json({ error: "name and imageBase64 required" });
    }
    const result = await generateSprite(name, imageBase64);
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err);
  }
}
