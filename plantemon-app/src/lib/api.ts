/**
 * Thin client for plantemon-server. Every call takes a `getToken`
 * function from Clerk's useAuth() so we don't import @clerk/* here
 * and the module stays unit-testable.
 */
import type { Plant } from "@game/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
if (!BASE_URL) {
  // Warn, not throw — lets the dev server hot-reload while you set the env var.
  console.warn("EXPO_PUBLIC_API_URL is unset; API calls will fail.");
}

export type GetToken = () => Promise<string | null>;

async function call<T>(
  getToken: GetToken,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Me {
  user: {
    id: string;
    username: string;
    activePlantId: string | null;
    healCharges: number;
  };
  garden: Plant[];
}

export const api = {
  identify: (getToken: GetToken, imageBase64: string) =>
    call<{
      name: string;
      commonNames: string[];
      description: string | null;
      watering: string | null;
      sunlight: string | null;
      soil: string | null;
      toxicity: string | null;
      culturalSignificance: string | null;
      taxonomy: {
        class?: string;
        genus?: string;
        order?: string;
        family?: string;
        phylum?: string;
      };
    }>(getToken, "/api/identify", {
      method: "POST",
      body: JSON.stringify({ imageBase64 }),
    }),

  sprite: (getToken: GetToken, name: string, imageBase64: string) =>
    call<{ url: string; cached: boolean }>(getToken, "/api/sprite", {
      method: "POST",
      body: JSON.stringify({ name, imageBase64 }),
    }),

  me: (getToken: GetToken) => call<Me>(getToken, "/api/me"),

  updateMe: (getToken: GetToken, patch: Partial<Me["user"]>) =>
    call<Me["user"]>(getToken, "/api/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  createPlant: (getToken: GetToken, plant: Omit<Plant, "id" | "ownerId">) =>
    call<Plant>(getToken, "/api/plants", {
      method: "POST",
      body: JSON.stringify(plant),
    }),

  updatePlant: (getToken: GetToken, id: string, patch: Partial<Plant>) =>
    call<Plant>(getToken, `/api/plants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deletePlant: (getToken: GetToken, id: string) =>
    call<void>(getToken, `/api/plants/${id}`, { method: "DELETE" }),
};
