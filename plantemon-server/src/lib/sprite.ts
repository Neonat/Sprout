import { put, head } from "@vercel/blob";

/**
 * Two-step sprite pipeline. Mirrors SpriteGeneratorService.java:
 *   1. Gemma-3 (multimodal LLM): photo + name → pixel-art prompt
 *   2. Flux: prompt → 192×192 PNG
 *
 * Server-side cache: same blob key per plant name means every user
 * benefits from any sprite ever generated.
 */
export async function generateSprite(
  plantName: string,
  imageBase64: string,
): Promise<{ url: string; cached: boolean }> {
  const key = `sprites/${slug(plantName)}.png`;

  // Cache hit? Skip both API calls.
  try {
    const existing = await head(key);
    return { url: existing.url, cached: true };
  } catch {
    /* not found — fall through */
  }

  const prompt = await describe(plantName, imageBase64);
  const pngBytes = await renderFlux(prompt);

  const blob = await put(key, Buffer.from(pngBytes), {
    access: "public",
    contentType: "image/png",
  });
  return { url: blob.url, cached: false };
}

async function describe(name: string, imageBase64: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not configured");

  const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Describe this plant (${name}) as a Pokémon-style pixel-art creature in one vivid sentence. Mention colours and shape only. No preamble.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 120,
      temperature: 0.7,
    }),
  });
  if (!resp.ok) throw new Error(`Gemma-3 ${resp.status}: ${await resp.text()}`);
  const json = (await resp.json()) as any;
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Gemma-3 returned empty description");
  return text.trim();
}

async function renderFlux(prompt: string): Promise<Uint8Array> {
  const key = process.env.FLUX_API_KEY ?? process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("FLUX_API_KEY not configured");

  const resp = await fetch(
    "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: `pixel art sprite, 192x192, retro game style, transparent background. ${prompt}`,
        width: 192,
        height: 192,
        steps: 4,
      }),
    },
  );
  if (!resp.ok) throw new Error(`Flux ${resp.status}: ${await resp.text()}`);
  const json = (await resp.json()) as any;
  const b64: string | undefined = json?.artifacts?.[0]?.base64 ?? json?.image;
  if (!b64) throw new Error("Flux returned no image");
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
