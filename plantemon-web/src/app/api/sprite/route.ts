import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveKeys, serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
/*
 * Measured end-to-end against the live APIs: vision ~12-25s, Flux ~3.5s, and
 * the withoutBG cutout ~3.3s — worst case around 32s. That fits inside Vercel's
 * 60s Hobby cap, so 55s is set deliberately — the request fails just under the
 * platform limit with our own error rather than being killed mid-flight.
 */
export const maxDuration = 55;

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Vision model that turns the photo into an image prompt.
 *
 * The Android app used google/gemma-3-27b-it, which NVIDIA retired on
 * 2026-05-12 and now answers with 410 Gone — so the original sprite pipeline
 * fails on every scan today. gemma-4-31b-it is the successor and produces the
 * best prompts of the candidates measured (~13s, but with real variance up to
 * ~25s). meta/llama-3.2-11b-vision-instruct is ~3x faster if latency matters
 * more than prompt quality.
 *
 * Overridable so the model can be swapped without a redeploy the next time one
 * reaches end of life.
 */
const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || "google/gemma-4-31b-it";
const FLUX_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

const MAX_IMAGE_CHARS = 10 * 1024 * 1024;

/**
 * Generates a pixel-art sprite for a scanned plant.
 *
 * This proxy is mandatory, not just a key-hiding convenience: the NVIDIA
 * endpoints answer CORS preflights without an Access-Control-Allow-Origin
 * header, so browser JS cannot call them at all.
 *
 * Three hops:
 *   1. A vision model turns the photo + species name into an image prompt.
 *   2. Flux turns that prompt into a PNG.
 *   3. withoutBG strips the background to a true RGBA cutout, so the sprite
 *      composites cleanly into the pot and battle scenes. Flux paints a
 *      checkerboard-looking "transparent" backdrop into opaque pixels, which
 *      would otherwise show as a box around the creature.
 */
export async function POST(request: Request) {
  // Checked before anything else: this is the most expensive route in the app,
  // spending NVIDIA quota and holding a function for ~20s per call.
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const keys = resolveKeys({
    gemmaApiKey: () => serverEnv.gemmaApiKey,
    fluxApiKey: () => serverEnv.fluxApiKey,
  });
  if (!keys) {
    return NextResponse.json({ error: "Server is missing its Gemma (NVIDIA) API key." }, { status: 500 });
  }

  let body: { image?: unknown; plantName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { image, plantName } = body;

  if (typeof plantName !== "string" || plantName.trim().length === 0) {
    return NextResponse.json({ error: "Missing 'plantName'." }, { status: 400 });
  }
  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json({ error: "Missing 'image'." }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  }

  const base64Image = image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;

  try {
    const prompt = await describeAsSprite(base64Image, plantName, keys.gemmaApiKey);
    const rendered = await renderSprite(prompt, keys.fluxApiKey);
    // Enhancement, not a hard step: on any failure keep the raw render.
    const spriteBase64 = await removeBackground(rendered, serverEnv.withoutbgKey);
    return NextResponse.json({ sprite: `data:image/png;base64,${spriteBase64}`, prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sprite generation failed:", message);
    return NextResponse.json({ error: "Sprite generation failed." }, { status: 502 });
  }
}

/** Port of SpriteGeneratorService.fetchDescription. */
async function describeAsSprite(
  base64Image: string,
  plantName: string,
  apiKey: string,
): Promise<string> {
  const instruction =
    `This is a photo of ${plantName}. Write an image-generation prompt to draw this exact ` +
    "plant as a cute retro pixel-art game sprite. It MUST still clearly read as the real " +
    "plant — keep its true shape, structure, leaves, and colours. Add only the slightest " +
    "touch of life: one small pair of simple dot or bead eyes tucked among its leaves or " +
    "flowers. Do NOT add a mouth, arms, legs, or a separate body, and do NOT turn it into " +
    "a character or mascot — it stays a plant that just happens to have tiny eyes. " +
    "Front-facing and centered on a plain flat background. Keep it to 2 sentences and " +
    "output only the prompt, with no preamble.";

  const response = await fetch(NVIDIA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
      max_tokens: 256,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`NVIDIA API error ${response.status}: ${raw}`);
  }

  const content = JSON.parse(raw)?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("NVIDIA returned no description.");
  }
  return content.trim();
}

/** Port of SpriteGeneratorService.fetchSprite. Returns bare base64 PNG. */
async function renderSprite(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, steps: 4 }),
    signal: AbortSignal.timeout(180_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Flux API error ${response.status}: ${raw}`);
  }

  const artifact = JSON.parse(raw)?.artifacts?.[0]?.base64;
  if (typeof artifact !== "string" || artifact.length === 0) {
    throw new Error("Flux returned no image.");
  }

  // Strip a data URL prefix if one is present.
  const comma = artifact.indexOf(",");
  return comma === -1 ? artifact : artifact.slice(comma + 1);
}

const WITHOUTBG_ENDPOINT = "https://api.withoutbg.com/v1.0/image-without-background-base64";

/**
 * Runs the render through withoutBG to get a true RGBA cutout.
 *
 * Deliberately non-fatal: a missing key, exhausted credits, or an API error
 * returns the original render unchanged rather than failing the whole scan.
 * Billed one credit per successful call — cheap because sprites are cached by
 * species, so each plant type only pays once.
 */
async function removeBackground(base64Png: string, apiKey: string | null): Promise<string> {
  if (!apiKey) return base64Png; // key not configured — skip the step

  try {
    const response = await fetch(WITHOUTBG_ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: base64Png }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`withoutBG error ${response.status}, keeping raw sprite: ${detail.slice(0, 200)}`);
      return base64Png;
    }

    const cutout = (await response.json())?.img_without_background_base64;
    if (typeof cutout !== "string" || cutout.length === 0) {
      console.warn("withoutBG returned no cutout, keeping raw sprite.");
      return base64Png;
    }
    return cutout;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`withoutBG request failed, keeping raw sprite: ${message}`);
    return base64Png;
  }
}
