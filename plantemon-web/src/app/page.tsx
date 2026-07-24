import Image from "next/image";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

/**
 * Public landing page — the marketing overview at /, one step before the game.
 *
 * Deliberately outside the (app) route group, so it renders without the auth
 * gate. The signed-in hub now lives at /home; the only way through from here is
 * the nav, which swaps its calls to action once Clerk reports a session.
 *
 * Unlike the game screens this is a normal scrolling document, so it does not
 * use .screen — that class pins to 100dvh and clips overflow, which is right
 * for a fixed game board and wrong for a page with sections below the fold.
 */

export const metadata = {
  title: "Sprout — Scan real plants. Battle them.",
  description:
    "Point your camera at any plant. Sprout identifies the species, generates a pixel-art creature from it, and gives it moves drawn from its real botanical taxonomy.",
};

/**
 * Session-gated slots.
 *
 * Clerk 7 replaced the old <SignedIn> / <SignedOut> components with a single
 * <Show when="signed-in" | "signed-out">. Both are wrapped here because <Show>
 * still needs a ClerkProvider, which the preview layout deliberately omits so
 * it can render without keys — so under NEXT_PUBLIC_PREVIEW=1 these fall back
 * to the signed-out view rather than throwing.
 */
const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";

function WhenSignedOut({ children }: { children: React.ReactNode }) {
  if (PREVIEW) return <>{children}</>;
  return <Show when="signed-out">{children}</Show>;
}

function WhenSignedIn({ children }: { children: React.ReactNode }) {
  if (PREVIEW) return null;
  return <Show when="signed-in">{children}</Show>;
}

/** The core loop, in the order a new player meets it. */
const STEPS = [
  {
    n: "01",
    title: "Scan",
    art: "/img/ic_nav_camera.png",
    body: "Point your camera at any plant. Sprout identifies the species and pulls its real botanical record — light, soil, watering, toxicity.",
  },
  {
    n: "02",
    title: "Grow",
    art: "/img/ic_nav_garden.png",
    body: "An AI renders that species as a pixel-art creature and plants it on your shelf. Six pots, and every sprite is unique to the plant you scanned.",
  },
  {
    n: "03",
    title: "Battle",
    art: "/img/ic_nav_adventure.png",
    body: "Moves come from the plant's actual taxonomic class — mosses, ferns, conifers and flowering plants each fight differently. Then take it to a turn-based match.",
  },
];

