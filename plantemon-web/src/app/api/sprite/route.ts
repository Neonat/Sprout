import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveKeys, serverEnv } from "@/lib/server/env";
import { cleanupSprite } from "@/lib/server/sprite-cleanup";

export const runtime = "nodejs";
/*
 * The vision hop is far spikier than it first measured. Re-measured against the
 * live API on 2026-07-25, the same photo and prompt returned in 5.4s, 6.1s,
 * 7.3s, 14.4s, 19.9s — and 49s. Flux (~3.3s) and withoutBG (~4.3s) are steady,
 * so the tail is entirely gemma's queue.
 *
 * The old 55s cap sat right inside that tail, so a slow vision call took the
 * whole function down with a 504 and the client silently fell back to a cropped
 * photo. 120s clears the observed tail with room to spare. Wall-clock here is
 * nearly free: Fluid Compute bills active CPU, and this route is almost
 * entirely idle waiting on upstream HTTP.
 *
 * The budget below is what actually protects the request — this cap is only the
 * backstop for a hop that hangs past its own deadline.
 */
export const maxDuration = 120;

/**
 * Wall-clock the route will spend before giving up, kept under maxDuration so
 * we always answer with our own error instead of being killed mid-flight.
 */
const TOTAL_BUDGET_MS = 110_000;

/** Per-hop ceilings, each also clamped to whatever budget is left. */
const VISION_TIMEOUT_MS = 75_000;
const FLUX_TIMEOUT_MS = 30_000;
const WITHOUTBG_TIMEOUT_MS = 15_000;

/**
 * Tracks the remaining budget so each hop can bound itself by what's actually
 * left rather than by a fixed timeout that ignores how long the earlier hops
 * took. The two mandatory hops (vision, Flux) get first claim; the optional
 * polish hops take what remains and are skipped when it runs out, which
 * degrades to a slightly rougher sprite instead of losing the whole scan.
 */
function createDeadline(totalMs: number) {
  const expiresAt = Date.now() + totalMs;
  return {
    remainingMs: () => expiresAt - Date.now(),
    /** Timeout signal for one hop: its own ceiling, or less if time is short. */
    signal(capMs: number, hop: string): AbortSignal {
      const left = expiresAt - Date.now();
      if (left <= 0) throw new Error(`Ran out of time before ${hop}.`);
      return AbortSignal.timeout(Math.min(capMs, left));
    },
  };
}

type Deadline = ReturnType<typeof createDeadline>;

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Vision model that turns the photo into an image prompt.
 *
 * The Android app used google/gemma-3-27b-it, which NVIDIA retired on
 * 2026-05-12 and now answers with 410 Gone — so the original sprite pipeline
 * fails on every scan today. gemma-4-31b-it is the successor and produces the
 * best prompts of the candidates measured, but its latency is the whole reason
 * this route needs a budget: a ~6s median with a tail out past 49s (see the
 * maxDuration note above). meta/llama-3.2-11b-vision-instruct is the fallback
 * if that tail ever matters more than prompt quality.
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
    const deadline = createDeadline(TOTAL_BUDGET_MS);
    const prompt = await describeAsSprite(base64Image, plantName, keys.gemmaApiKey, deadline);
    const rendered = await renderSprite(prompt, keys.fluxApiKey, deadline);
    // Enhancement, not a hard step: on any failure keep the raw render.
    const cutout = await removeBackground(rendered, serverEnv.withoutbgKey, deadline);
    const spriteBase64 = await cleanupSpriteSafe(cutout);
    return NextResponse.json({ sprite: toDataUrl(spriteBase64), prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sprite generation failed:", message);
    return NextResponse.json({ error: "Sprite generation failed." }, { status: 502 });
  }
}

/**
 * Builds the sprite data URL, labelled with the format actually present rather
 * than an assumed one.
 *
 * Flux answers with JPEG (magic ffd8ffe0), not PNG. Both later steps re-encode
 * to real PNG — withoutBG returns a PNG cutout and sharp always writes PNG — so
 * the happy path genuinely is PNG. But both of those steps are deliberately
 * non-fatal, and when they fall through together the raw JPEG is what reaches
 * the client. Sniffing the magic bytes keeps the label honest on every path,
 * which matters because this data URL is persisted with the plant: a wrong
 * label is stored for the life of that sprite, not just this response.
 */
function toDataUrl(base64: string): string {
  // 12 base64 chars decode to 9 bytes — enough for either signature.
  const head = Buffer.from(base64.slice(0, 12), "base64");
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  // Unknown falls back to PNG: every path that completes normally ends in PNG.
  const mime = isJpeg && !isPng ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${base64}`;
}

/**
 * Port of SpriteGeneratorService.fetchDescription, with a different art direction:
 * the sprite is now an original creature *derived* from the plant rather than the
 * literal plant with eyes added.
 *
 * Two things in the reference look are deliberately dropped, because they'd break
 * the rest of the pipeline: the graph-paper backdrop (withoutBG needs a flat white
 * field to cut against) and the 2x2 grid (one plant, one sprite).
 */
async function describeAsSprite(
  base64Image: string,
  plantName: string,
  apiKey: string,
  deadline: Deadline,
): Promise<string> {
  const instruction =
    `This is a photo of ${plantName}. Write an image-generation prompt for an original ` +
    "pixel-art creature design in the style of a retro monster-collecting video game: a " +
    "chubby, big-eyed plant/nature-themed monster drawn from this exact plant. Carry the " +
    "real plant's colours, leaf shapes, and flowers into the creature — its leaves sprout " +
    "from the sides like wings or curl up like horns, its flowers cluster on its head and " +
    "body, its stems trail into a curling vine tail — on a round, soft-proportioned body " +
    "with large expressive eyes, a small friendly face, and tiny clawed or root-like feet. " +
    "Style: clean bold black outlines, flat cel-shaded colouring, retro 16-bit pixel art, " +
    "grid-aligned pixels, even lighting, no shadows. Describe only the creature's own " +
    "design — never name or reference any existing game, brand, or character. " +
    "One single creature, front-facing and centered, fully isolated on a solid flat " +
    "pure-white background — no scenery, pot, ground, graph paper or grid backdrop, " +
    "gradient, shadow, or reflection, so it cuts out cleanly. " +
    "Keep it to 2-3 sentences and output only the prompt, with no preamble.";

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
    signal: deadline.signal(VISION_TIMEOUT_MS, "the vision step"),
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
async function renderSprite(prompt: string, apiKey: string, deadline: Deadline): Promise<string> {
  const response = await fetch(FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, steps: 4 }),
    signal: deadline.signal(FLUX_TIMEOUT_MS, "the render step"),
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
async function removeBackground(
  base64Png: string,
  apiKey: string | null,
  deadline: Deadline,
): Promise<string> {
  if (!apiKey) return base64Png; // key not configured — skip the step

  /* Below this there isn't time for a call plus the sharp pass that follows, so
   * stop rather than start work that can only end in a timeout. */
  const MIN_USEFUL_MS = 8_000;

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (deadline.remainingMs() < MIN_USEFUL_MS) {
      console.warn("Not enough budget left for withoutBG, keeping raw sprite.");
      return base64Png;
    }
    try {
      const response = await fetch(WITHOUTBG_ENDPOINT, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Png }),
        // Normally ~3-4s; a short cap keeps 3 attempts from stacking into a
        // function timeout when the API is hanging.
        signal: deadline.signal(WITHOUTBG_TIMEOUT_MS, "background removal"),
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
