"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { BackButton } from "@/components/back-button";
import { MAX_GARDEN_SIZE, useGarden } from "@/components/garden-provider";
import type { Plant } from "@/lib/domain/plant";

/**
 * Port of ui/GardenActivity.java + layout/activity_garden.xml.
 *
 * Two shelves of three pots. Occupied pots show the plant's sprite and link to
 * its info card. A shovel toggle in the header arms a "shovelling" mode in
 * which tapping a plant removes it (with a confirm, since removal deletes the
 * plant from the cloud garden and can't be undone).
 */
export default function GardenPage() {
  const { garden, ready, deletePlant } = useGarden();
  const [shovelArmed, setShovelArmed] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Plant | null>(null);
  const [removing, setRemoving] = useState(false);

  const hasPlants = garden.length > 0;
  // Derived, so an empty garden can't leave a stale mode armed — no effect needed.
  const shovelling = shovelArmed && hasPlants;

  // Always render six slots, filling from the start.
  const slots: (Plant | undefined)[] = Array.from(
    { length: MAX_GARDEN_SIZE },
    (_, i) => garden[i],
  );

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await deletePlant(pendingRemoval.id);
      setPendingRemoval(null);
    } catch (error) {
      console.error("Failed to remove plant:", error);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <main className="screen flex flex-col">
      <Image src="/img/bg_garden.jpeg" alt="" fill sizes="100vw" className="-z-10 object-cover" />

      <div className="safe-top flex items-center justify-between px-3">
        <BackButton />
        {hasPlants && (
          <button
            type="button"
            aria-pressed={shovelling}
            aria-label={shovelling ? "Stop shovelling" : "Remove plants"}
            onClick={() => setShovelArmed((on) => !on)}
            // Inline background wins over .pixel-button's unlayered shorthand.
            style={shovelling ? { background: "var(--color-plantemon-hp-low)" } : undefined}
            className="press pixel-button flex h-10 w-10 items-center justify-center text-lg"
          >
            🪏
          </button>
        )}
      </div>

      <header className="flex items-center justify-center gap-3 px-4">
        <Image
          src="/img/ic_garden_header.png"
          alt=""
          width={120}
          height={120}
          className="h-16 w-16 object-contain sm:h-24 sm:w-24"
        />
        <h1 className="font-pixel text-xl text-black sm:text-3xl">Garden</h1>
      </header>

      {shovelling && (
        <p className="pixel-panel mx-auto mt-2 px-3 py-2 text-center text-[10px] leading-relaxed">
          Tap a plant to dig it up. Tap the shovel again to stop.
        </p>
      )}

      <div className="safe-bottom flex flex-1 flex-col justify-evenly gap-2 px-2">
        {[0, 1].map((shelfIndex) => (
          <Shelf
            key={shelfIndex}
            plants={slots.slice(shelfIndex * 3, shelfIndex * 3 + 3)}
            shovelling={shovelling}
            onDig={setPendingRemoval}
          />
        ))}
      </div>

      {ready && garden.length === 0 && (
        <p className="pixel-panel absolute inset-x-6 top-1/2 -translate-y-1/2 p-4 text-center text-xs leading-relaxed">
          Your shelf is bare. Scan a plant to grow your first Plantemon.
        </p>
      )}

      {pendingRemoval && (
        <RemoveDialog
          plant={pendingRemoval}
          busy={removing}
          onConfirm={confirmRemoval}
          onCancel={() => setPendingRemoval(null)}
        />
      )}
    </main>
  );
}

/** One plank with three potted slots resting on it. */
function Shelf({
  plants,
  shovelling,
  onDig,
}: {
  plants: (Plant | undefined)[];
  shovelling: boolean;
  onDig: (plant: Plant) => void;
}) {
  return (
    <section className="relative">
      {/* Slots sit directly on the plank, which is drawn behind their feet. */}
      <div className="relative z-10 flex items-end justify-around">
        {plants.map((plant, index) => (
          <Slot
            key={plant?.id ?? `empty-${index}`}
            plant={plant}
            shovelling={shovelling}
            onDig={onDig}
          />
        ))}
      </div>
      <Image
        src="/img/ic_shelf.png"
        alt=""
        width={600}
        height={40}
        className="-mt-2 h-5 w-full object-fill sm:h-8"
      />
    </section>
  );
}

/**
 * A pot with, when occupied, the plant's sprite sitting inside it. Compositing
 * the two — rather than the Android trick of swapping the pot image out for the
 * sprite — keeps every slot visually anchored to the shelf instead of floating.
 */
function Slot({
  plant,
  shovelling,
  onDig,
}: {
  plant: Plant | undefined;
  shovelling: boolean;
  onDig: (plant: Plant) => void;
}) {
  const body = (
    <div className="relative flex h-24 w-full items-end justify-center sm:h-28">
      <Image
        src="/img/ic_pot_empty.png"
        alt={plant ? "" : "Empty pot"}
        width={90}
        height={90}
        className="h-14 w-14 object-contain sm:h-16 sm:w-16"
      />
      {plant?.spritePath && (
        // Sprite sits in the pot, painted above it (z-10) with its feet just
        // inside the rim. Sprites are data URLs / remote blobs, so the Next
        // image optimizer is bypassed.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={plant.spritePath}
          alt=""
          className={`pixelated absolute bottom-7 z-10 h-16 w-16 object-contain sm:bottom-9 sm:h-20 sm:w-20 ${
            shovelling ? "wiggle" : ""
          }`}
        />
      )}
    </div>
  );

  if (!plant) {
    return <div className="flex w-1/3 flex-col items-center opacity-90">{body}</div>;
  }

  const label = (
    <span className="font-pixel text-outline max-w-full truncate px-1 text-[7px] text-white sm:text-[9px]">
      {plant.getName()}
    </span>
  );

  // Shovelling: tapping digs the plant up instead of opening its info card.
  if (shovelling) {
    return (
      <button
        type="button"
        onClick={() => onDig(plant)}
        aria-label={`Dig up ${plant.getName()}`}
        className="press flex w-1/3 flex-col items-center"
      >
        {body}
        {label}
      </button>
    );
  }

  return (
    <Link
      href={`/garden/${plant.id}`}
      aria-label={plant.getName()}
      className="press flex w-1/3 flex-col items-center"
    >
      {body}
      {label}
    </Link>
  );
}

/** Confirms a permanent removal — the delete hits the cloud garden. */
function RemoveDialog({
  plant,
  busy,
  onConfirm,
  onCancel,
}: {
  plant: Plant;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
      <div className="pixel-panel w-full max-w-xs p-4 text-center">
        <div className="text-3xl">🪏</div>
        <h2 className="font-pixel mt-2 text-xs leading-relaxed">Dig up {plant.getName()}?</h2>
        <p className="mt-2 text-[10px] leading-relaxed opacity-80">
          This removes it from your garden for good.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{ background: "var(--color-plantemon-hp-low)", color: "#fff" }}
            className="press pixel-button flex-1 px-2 py-2 text-[9px]"
          >
            {busy ? "Digging…" : "Dig up"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="press pixel-button px-3 py-2 text-[9px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
