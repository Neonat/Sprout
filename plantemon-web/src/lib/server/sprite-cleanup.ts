import "server-only";
import sharp from "sharp";

/**
 * Longest edge of the finished sprite. Flux renders at 1024, but the sprite is
 * only ever shown at ~64-192px (up to ~2x on retina), so downscaling here keeps
 * the stored data URL small without any visible loss.
 */
const SPRITE_SIZE = 512;

/** Alpha at or below this counts as background for the connected-region pass. */
const OPAQUE_THRESHOLD = 32;

/**
 * Cleans up a withoutBG cutout: keeps only the largest connected opaque region
 * and drops everything else. This removes the stray white islands the matting
 * model occasionally leaves in a corner — the "background didn't fully trim"
 * artifact — while leaving the plant itself untouched.
 *
 * Non-fatal: if anything here throws, the caller keeps the original cutout.
 */
export async function cleanupSprite(base64Png: string): Promise<string> {
  const input = Buffer.from(base64Png, "base64");

  const { data, info } = await sharp(input)
    .resize(SPRITE_SIZE, SPRITE_SIZE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const alphaAt = (i: number) => data[i * channels + (channels - 1)];

  // Label opaque pixels by connected component (4-connectivity), tracking the
  // largest. Iterative flood fill so a big sprite can't blow the call stack.
  const labels = new Int32Array(width * height).fill(-1);
  const stack: number[] = [];
  let bestLabel = -1;
  let bestSize = 0;
  let nextLabel = 0;

  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== -1 || alphaAt(start) <= OPAQUE_THRESHOLD) continue;

    const label = nextLabel++;
    let size = 0;
    stack.push(start);
    labels[start] = label;

    while (stack.length > 0) {
      const p = stack.pop()!;
      size++;
      const x = p % width;
      const y = (p / width) | 0;

      const neighbours = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && labels[n] === -1 && alphaAt(n) > OPAQUE_THRESHOLD) {
          labels[n] = label;
          stack.push(n);
        }
      }
    }

    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
  }

  // Zero the alpha of every pixel outside the winning region.
  if (bestLabel !== -1) {
    for (let p = 0; p < width * height; p++) {
      if (labels[p] !== bestLabel) data[p * channels + (channels - 1)] = 0;
    }
  }

  const out = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  return out.toString("base64");
}
