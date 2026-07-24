import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveKeys, serverEnv } from "@/lib/server/env";
import { cleanupSprite } from "@/lib/server/sprite-cleanup";

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
    const cutout = await removeBackground(rendered, serverEnv.withoutbgKey);
    const spriteBase64 = await cleanupSpriteSafe(cutout);
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
    "Front-facing and centered, fully isolated on a solid flat pure-white background — " +
    "no scenery, pot, ground, gradient, shadow, or reflection, so it cuts out cleanly. " +
    "Keep it to 2 sentences and output only the prompt, with no preamble.";

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
 * Removes stray islands and downscales, never fatally: if sharp errors, the
 * un-cleaned cutout is returned so a scan never fails on the polish step.
 */
async function cleanupSpriteSafe(base64Png: string): Promise<string> {
  try {
    return await cleanupSprite(base64Png);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`Sprite cleanup failed, keeping the raw cutout: ${message}`);
    return base64Png;
  }
}

/** HTTP statuses that won't change on retry — a bad key or no credit. */
const WITHOUTBG_PERMANENT = new Set([401, 402, 403, 413, 415, 422]);

/**
 * Runs the render through withoutBG to get a true RGBA cutout, retrying
 * transient failures so an occasional network blip or 500 doesn't leave a
 * sprite with its background baked in.
 *
 * Deliberately non-fatal overall: once retries are exhausted (or the key is
 * missing / credits are gone) it returns the raw render rather than failing the
 * whole scan. Billed one credit per successful call — cheap because sprites are
 * cached by species, so each plant type only pays once.
 */
async function removeBackground(base64Png: string, apiKey: string | null): Promise<string> {
  if (!apiKey) return base64Png; // key not configured — skip the step

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(WITHOUTBG_ENDPOINT, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Png }),
        // Normally ~3-4s; a short cap keeps 3 attempts from stacking into a
        // function timeout when the API is hanging.
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const cutout = (await response.json())?.img_without_background_base64;
        if (typeof cutout === "string" && cutout.length > 0) return cutout;
        console.warn("withoutBG returned no cutout, keeping raw sprite.");
        return base64Png;
      }

      const detail = (await response.text()).slice(0, 200);
      // A bad key or exhausted credit won't recover on retry — stop early.
      if (WITHOUTBG_PERMANENT.has(response.status)) {
        console.error(`withoutBG ${response.status} (not retryable): ${detail}`);
        return base64Png;
      }
      console.warn(`withoutBG ${response.status}, attempt ${attempt}/${MAX_ATTEMPTS}: ${detail}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`withoutBG request failed, attempt ${attempt}/${MAX_ATTEMPTS}: ${message}`);
    }

    // Brief backoff before the next try.
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 400 * attempt));
  }

  console.warn("withoutBG exhausted retries, keeping raw sprite.");
  return base64Png;
}
