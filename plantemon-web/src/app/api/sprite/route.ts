import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveKeys, serverEnv } from "@/lib/server/env";
import { cleanupSprite } from "@/lib/server/sprite-cleanup";

export const runtime = "nodejs";
/*
 * On the normal path this route now finishes in about 10s: Gemini ~1.5s, Flux
 * ~3.3s, withoutBG ~4.3s. The cap is not sized for that path.
 *
 * It is sized for the NVIDIA fallback. gemma-4-31b-it is wildly variable — 5.4s
 * to 49s in one hour's measurements, and 69s-or-timeout in the next — and the
 * old 55s cap sat right inside that tail, so a slow vision call took the whole
 * function down with a 504 and the client silently degraded to a cropped photo.
 * When Gemini is unavailable we would rather wait out a slow gemma than lose the
 * sprite, so the cap has to cover it.
 *
 * Wall-clock is nearly free here: Fluid Compute bills active CPU, and this route
 * is almost entirely idle on upstream HTTP, so a generous cap that is rarely
 * reached costs little.
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

/**
 * Per-hop ceilings, each also clamped to whatever budget is left.
 *
 * Gemini gets a deliberately tight one. It answered 20/20 calls between 1.2s
 * and 2.2s when measured, so anything past 20s means it is broken rather than
 * slow, and the sooner we give up the more budget the NVIDIA fallback inherits.
 */
const GEMINI_TIMEOUT_MS = 20_000;
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
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Primary vision model. Benchmarked 2026-07-25 on one photo, interleaved rounds
 * so every contender shared queue conditions:
 *
 *   gemini-3.5-flash-lite   20/20 ok   1.2 / 1.5 / 2.2s   (min/med/max)
 *   gemini-3.6-flash         5/5  ok   3.9 / 4.3 / 4.7s
 *   nemotron-nano-12b-v2-vl  5/5  ok   6.7 / 8.1 / 10.0s
 *   gemma-4-31b-it           1/5  ok   68.9s, rest timed out past 90s
 *
 * flash-lite wins on both ends: fastest median and, more importantly here, no
 * tail at all — it is the tail that was timing the function out and silently
 * degrading scans to a cropped photo.
 *
 * gemini-3.6-flash was rejected despite being newer: it spends ~490 tokens on
 * reasoning, and because thinking draws from maxOutputTokens it returned prompts
 * truncated mid-sentence. flash-lite does no thinking at all.
 */
const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";

/**
 * Fallback vision model, used when Gemini has no key, no credit, or errors.
 *
 * The Android app used google/gemma-3-27b-it, which NVIDIA retired on
 * 2026-05-12 and now answers with 410 Gone. gemma-4-31b-it is the successor and
 * writes good prompts, but its latency is why it is no longer the primary: it
 * has been measured at a 6s median one hour and 69s-or-timeout the next.
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
    const prompt = await describeAsSprite(
      base64Image,
      plantName,
      keys.gemmaApiKey,
      serverEnv.geminiKey,
      deadline,
    );
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
 * The earlier version of this instruction handed the model a finished creature —
 * round chubby body, leaf-wings, flowers on the head, curling vine tail, tiny
 * clawed feet — and asked it to write that up. Every species came back as the
 * same blob in a different palette, because the only variable left was colour.
 * So the body is no longer specified here at all: the instruction asks the model
 * to find what makes this plant unlike other plants and to let those traits pick
 * the silhouette, stance and limbs. The one-line "signature trait" step exists to
 * force that choice before the prose starts, so the description is built around a
 * specific shape instead of drifting back to the generic mascot.
 *
 * Dropping the fixed body also dropped the only thing that made the creatures
 * cute, and "spider lily" promptly came back as a spindly, angular thing with
 * arachnid symmetry — accurate, and no good for a children's game. So charm is
 * its own requirement now. The banned list is explicit because "cute" alone
 * doesn't stop a model from drawing anatomically faithful legs.
 *
 * Charm is asked for as a range rather than a design: pick from these kinds of
 * eyes, these kinds of mouths, these proportions. An earlier version named one
 * face — big round eyes, rosy cheeks, chibi build — and pinned it in every
 * prompt, which held the vibe but made the creatures siblings from the neck up.
 * The split to hold onto is that the *medium* is fixed (chunky low-res pixel
 * art, flat colour, bold outline, white field) and the *design* is not: sameness
 * of vibe should come from the rendering, never from reissuing one creature.
 *
 * A lot of common plant names carry an animal in them — spider lily, snake plant,
 * tiger lily, elephant ear — and a design that ignores it misses the joke the
 * name is already making. So the instruction asks for an echo of that animal, but
 * deliberately a quiet one: it's an accent on a plant-made creature, not a costume
 * over it, and the plant's form still picks the body. The echo is the part most
 * likely to turn creepy, since a faithful spider or snake is exactly what a
 * child's game doesn't want, so it gets worked examples of the cute reading.
 * Names with no animal in them get nothing, which is why the clause says so
 * outright rather than leaving the model to invent a mascot for "Boston Fern".
 *
 * The word "cute" also has to survive into the prompt itself: Flux never sees
 * this instruction, only the sentences the vision model writes, so the output
 * format asks for it in so many words.
 *
 * Only the things the pipeline actually depends on stay mandatory: the art style
 * (so sprites read as one set), a single centered subject, and the flat white
 * field withoutBG needs to cut against.
 *
 * Two things in the reference look are deliberately dropped, because they'd break
 * the rest of the pipeline: the graph-paper backdrop (withoutBG needs a flat white
 * field to cut against) and the 2x2 grid (one plant, one sprite).
 */
