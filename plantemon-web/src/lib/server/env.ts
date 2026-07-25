import "server-only";

/**
 * Server-side secrets. These replace the BuildConfig fields the Android app
 * compiled in from local.properties.
 *
 * None of these may ever be prefixed NEXT_PUBLIC_ — that would inline them into
 * the client bundle, where anyone can read them out of the network tab. The
 * "server-only" import above turns an accidental client import into a build
 * error rather than a silent leak.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local (see .env.example) — it is the same key the Android app read from local.properties.`,
    );
  }
  return value;
}

/**
 * Resolves secrets up front so a misconfigured deployment reports a config
 * error rather than being mistaken for an upstream network failure.
 * Returns null (and logs) when anything is missing.
 */
export function resolveKeys<T extends Record<string, () => string>>(
  getters: T,
): { [K in keyof T]: string } | null {
  const resolved = {} as { [K in keyof T]: string };
  for (const name of Object.keys(getters) as (keyof T)[]) {
    try {
      resolved[name] = getters[name]();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return null;
    }
  }
  return resolved;
}

export const serverEnv = {
  get plantApiKey() {
    return required("PLANT_API_KEY");
  },
  /**
   * Key for the NIM chat endpoint that runs Gemma-3.
   *
   * Both this and the Flux key are NVIDIA credentials — what differs is the
   * model — so they are named for the model they authenticate. NVIDIA_API_KEY
   * stays accepted as a fallback, matching the Android BuildConfig field.
   */
  get gemmaApiKey() {
    return process.env.GEMMA_API_KEY || required("NVIDIA_API_KEY");
  },
  get fluxApiKey() {
    return process.env.FLUX_API_KEY || required("NVIDIA_API_KEY");
  },
  /**
   * Google AI Studio key for the Gemini vision hop.
   *
   * Optional by design: it is the preferred path (measured ~1.5s median against
   * gemma-4-31b-it's 69s-or-timeout), but when it is absent or its credits run
   * out the sprite route falls back to the NVIDIA models above. A missing key
   * therefore costs latency, not a working scan.
   */
  get geminiKey() {
    return process.env.GEMINI_KEY || null;
  },
  /**
   * withoutBG background-removal key. Optional: when absent, sprite generation
   * skips the cutout step and returns the raw render, so a missing key degrades
   * rather than failing.
   */
  get withoutbgKey() {
    return process.env.WITHOUTBG_KEY || null;
  },
};
