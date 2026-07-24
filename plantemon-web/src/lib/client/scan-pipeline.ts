"use client";

import { Plant } from "@/lib/domain/plant";
import { createFromApi, buildFallbackPlant } from "@/lib/domain/plant-factory";
import type { PlantIdentification } from "@/lib/domain/plant-identification";
import { cropToSprite, toBareBase64 } from "./image";

/**
 * Port of the ScanActivity pipeline:
 *   photo -> Plant.id -> sprite generation -> Plant -> garden
 *
 * Every step degrades rather than failing outright, exactly as the original
 * did: no identification falls back to a user-supplied name, and no sprite
 * falls back to a cropped version of the photo.
 */

export type ScanStage = "identifying" | "generating-sprite" | "using-photo" | "saving";

export interface IdentifyOutcome {
  /** Null when Plant.id could not identify the photo. */
  identification: PlantIdentification | null;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return data as T;
}

/** Step 1. Resolves with a null identification rather than throwing. */
export async function identifyPlant(jpegDataUrl: string): Promise<IdentifyOutcome> {
  try {
    const result = await postJson<PlantIdentification | { error: string }>("/api/identify", {
      image: toBareBase64(jpegDataUrl),
    });
    if ("error" in result || !result.name) return { identification: null };
    return { identification: result };
  } catch (error) {
    // Network or config failure is treated the same as "could not identify":
    // the user is asked to name the plant instead.
    console.warn("Identification unavailable:", error);
    return { identification: null };
  }
}

/**
 * Step 2. Generates a sprite, falling back to a cropped photo on any failure.
 * Reports which path was taken so the UI can explain itself.
 */
export async function generateSprite(
  jpegDataUrl: string,
  plantName: string,
  onFallback: () => void,
): Promise<string> {
  try {
    const { sprite } = await postJson<{ sprite: string }>("/api/sprite", {
      image: toBareBase64(jpegDataUrl),
      plantName,
    });
    return sprite;
  } catch (error) {
    console.warn("Sprite generation failed, using photo:", error);
    onFallback();
    return cropToSprite(jpegDataUrl);
  }
}

/**
 * Step 3. Builds the Plant. Mirrors saveAndFinish: if PlantFactory throws
 * (say, an unmapped taxonomy), fall back to a hand-named plant.
 */
export function buildPlant(
  identification: PlantIdentification | null,
  name: string,
  spriteUrl: string,
): Plant {
  if (identification) {
    try {
      return createFromApi(identification, spriteUrl);
    } catch (error) {
      console.warn("PlantFactory failed, using fallback:", error);
    }
  }
  return buildFallbackPlant(name, spriteUrl);
}
