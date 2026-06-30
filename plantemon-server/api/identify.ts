import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../src/lib/auth.js";
import { identify } from "../src/lib/plantid.js";
import { fail } from "../src/lib/respond.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    await requireUser(req);
    const { imageBase64 } = req.body as { imageBase64?: string };
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });
    const result = await identify(imageBase64);
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err);
  }
}
