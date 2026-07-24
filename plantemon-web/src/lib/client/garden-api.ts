"use client";

import type { SerializedPlant } from "@/lib/domain/plant-serialization";

/** Thin client for the server-side garden, which is the source of truth. */

export async function fetchGarden(): Promise<SerializedPlant[]> {
  const response = await fetch("/api/garden", { cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not load your garden."));
  const { plants } = (await response.json()) as { plants: SerializedPlant[] };
  return plants;
}

export async function createPlant(plant: SerializedPlant): Promise<SerializedPlant> {
  const response = await fetch("/api/garden", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plant),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not save that plant."));
  const { plant: saved } = (await response.json()) as { plant: SerializedPlant };
  return saved;
}

export async function destroyPlant(id: string): Promise<void> {
  const response = await fetch(`/api/garden/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await errorMessage(response, "Could not delete that plant."));
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return (body as { error?: string } | null)?.error ?? fallback;
}
