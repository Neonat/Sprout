"use client";

import Image from "next/image";
import { useParams } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { useGarden } from "@/components/garden-provider";
import type { Plant } from "@/lib/domain/plant";

/**
 * Port of ui/InfoActivity.java + layout/activity_info.xml.
 *
 * The Android version received the Plant as a Serializable intent extra; here
 * the id comes from the route and the plant is looked up in the garden.
 *
 * A client component on purpose: the garden lives in browser storage, so there
 * is nothing for the server to render. (Note that in Next 16 a *server*
 * component would have to await `params`.)
 */
export default function InfoPage() {
  const params = useParams<{ id: string }>();
  const { getPlant, ready } = useGarden();

  const plant = getPlant(params.id);

  return (
    <main className="screen flex flex-col">
      <Image src="/img/bg_info.png" alt="" fill sizes="100vw" className="-z-10 object-cover" />

      <div className="safe-top flex items-center px-3">
        <BackButton />
      </div>

      {!ready ? (
        <p className="mt-12 text-center text-xs">Loading…</p>
      ) : !plant ? (
        <p className="pixel-panel mx-6 mt-12 p-4 text-center text-[10px] leading-relaxed">
          That plant is not in your garden.
        </p>
      ) : (
        <PlantCard plant={plant} />
      )}
    </main>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  const scannedAt = plant.getScanDateTime();

  return (
    <div className="safe-bottom flex-1 overflow-y-auto px-4 pb-8">
      <div className="flex flex-col items-center">
        {/* Boxed so the sprite reads against the busy painted background. */}
        <div className="pixel-panel p-2">
          {plant.spritePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plant.spritePath} alt="" className="pixelated h-36 w-36 object-contain" />
          ) : (
            <Image src="/img/ic_pot_empty.png" alt="" width={144} height={144} className="h-36 w-36" />
          )}
        </div>

        {/* Name + scan time in their own panel, likewise. */}
        <div className="pixel-panel mt-3 px-4 py-2 text-center">
          <h1 className="font-pixel text-base leading-relaxed sm:text-xl">{plant.getName()}</h1>
          <p className="mt-2 text-xs opacity-80">Scanned on: {formatScanTime(scannedAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <Stat label="HP" value={plant.getMaxHealth()} />
        <Stat label="SPEED" value={plant.getSpeed()} />
      </div>

      <Section title="Moves">
        {plant.getMoves().length === 0 ? (
          <p>No moves learned.</p>
        ) : (
          <ul className="space-y-2">
            {plant.getMoves().map((move, index) => (
              <li key={`${move.getName()}-${index}`}>
                <span className="font-medium">• {move.getName()}</span>{" "}
                <span className="opacity-70">
                  (Atk: {move.getAttack()}, Def: {move.getDefense()}, Acc: {move.getAccuracy()})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Details">
        <Detail label="Description" value={plant.description} />
        <Detail label="Best Light" value={plant.bestLightCondition} />
        <Detail label="Best Soil" value={plant.bestSoilType} />
        <Detail label="Common Uses" value={plant.commonUses} />
        <Detail label="Toxicity" value={plant.toxicity} />
        <Detail label="Watering" value={plant.bestWatering} />
        {!hasAnyDetail(plant) && <p>No details available.</p>}
      </Section>
    </div>
  );
}

/** Mirrors InfoActivity's "dd MMM yyyy, HH:mm" in the viewer's locale. */
function formatScanTime(date: Date | null): string {
  if (!date) return "Unknown";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasAnyDetail(plant: Plant): boolean {
  return Boolean(
    plant.description ||
      plant.bestLightCondition ||
      plant.bestSoilType ||
      plant.commonUses ||
      plant.toxicity ||
      plant.bestWatering,
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="pixel-panel px-5 py-2 text-center">
      <div className="font-pixel text-[8px] opacity-70">{label}</div>
      <div className="font-pixel mt-1 text-base">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pixel-panel mt-4 p-4 text-sm leading-relaxed">
      <h2 className="font-pixel mb-3 text-xs sm:text-sm">{title}</h2>
      {children}
    </section>
  );
}

/** Renders nothing when the field is absent, matching appendIfPresent(). */
function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="mb-2.5">
      <span className="font-semibold">{label}: </span>
      <span className="opacity-90">{value}</span>
    </p>
  );
}
