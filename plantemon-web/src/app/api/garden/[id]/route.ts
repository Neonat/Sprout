import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { deletePlant } from "@/lib/db/garden-repository";

export const runtime = "nodejs";

/**
 * Removes a plant from the signed-in user's garden.
 *
 * Next 16 makes route `params` a promise, so it must be awaited.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;

  try {
    // Scoped by userId, so another user's id simply reports as not found.
    const removed = await deletePlant(userId, id);
    if (!removed) return NextResponse.json({ error: "Plant not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete plant:", error);
    return NextResponse.json({ error: "Could not delete that plant." }, { status: 500 });
  }
}
