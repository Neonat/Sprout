"use client";

/** Sprite edge length, matching ScanActivity.cropToSprite. */
export const SPRITE_SIZE = 192;

/**
 * Longest edge for an upload. The Android app posted full-resolution JPEGs;
 * over mobile data that is slow and can exceed the identify route's size cap,
 * so photos are downscaled before they leave the device.
 */
const MAX_UPLOAD_EDGE = 1280;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode that image."));
    image.src = src;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/** Strips the `data:...;base64,` prefix that the APIs do not want. */
export function toBareBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

/**
 * Normalises any user-supplied image into a downscaled JPEG data URL.
 * Equivalent to ScanActivity.toJpegBytes, plus the resize.
 */
export async function fileToJpegDataUrl(file: Blob): Promise<string> {
  const image = await loadImage(await readAsDataUrl(file));

  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Centre-crops to a square and scales to 192x192.
 *
 * Port of ScanActivity.cropToSprite — the fallback when sprite generation
 * fails, so the plant still gets a usable portrait.
 */
export async function cropToSprite(jpegDataUrl: string): Promise<string> {
  const image = await loadImage(jpegDataUrl);

  const size = Math.min(image.width, image.height);
  const sx = (image.width - size) / 2;
  const sy = (image.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(image, sx, sy, size, size, 0, 0, SPRITE_SIZE, SPRITE_SIZE);

  return canvas.toDataURL("image/png");
}

/** Grabs the current frame from a live <video> as a JPEG data URL. */
export function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}
