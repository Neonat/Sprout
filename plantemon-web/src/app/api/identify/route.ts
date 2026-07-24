import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveKeys, serverEnv } from "@/lib/server/env";
import type { PlantIdentification } from "@/lib/domain/plant-identification";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = "https://api.plant.id/v3/identification";

const DETAILS = [
  "common_names",
  "url",
  "description",
  "taxonomy",
  "rank",
  "gbif_id",
  "inaturalist_id",
  "image",
  "synonyms",
  "edible_parts",
  "watering",
  "best_light_condition",
  "best_soil_type",
  "common_uses",
  "cultural_significance",
  "toxicity",
  "best_watering",
].join(",");

/** Roughly 10 MB of base64, which is ~7.5 MB of image bytes. */
const MAX_IMAGE_CHARS = 10 * 1024 * 1024;

/**
 * Proxies Plant.id identification.
 *
 * Plant.id does send permissive CORS headers, so the browser could call it
 * directly — but that would ship the API key to every client. Routing through
 * here keeps the key server-side and lets us reuse the response reshaping.
 */
export async function POST(request: Request) {
  // Checked before anything else: this route spends Plant.id quota, so an
  // unauthenticated caller could run up the bill.
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const keys = resolveKeys({ plantApiKey: () => serverEnv.plantApiKey });
  if (!keys) {
    return NextResponse.json(
      { error: "Server is missing its Plant.id API key." },
      { status: 500 },
    );
  }

  let image: unknown;
  try {
    ({ image } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof image !== "string" || image.length === 0) {
    return NextResponse.json(
      { error: "Missing 'image': expected a base64-encoded photo." },
      { status: 400 },
    );
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  }

  // Accept a full data URL as well as bare base64.
  const base64Image = image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;

  const url = `${BASE_URL}?details=${encodeURIComponent(DETAILS)}&language=en`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Api-Key": keys.plantApiKey,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ images: [base64Image] }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not reach Plant.id: ${message}` }, { status: 502 });
  }

  const raw = await response.text();

  if (!response.ok) {
    // Deliberately not forwarding the upstream body — it can echo request
    // details. Log server-side, return something safe.
    console.error(`Plant.id error ${response.status}: ${raw}`);
    return NextResponse.json(
      { error: `Plant identification failed (${response.status}).` },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(extractPlantInfo(JSON.parse(raw)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Extraction error: ${message}` }, { status: 502 });
  }
}

/** The subset of the Plant.id v3 response this app reads. */
interface PlantIdSuggestion {
  name?: string;
  probability?: number;
  details?: {
    common_names?: string[] | null;
    taxonomy?: Record<string, unknown> | null;
    description?: { value?: string; citation?: string } | null;
    best_light_condition?: string;
    best_soil_type?: string;
    common_uses?: string;
    cultural_significance?: string;
    toxicity?: string;
    best_watering?: string;
  } | null;
}

interface PlantIdResponse {
  result?: {
    is_plant?: { binary?: boolean; probability?: number } | null;
    classification?: { suggestions?: PlantIdSuggestion[] } | null;
  } | null;
}

/**
 * Port of PlantApiService.extractPlantInfo — flattens the nested Plant.id
 * response into the shape PlantFactory consumes.
 */
function extractPlantInfo(root: PlantIdResponse): PlantIdentification | { error: string } {
  const result = root?.result;
  if (!result) return { error: "No result in response." };

  const isPlant = result.is_plant;
  if (!isPlant || (isPlant.binary !== true && (isPlant.probability ?? 0) < 0.5)) {
    return { error: "Not identified as a plant." };
  }

  const suggestions = result.classification?.suggestions;
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return { error: "No suggestions." };
  }

  const best = suggestions[0];
  const details = best.details ?? {};

  return {
    name: best.name ?? "",
    probability: best.probability,
    common_names: details.common_names ?? null,
    taxonomy: details.taxonomy ?? null,
    description_value: details.description?.value ?? "",
    description_citation: details.description?.citation ?? "",
    best_light_condition: details.best_light_condition ?? "",
    best_soil_type: details.best_soil_type ?? "",
    common_uses: details.common_uses ?? "",
    cultural_significance: details.cultural_significance ?? "",
    toxicity: details.toxicity ?? "",
    best_watering: details.best_watering ?? "",
  };
}