function buildInstruction(plantName: string): string {
  return (
    `This is a photo of ${plantName}. Design an original pixel-art creature for a retro ` +
    "monster-collecting video game, inspired by this exact plant, then write the " +
    "image-generation prompt for it.\n\n" +
    "First study what makes THIS plant unlike any other plant: its growth habit (upright, " +
    "bushy, trailing, climbing, rosette, columnar, sprawling), the outline and edge of its " +
    "leaves, its overall silhouette, its texture (waxy, fuzzy, spiny, ribbed, papery), and " +
    "its actual colours including any variegation, veining, stem colour or flowers.\n\n" +
    "Let those traits decide the creature's body — the plant's shape is the design, not a " +
    "decoration added to a mascot. A spiny plant becomes a stout creature studded with " +
    "soft blunt prickles; a trailing one becomes a long, low, happily coiling one; a " +
    "broad-leaved one becomes round and leafy-topped; a fine or grassy one becomes small " +
    "and tufty; a rosette becomes squat and symmetrical. Vary the build, stance, " +
    "proportions, and number and kind of " +
    "limbs to match. Do not default to a round chubby body with leaf wings, a flower crown " +
    "and a curling vine tail — pick the shape only this plant would produce. Give it a " +
    "face with expressive eyes, and name its real colours.\n\n" +
    "Someone who knows this plant must recognise which plant it is at a glance. The " +
    "creature's outline has to carry the plant's most identifiable feature — the one from " +
    "the signature trait line — as its main shape, not as a small decoration. Name that " +
    "feature concretely in the prompt: not \"leafy\" or \"plant-like\" or \"foliage\", but " +
    "the real form, such as long strap-like arching leaves with a pale central stripe, or " +
    "flat paddle pads edged in fine hairs, or a tight rosette of thick pointed rosettes. " +
    "Vague filler is the main way a design collapses into an anonymous round blob, so " +
    "prefer the specific word every time. Soften the tips of pointed forms, but keep them " +
    "clearly pointed — do not round a distinctive shape away into a ball.\n\n" +
    "Whatever shape you choose, it must be cute — this is a friendly companion for young " +
    "children. There is no single cute template, so design this creature's own face and " +
    "build rather than reusing a standard one. Give it a small personality drawn from the " +
    "plant's character — bold, shy, sleepy, cheeky, serene, proud, eager — and let the " +
    "eyes and mouth express that one, so that no two species arrive wearing the same " +
    "expression; plain dot eyes and a small smile are one option among many, not the " +
    "default. Let the plant suggest the features: eyes big " +
    "and round, or half-closed and content, or sleepy, or sparkling, or simple dots, set " +
    "wherever its form invites them; a mouth that is a small smile, an open cheerful grin, " +
    "a tiny curve or a shy line; rosy cheeks, freckles, leafy brows or nothing at all. " +
    "Proportions vary too — chibi and top-heavy, tall and slender, squat and wide, or long " +
    "and low — as long as it reads warm and approachable. Take the edge off whatever the " +
    "plant would sharpen into a point, without losing the shape itself, and keep the " +
    "posture relaxed and welcoming. A spiky, lanky or " +
    "angular creature can and should still be adorable. " +
    "Never menacing, creepy, spooky, gloomy, fierce, sinister " +
    "or realistic — no fangs, claws, staring or multiple eyes, gnarled or hairy limbs, " +
    "gaping mouths, dark or muddy palettes, or true-to-life animal or insect anatomy.\n\n" +
    "If the plant's name refers to an animal or creature (spider, snake, tiger, zebra, " +
    "crane, elephant, fox, lamb, dragon and so on), let a quiet echo of that animal show " +
    "in the design — a marking, a stance, the shape of an ear, eye or tail, the way it " +
    "moves. Keep it subtle and secondary: a knowing nod for anyone who reads the name, " +
    "never a costume. It is always a plant creature that faintly recalls the animal in one " +
    "or two details — never the animal itself. Do not give it the animal's body plan, head " +
    "or limb count, and never call it a spider creature, a snake creature and so on, nor " +
    "use words like arachnid, eight-legged, serpentine or feline anywhere in the prompt: a " +
    "spider lily might simply space its petal-limbs evenly around a round body, a snake " +
    "plant might carry soft banded markings, a tiger lily a few round spots. One cue is " +
    "enough, and if in doubt leave it out. The plant's own form still decides the body, " +
    "and the creature must stay obviously plant-made. If the name refers to no animal, " +
    "add none.\n\n" +
    "Style: chunky low-resolution pixel art, like a tiny sprite from a 1990s handheld game " +
    "shown large — big square grid-aligned pixels with visibly stepped edges, a small " +
    "palette of a few flat bright colours, clean bold outlines, simple rounded readable " +
    "shapes with very little interior detail, even lighting and no shadows. Kawaii, " +
    "toy-like and simply drawn: whatever face you chose, render it with a handful of " +
    "chunky pixels rather than fine detail. Cheerful storybook " +
    "colours: bright soft greens, warm pinks and sunny yellows, never dark or murky. It " +
    "must be flat 2D pixel art — never a 3D render, never glossy, metallic, shiny, " +
    "plastic, clay, a toy figurine or a photograph, and with no smooth gradients, " +
    "highlights or soft airbrushed shading. Nothing detailed, painterly, " +
    "realistic, gritty, gothic or high-contrast. Describe only the creature's own " +
    "design — never name or reference any existing game, brand, or character. " +
    "One single creature, front-facing and centered, fully isolated on a solid flat " +
    "pure-white background — no scenery, pot, ground, graph paper or grid backdrop, " +
    "gradient, shadow, or reflection, so it cuts out cleanly.\n\n" +
    "Output exactly two lines and nothing else:\n" +
    "Signature trait: <the one plant feature driving the design, a few words>\n" +
    "Prompt: <3-4 sentences that must begin with exactly these words — \"Flat 2D chunky " +
    "low-resolution pixel-art sprite of a cute, friendly plant creature\" — then, still " +
    "inside that first sentence, the signature trait rendered as the creature's overall " +
    "shape, in concrete words, and then the particular face you designed for it. Both the " +
    "shape and the face have to sit in that first sentence: the image model weighs the " +
    "opening hardest and drops whatever comes later. Use the remaining sentences for " +
    "colours, markings and stance. End the last sentence " +
    "with \"no 3D rendering, no gloss, no gradients.\">"
  );
}

