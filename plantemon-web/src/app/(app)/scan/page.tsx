"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { BackButton } from "@/components/back-button";
import { MAX_GARDEN_SIZE, useGarden } from "@/components/garden-provider";
import { captureFrame, fileToJpegDataUrl } from "@/lib/client/image";
import { buildPlant, generateSprite, identifyPlant } from "@/lib/client/scan-pipeline";

/**
 * Port of ui/ScanActivity.java + layout/activity_scan.xml.
 *
 * Camera handling differs most from Android. Two input paths are offered:
 *  - a live getUserMedia preview, when the browser grants it
 *  - a file input with `capture="environment"`, which opens the camera app
 *    directly and is the reliable path on iOS
 *
 * The Android "test image" button is kept as a third path, so the pipeline can
 * be exercised without a real plant to hand.
 */

/** The client-visible stages of a scan, in order. */
type ScanStep = "identify" | "sprite" | "save";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; step: ScanStep; plantName?: string; usingPhoto?: boolean }
  | { kind: "naming"; photo: string }
  | { kind: "done"; sprite: string; name: string }
  | { kind: "error"; message: string };

export default function ScanPage() {
  const { garden, addPlant } = useGarden();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against overlapping runs, like ScanActivity's AtomicBoolean.
  const processingRef = useRef(false);

  const gardenFull = garden.length >= MAX_GARDEN_SIZE;

  // Start the live preview, and always release the camera on unmount —
  // otherwise the indicator light stays on after navigating away.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Live camera is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        // The <video> only mounts once cameraReady flips true, so videoRef is
        // still null here. A separate effect attaches the stream after mount.
        setCameraReady(true);
      } catch {
        // Permission denied or unsupported: the file-input path still works.
        setCameraError("Camera unavailable — use Upload instead.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Attach the captured stream once the <video> element actually exists. This
  // runs after cameraReady flips true and the element mounts — doing it inside
  // the getUserMedia callback failed because the ref was still null then.
  useEffect(() => {
    const video = videoRef.current;
    if (cameraReady && video && streamRef.current) {
      video.srcObject = streamRef.current;
      // Attaching srcObject after mount doesn't reliably trigger autoPlay, so
      // start it explicitly. Safe to ignore the promise — it's muted+inline.
      void video.play().catch(() => {});
    }
  }, [cameraReady]);

  /** The shared tail of every input path. */
  const runPipeline = useCallback(
    async (jpegDataUrl: string) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        setStatus({ kind: "busy", step: "identify" });
        const { identification } = await identifyPlant(jpegDataUrl);

        if (!identification) {
          // Could not identify — ask the user to name it.
          setStatus({ kind: "naming", photo: jpegDataUrl });
          return;
        }

        const name = identification.name;
        setStatus({ kind: "busy", step: "sprite", plantName: name });
        const sprite = await generateSprite(jpegDataUrl, name, () =>
          setStatus((s) => (s.kind === "busy" ? { ...s, usingPhoto: true } : s)),
        );

        setStatus({ kind: "busy", step: "save", plantName: name });
        const plant = buildPlant(identification, name, sprite);
        await addPlant(plant);

        setStatus({ kind: "done", sprite, name: plant.getName() });
      } catch (error) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Something went wrong.",
        });
      } finally {
        processingRef.current = false;
      }
    },
    [addPlant],
  );

  /** Completes the manual-name path after identification failed. */
  const saveNamedPlant = useCallback(
    async (photo: string, rawName: string) => {
      processingRef.current = true;
      try {
        const name = rawName.trim() || "Unknown Plant";
        // Identification already ran (and failed) on this path, so the stepper
        // starts at the sprite stage with the identify step shown as done.
        setStatus({ kind: "busy", step: "sprite", plantName: name });

        const sprite = await generateSprite(photo, name, () =>
          setStatus((s) => (s.kind === "busy" ? { ...s, usingPhoto: true } : s)),
        );

        setStatus({ kind: "busy", step: "save", plantName: name });
        const plant = buildPlant(null, name, sprite);
        await addPlant(plant);

        setStatus({ kind: "done", sprite, name: plant.getName() });
      } catch (error) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not save that plant.",
        });
      } finally {
        processingRef.current = false;
      }
    },
    [addPlant],
  );

  const onCapture = useCallback(() => {
    if (!videoRef.current || !cameraReady) return;
    void runPipeline(captureFrame(videoRef.current));
  }, [cameraReady, runPipeline]);

  const onFilePicked = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        void runPipeline(await fileToJpegDataUrl(file));
      } catch (error) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not read that image.",
        });
      }
    },
    [runPipeline],
  );

  const onTestImage = useCallback(async () => {
    const response = await fetch("/img/test_plant.jpg");
    void runPipeline(await fileToJpegDataUrl(await response.blob()));
  }, [runPipeline]);

  const busy = status.kind === "busy";

  return (
    <main className="screen flex flex-col bg-black">
      {/* Live preview, or the painted background when unavailable */}
      {cameraReady ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : (
        <Image src="/img/bg_scan.png" alt="" fill sizes="100vw" className="-z-10 object-cover" />
      )}

      <div className="safe-top flex items-center justify-between px-3">
        <BackButton />
        {gardenFull && (
          <span className="pixel-panel px-2 py-1 text-[8px]">Garden full ({MAX_GARDEN_SIZE})</span>
        )}
      </div>

      {/* Viewfinder framing, borrowed from the scanner patterns */}
      <div className="pointer-events-none flex flex-1 items-center justify-center p-8">
        <div className="relative aspect-square w-full max-w-sm">
          {[
            "left-0 top-0 border-l-4 border-t-4",
            "right-0 top-0 border-r-4 border-t-4",
            "left-0 bottom-0 border-l-4 border-b-4",
            "right-0 bottom-0 border-r-4 border-b-4",
          ].map((corner) => (
            <span key={corner} className={`absolute h-10 w-10 border-white/90 ${corner}`} />
          ))}
        </div>
      </div>

      {/* Error / camera-hint line (the busy state uses the full overlay below) */}
      <div className="px-6 text-center">
        {status.kind === "error" && (
          <p className="pixel-panel inline-block px-3 py-2 text-[9px] leading-relaxed text-red-700">
            {status.message}
          </p>
        )}
        {status.kind === "idle" && cameraError && (
          <p className="pixel-panel inline-block px-3 py-2 text-[9px]">{cameraError}</p>
        )}
      </div>

      {/* Full-screen progress while the pipeline runs — the long, opaque wait. */}
      {busy && <ScanProgress step={status.step} plantName={status.plantName} usingPhoto={status.usingPhoto} />}

      {/* Action row: upload | capture | test */}
      <div className="safe-bottom mt-4 flex items-center justify-around px-8">
        <button
          type="button"
          disabled={busy || gardenFull}
          onClick={() => fileInputRef.current?.click()}
          className="press pixel-button px-3 py-2 text-[9px] disabled:cursor-not-allowed"
        >
          Upload
        </button>

        <button
          type="button"
          aria-label="Capture photo"
          disabled={busy || gardenFull || !cameraReady}
          onClick={onCapture}
          className="press flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
        >
          <span className="h-16 w-16 rounded-full bg-white" />
        </button>

        <button
          type="button"
          disabled={busy || gardenFull}
          onClick={onTestImage}
          className="press pixel-button px-3 py-2 text-[9px] disabled:cursor-not-allowed"
        >
          Test
        </button>
      </div>

      {/*
        capture="environment" asks the OS for the rear camera directly. This is
        the dependable path on iOS, where getUserMedia can be unavailable.
      */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void onFilePicked(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {status.kind === "naming" && (
        <NameDialog
          onCancel={() => setStatus({ kind: "idle" })}
          onSubmit={(name) => void saveNamedPlant(status.photo, name)}
        />
      )}

      {status.kind === "done" && (
        <ResultDialog
          sprite={status.sprite}
          name={status.name}
          onDismiss={() => setStatus({ kind: "idle" })}
        />
      )}
    </main>
  );
}

/** The scan stages, in order, for the progress stepper. */
const SCAN_STEPS: { key: ScanStep; label: string }[] = [
  { key: "identify", label: "Identifying plant" },
  { key: "sprite", label: "Creating sprite" },
  { key: "save", label: "Adding to garden" },
];

/**
 * Sub-labels shown under the (long, opaque) sprite step. They mirror what the
 * server actually does — describe, render, cut out — and cycle on a timer so
 * the wait shows life. The API is a single call, so these are indicative of the
 * work in flight rather than observed transitions.
 */
const SPRITE_SUBSTEPS = [
  "Imagining its features…",
  "Painting the pixels…",
  "Trimming the background…",
];

/**
 * Full-screen scan progress. Replaces the old single status line with an
 * obvious stepper: each stage shows a spinner while active, a check once done,
 * and dims until reached.
 */
function ScanProgress({
  step,
  plantName,
  usingPhoto,
}: {
  step: ScanStep;
  plantName?: string;
  usingPhoto?: boolean;
}) {
  const currentIndex = SCAN_STEPS.findIndex((s) => s.key === step);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-6">
      <div className="pixel-panel w-full max-w-xs p-5">
        <h2 className="font-pixel text-center text-xs leading-relaxed">
          {plantName ? `Growing ${plantName}` : "Scanning…"}
        </h2>

        <ol className="mt-5 space-y-4">
          {SCAN_STEPS.map((s, index) => {
            const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";
            return (
              <li key={s.key} className="flex items-start gap-3">
                <StepMarker state={state} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-pixel text-[10px] leading-relaxed ${
                      state === "pending" ? "opacity-40" : ""
                    }`}
                  >
                    {s.label}
                  </p>
                  {state === "active" && s.key === "sprite" && (
                    <SpriteSubLabel usingPhoto={usingPhoto} />
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-5 text-center text-[9px] leading-relaxed opacity-60">
          This can take up to a minute. Keep the app open.
        </p>
      </div>
    </div>
  );
}

/** The bullet for a step: check when done, spinner when active, dot when pending. */
function StepMarker({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="bg-hp-high flex h-5 w-5 shrink-0 items-center justify-center border-2 border-black text-[10px] text-white">
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="spin mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-black border-t-transparent" />
    );
  }
  return <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-black/40" />;
}

/** Rotating sub-caption for the sprite step, or the photo-fallback note. */
function SpriteSubLabel({ usingPhoto }: { usingPhoto?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (usingPhoto) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SPRITE_SUBSTEPS.length), 3500);
    return () => clearInterval(id);
  }, [usingPhoto]);

  if (usingPhoto) {
    return <p className="mt-1 text-[9px] leading-relaxed opacity-80">Using your photo instead.</p>;
  }
  return <p className="pulse-soft mt-1 text-[9px] leading-relaxed opacity-80">{SPRITE_SUBSTEPS[index]}</p>;
}

/** Port of ScanActivity.showNameDialog. */
function NameDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <Overlay>
      <h2 className="text-xs">Name this plant</h2>
      <p className="mt-2 text-[9px] leading-relaxed opacity-80">
        Couldn&apos;t identify it automatically. What would you like to call it?
      </p>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Rose, Sunflower…"
        className="mt-3 w-full border-2 border-black px-2 py-2 text-[10px]"
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(name)}
          className="press pixel-button flex-1 px-2 py-2 text-[9px]"
        >
          Add to Garden
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="press pixel-button px-2 py-2 text-[9px]"
        >
          Cancel
        </button>
      </div>
    </Overlay>
  );
}

function ResultDialog({
  sprite,
  name,
  onDismiss,
}: {
  sprite: string;
  name: string;
  onDismiss: () => void;
}) {
  return (
    <Overlay>
      <h2 className="text-center text-xs">Done!</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sprite} alt="" className="pixelated mx-auto mt-3 h-40 w-40 object-contain" />
      <p className="mt-2 text-center text-[10px] leading-relaxed">{name}</p>
      <p className="mt-1 text-center text-[8px] opacity-70">Added to your garden.</p>
      <button
        type="button"
        onClick={onDismiss}
        className="press pixel-button mt-4 w-full px-2 py-2 text-[9px]"
      >
        Scan another
      </button>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
      <div className="pixel-panel w-full max-w-xs p-4">{children}</div>
    </div>
  );
}