const FEATURES = [
  {
    title: "Real species, real data",
    body: "Every creature is backed by the plant's botanical record: common names, description, growing conditions, cultural significance and toxicity.",
  },
  {
    title: "Sprites generated per plant",
    body: "A language model describes your plant as a creature, and an image model renders it as a 192×192 sprite. No two gardens look alike.",
  },
  {
    title: "Taxonomy-driven movesets",
    body: "A decision tree maps the plant's real taxonomic class onto a move pool, so a fern and a conifer genuinely play differently.",
  },
  {
    title: "Works offline",
    body: "Your garden mirrors to the device, so it stays readable without a connection — and a manual fallback keeps scanning usable if the plant API is down.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-sprout min-h-full text-white">
      <SiteNav />

      {/* ---------- Hero ---------- */}
      <header className="relative isolate overflow-hidden">
        <Image
          src="/img/bg_home.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-20 object-cover"
        />
        {/*
         * Scrim: enough to hold white copy, not so much that the painted scene
         * flattens into a plain green field. Solid at the foot so the section
         * below joins onto it seamlessly.
         */}
        <div className="from-sprout/70 via-sprout/60 to-sprout absolute inset-0 -z-10 bg-gradient-to-b" />

        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <Image
            src="/brand/sprout_wordmark_white.png"
            alt="Sprout"
            width={453}
            height={203}
            loading="eager"
            className="mx-auto h-auto w-[min(280px,64vw)] drop-shadow-[0_3px_16px_rgba(0,0,0,0.55)]"
          />

          <h1 className="mt-8 text-3xl leading-tight font-semibold text-balance sm:text-5xl">
            Turn the plants around you into creatures that fight.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Point your camera at any plant. Sprout identifies the species, renders it as a pixel-art
            creature, and gives it a moveset drawn from its real botanical taxonomy.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <WhenSignedOut>
              <Link
                href="/sign-up"
                className="press pixel-button w-full px-6 py-4 text-[10px] sm:w-auto"
              >
                Start scanning
              </Link>
              <Link
                href="/sign-in"
                className="press pixel-button pixel-panel-dark w-full px-6 py-4 text-[10px] sm:w-auto"
              >
                I have an account
              </Link>
            </WhenSignedOut>
            <WhenSignedIn>
              <Link
                href="/home"
                className="press pixel-button w-full px-6 py-4 text-[10px] sm:w-auto"
              >
                Open Sprout
              </Link>
            </WhenSignedIn>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Free to play. Installs to your home screen as an app.
          </p>
        </div>
      </header>

      {/* ---------- How it works ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeading eyebrow="How it works" title="Three steps, one plant." />

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="pixel-panel-dark flex flex-col p-6">
              <div className="flex items-center gap-4">
                <Image
                  src={step.art}
                  alt=""
                  width={200}
                  height={200}
                  className="h-16 w-16 shrink-0 object-contain"
                />
                <span className="font-pixel text-2xl text-white/25">{step.n}</span>
              </div>
              <h3 className="font-pixel mt-5 text-sm">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Features ---------- */}
      <section className="border-y border-white/10 bg-black/15">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="What's under it"
            title="It's a real plant identifier wearing a game."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="pixel-panel-dark p-6">
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/70">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing call to action ---------- */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/img/bg_garden.jpeg"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="from-sprout via-sprout/65 to-sprout absolute inset-0 -z-10 bg-gradient-to-b" />

        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <Image
            src="/brand/sprout_mark_white.png"
            alt=""
            width={1356}
            height={2022}
            className="mx-auto h-16 w-16 object-contain opacity-90"
          />
          <h2 className="mt-6 text-2xl leading-tight font-semibold text-balance sm:text-4xl">
            There&apos;s a plant within arm&apos;s reach. Go scan it.
          </h2>
          <div className="mt-8 flex justify-center">
            <WhenSignedOut>
              <Link href="/sign-up" className="press pixel-button px-6 py-4 text-[10px]">
                Create your garden
              </Link>
            </WhenSignedOut>
            <WhenSignedIn>
              <Link href="/home" className="press pixel-button px-6 py-4 text-[10px]">
                Open Sprout
              </Link>
            </WhenSignedIn>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <Image
            src="/brand/sprout_wordmark_white.png"
            alt="Sprout"
            width={453}
            height={203}
            className="h-auto w-24 opacity-70"
          />
          <p className="text-xs text-white/45">Scan real plants. Battle them.</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Top bar. Sticky, so the way in stays reachable however far the page scrolls.
 * The right-hand side is the whole point of this page, so it swaps to the app
 * once Clerk reports a session rather than inviting a second sign-up.
 */
function SiteNav() {
  return (
    <nav className="bg-sprout/85 sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm">
      <div className="safe-top mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-3 sm:px-6">
        <Link href="/" aria-label="Sprout home" className="press shrink-0">
          <Image
            src="/brand/sprout_wordmark_white.png"
            alt="Sprout"
            width={453}
            height={203}
            className="h-auto w-24 sm:w-28"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <WhenSignedOut>
            <Link
              href="/sign-in"
              className="press px-3 py-2 text-sm font-medium text-white/80 hover:text-white"
            >
              Log in
            </Link>
            <Link href="/sign-up" className="press pixel-button px-4 py-3 text-[9px]">
              Sign up
            </Link>
          </WhenSignedOut>
          <WhenSignedIn>
            <Link href="/home" className="press pixel-button px-4 py-3 text-[9px]">
              Open app
            </Link>
            <UserButton />
          </WhenSignedIn>
        </div>
      </div>
    </nav>
  );
}

/** Eyebrow label above a section title — the pixel font's job on this page. */
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-pixel text-[10px] tracking-wide text-white/40 uppercase">{eyebrow}</p>
      <h2 className="mt-4 text-2xl leading-tight font-semibold text-balance sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
