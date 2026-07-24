"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { Plant } from "@/lib/domain/plant";
import { serializePlant, deserializePlant } from "@/lib/domain/plant-serialization";
import type { SerializedPlant } from "@/lib/domain/plant-serialization";
import { createPlant, destroyPlant, fetchGarden } from "@/lib/client/garden-api";
import {
  clearGarden,
  loadGarden as loadCachedGarden,
  requestPersistentStorage,
  savePlant as cachePlant,
} from "@/lib/client/garden-store";

/**
 * Replaces ui/GameState.java, the static singleton holding the live Player and
 * their garden.
 *
 * Postgres is the source of truth so a garden follows the player across
 * devices. IndexedDB mirrors it, which keeps the garden and battles readable
 * offline — the case a PWA has to handle that the Android app never did.
 */

/** Six pots on the shelf, as in activity_garden.xml. */
export const MAX_GARDEN_SIZE = 6;

interface GardenContextValue {
  garden: Plant[];
  /** False until the first load settles. */
  ready: boolean;
  /** True when showing cached data because the server was unreachable. */
  offline: boolean;
  addPlant: (plant: Plant) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  getPlant: (id: string) => Plant | undefined;
}

const GardenContext = createContext<GardenContextValue | null>(null);

/** Stable reference, so signed-out renders don't invalidate every memo. */
const EMPTY_GARDEN: Plant[] = [];

async function mirrorToCache(plants: SerializedPlant[]): Promise<void> {
  await clearGarden();
  await Promise.all(plants.map(cachePlant));
}

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [garden, setGarden] = useState<Plant[]>([]);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Wait for Clerk, and skip entirely on the sign-in pages — fetching there
    // would 401 and be misreported as being offline. The signed-out result is
    // derived below rather than written into state here.
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    (async () => {
      try {
        const plants = await fetchGarden();
        if (cancelled) return;
        setGarden(plants.map(deserializePlant));
        setOffline(false);
        // Refresh the offline mirror to match the server.
        void mirrorToCache(plants);
      } catch (serverError) {
        console.warn("Falling back to the offline garden:", serverError);
        try {
          const cached = await loadCachedGarden();
          if (cancelled) return;
          setGarden(cached.map(deserializePlant));
          setOffline(true);
        } catch (cacheError) {
          // Neither source available; start empty rather than white-screening.
          console.error("Could not load garden:", cacheError);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    // Ask once, so iOS is less likely to evict the cache after 7 idle days.
    void requestPersistentStorage();

    return () => {
      cancelled = true;
    };
    // Re-runs on sign-in/out so one user's garden never leaks into another's session.
  }, [isLoaded, isSignedIn, userId]);

  const addPlant = useCallback(async (plant: Plant) => {
    const saved = await createPlant(serializePlant(plant));
    const persisted = deserializePlant(saved);
    setGarden((current) => [...current, persisted]);
    void cachePlant(saved);
  }, []);

  const deletePlant = useCallback(async (id: string) => {
    await destroyPlant(id);
    setGarden((current) => current.filter((plant) => plant.id !== id));
  }, []);

  // Signed-out sessions have an empty garden and nothing to wait for. Derived
  // here so a sign-out cannot leave the previous user's plants on screen.
  const visibleGarden = isSignedIn ? garden : EMPTY_GARDEN;
  const isReady = !isLoaded ? false : !isSignedIn ? true : ready;

  const getPlant = useCallback(
    (id: string) => visibleGarden.find((p) => p.id === id),
    [visibleGarden],
  );

  const value = useMemo(
    () => ({ garden: visibleGarden, ready: isReady, offline, addPlant, deletePlant, getPlant }),
    [visibleGarden, isReady, offline, addPlant, deletePlant, getPlant],
  );

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden(): GardenContextValue {
  const context = useContext(GardenContext);
  if (!context) throw new Error("useGarden must be used inside a GardenProvider");
  return context;
}
