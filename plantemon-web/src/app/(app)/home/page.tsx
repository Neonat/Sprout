"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { MAX_GARDEN_SIZE, useGarden } from "@/components/garden-provider";

/**
 * Home hub — the landing screen, in Sprout branding.
 *
 * Supersedes the direct port of activity_main.xml, which placed each icon at a
 * fixed percentage of the viewport using the original ConstraintLayout biases.
 * Those positions drifted between phone aspect ratios, gave every destination
 * an oddly shaped tap target, and left the screen saying nothing about the
 * player.
 *
 * The structure here is the one game hubs converge on: the painted scene up top
 * carrying the identity, a strip of progress stats, then one primary action
 * with the remaining destinations as tiles beneath it. Everything sits in
 * normal flow, so targets stay large and the layout survives any screen height.
 *
 * Icon rotation from the old layout is dropped — charming when the icons
 * floated free over the art, noisy once they sit inside aligned tiles.
 *
 * The lockup follows the convention landing heroes settled on — centred mark,
 * one line of copy, then the primary action — with the brand-green scrim doing
 * the job a contained card does on busier hero backgrounds.
 */
export default function HomePage() {
  const { garden, ready, offline } = useGarden();

  const speciesCount = new Set(garden.map((plant) => plant.getName())).size;

  /**
   * Each tile's second line reflects live garden state, so the hub reports
   * where the player actually is rather than being a row of inert buttons.
   */
  const destinations = [
    {
      href: "/garden",
      label: "Garden",
      icon: "/img/ic_nav_garden.png",
      detail: !ready
        ? "Loading…"
        : garden.length === 0
          ? "No plants yet"
          : `${garden.length} of ${MAX_GARDEN_SIZE} pots filled`,
    },
    {
      href: "/battle",
      label: "Adventure",
      icon: "/img/ic_nav_adventure.png",
      // Battle turns away an empty garden; say so here rather than on arrival.
      detail: !ready
        ? "Loading…"
        : garden.length === 0
          ? "Scan a plant first"
          : "Battle Gary (BOT)",
    },
  ];

  return (
    <main className="screen screen-scrollable flex flex-col">
      {/* The LCP element, so this is the one image worth preloading. */}
      <Image
        src="/img/bg_home.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/*
       * Scrim in the brand green rather than neutral black. Weighted to both
       * ends: the top pass carries the wordmark, the bottom one seats the tiles.
       * The middle stays clear so the painted scene still reads.
       */}
      <div className="from-sprout/90 via-sprout/25 to-sprout/85 absolute inset-0 -z-10 bg-gradient-to-b" />

      {/* Account menu — the only route to signing out */}
      <div className="safe-top flex items-center justify-end px-3">
        <UserButton />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">
        {/* min-h-0 lets the hero absorb the slack, and give it back on short screens. */}
        <header className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-4 sm:gap-4">
          {/*
           * The Sprout wordmark, lifted off its brand-green card so it can sit
           * on the painted scene. Capped at 230px because that is close to the
           * source resolution — scaling past it would go soft.
           */}
          <Image
            src="/brand/sprout_wordmark_white.png"
            alt="Sprout"
            width={453}
            height={203}
            loading="eager"
            className="h-auto max-h-[18dvh] w-[min(230px,58vw)] object-contain drop-shadow-[0_3px_14px_rgba(32,55,39,0.9)]"
          />

          {/*
           * Body font, not pixel: the brand wordmark is a brush script, and
           * setting the tagline in Press Start 2P underneath it read as two
           * unrelated logos rather than one lockup.
           */}
          <p className="text-soft-shadow text-center text-sm leading-relaxed font-medium text-white">
            Scan real plants. Battle them.
          </p>

          <div className="flex items-stretch gap-2">
            <Stat label="Plants" value={ready ? `${garden.length}/${MAX_GARDEN_SIZE}` : "—"} />
            <Stat label="Species" value={ready ? `${speciesCount}` : "—"} />
            {offline && <Stat label="Mode" value="Offline" />}
          </div>
        </header>

        {/* Scanning is the core loop, so it gets the widest tile and the largest target. */}
        <Link
          href="/scan"
          className="press pixel-panel pixel-panel-brand flex items-center gap-3 p-3"
        >
          {/*
           * The Sprout mark — a seedling inside a camera aperture — is a literal
           * picture of what this tile does, so it replaces the camera icon here.
           */}
          <Image
            src="/brand/sprout_mark_green.png"
            alt=""
            width={1356}
            height={2022}
            className="h-16 w-16 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="font-pixel text-sprout block text-sm">Scan</span>
            <span className="text-sprout/70 mt-1.5 block text-xs leading-snug">
              Turn a real plant into a Plantemon
            </span>
          </span>
          <span aria-hidden="true" className="font-pixel text-sprout/40 ml-auto shrink-0 text-sm">
            &gt;
          </span>
        </Link>

        <nav className="safe-bottom mt-3 grid grid-cols-2 gap-3">
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="press pixel-panel pixel-panel-brand flex flex-col items-center gap-1.5 p-3 text-center"
            >
              <Image
                src={destination.icon}
                alt=""
                width={170}
                height={170}
                className="h-14 w-14 object-contain"
              />
              <span className="font-pixel text-sprout text-[11px]">{destination.label}</span>
              <span className="text-sprout/70 text-[11px] leading-snug">{destination.detail}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

/** One progress chip: the value, with its unit underneath. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-panel pixel-panel-brand flex flex-col justify-center px-3 py-1.5 text-center">
      <span className="font-pixel text-sprout text-xs">{value}</span>
      <span className="text-sprout/60 mt-1 text-[9px] tracking-wide uppercase">{label}</span>
    </div>
  );
}