/**
 * Pulls the image prompt out of the two-line reply.
 *
 * The "Signature trait:" line is scaffolding — it exists to make the model commit
 * to a distinguishing feature before it writes, which is what stops every species
 * collapsing into the same creature. It must not reach Flux, which would render
 * the label as text in the image. Falls back to the whole reply so a model that
 * ignores the format still produces a sprite rather than an error.
 */
function extractPrompt(reply: string): string {
  const match = reply.match(/^\s*Prompt:\s*([\s\S]+)$/im);
  const prompt = (match?.[1] ?? reply.replace(/^\s*Signature trait:.*$/im, "")).trim();
  return prompt.length > 0 ? prompt : reply.trim();
}

/**
 * Turns the photo into an image prompt, preferring Gemini and falling back to
 * the NVIDIA model.
 *
 * The fallback is worth its complexity: Gemini is the fast path but it is also
 * the one with a prepaid balance that can hit zero mid-session, and a 429 there
 * would otherwise cost the whole scan. Losing Gemini should mean a slow sprite,
 * not a photo where a sprite should be.
 */
async function describeAsSprite(
  base64Image: string,
  plantName: string,
  apiKey: string,
  geminiKey: string | null,
  deadline: Deadline,
): Promise<string> {
  const instruction = buildInstruction(plantName);

  if (geminiKey) {
    try {
      return extractPrompt(await describeWithGemini(base64Image, instruction, geminiKey, deadline));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`Gemini vision failed, falling back to ${VISION_MODEL}: ${message}`);
    }
  }
  return extractPrompt(await describeWithNvidia(base64Image, instruction, apiKey, deadline));
}

/** Google AI Studio path. Returns the prompt text. */
async function describeWithGemini(
  base64Image: string,
  instruction: string,
  apiKey: string,
  deadline: Deadline,
): Promise<string> {
  const response = await fetch(
    `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: instruction },
              { inline_data: { mime_type: "image/jpeg", data: base64Image } },
            ],
          },
        ],
        // Measured output was 106-173 tokens before the instruction asked for a
        // signature-trait line and 3-4 sentences; 512 still leaves plenty of room
        // without inviting an essay. Note this ceiling also covers reasoning
        // tokens on models that think — the reason a thinking model can't simply
        // be dropped in here.
        generationConfig: { maxOutputTokens: 512 },
      }),
      signal: deadline.signal(GEMINI_TIMEOUT_MS, "the vision step"),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${raw.slice(0, 300)}`);
  }

  const candidate = JSON.parse(raw)?.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (text.length === 0) {
    // Covers a safety block, which returns a candidate with no parts at all.
    throw new Error(`Gemini returned no description (finishReason=${candidate?.finishReason}).`);
  }
  return text;
}

/** NVIDIA NIM path — the original implementation, now the fallback. */
async function describeWithNvidia(
  base64Image: string,
  instruction: string,
  apiKey: string,
  deadline: Deadline,
): Promise<string> {
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
      // 256 was sized for the old 2-3 sentence prompt; the reply now also carries
      // a signature-trait line, and a truncated prompt is a truncated sprite.
      max_tokens: 400,
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
