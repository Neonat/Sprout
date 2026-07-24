import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { addPlant, listGarden } from "@/lib/db/garden-repository";
import { deserializePlant, serializePlant } from "@/lib/domain/plant-serialization";
import type { SerializedPlant } from "@/lib/domain/plant-serialization";

export const runtime = "nodejs";

/** Matches MAX_GARDEN_SIZE on the client — six pots on the shelf. */
const MAX_GARDEN_SIZE = 6;

/** Lists the signed-in user's garden. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const garden = await listGarden(userId);
    return NextResponse.json({ plants: garden.map(serializePlant) });
  } catch (error) {
    console.error("Failed to load garden:", error);
    return NextResponse.json({ error: "Could not load your garden." }, { status: 500 });
  }
}

/** Adds a scanned plant to the signed-in user's garden. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let payload: SerializedPlant;
  try {
    payload = (await request.json()) as SerializedPlant;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!payload?.name || !Array.isArray(payload.moves)) {
    return NextResponse.json({ error: "Malformed plant." }, { status: 400 });
  }

  try {
    // Enforced server-side too: the client check is only a courtesy.
    const existing = await listGarden(userId);
    if (existing.length >= MAX_GARDEN_SIZE) {
      return NextResponse.json(
        { error: `Your garden is full (${MAX_GARDEN_SIZE} plants).` },
        { status: 409 },
      );
    }

    const saved = await addPlant(userId, deserializePlant(payload));
    return NextResponse.json({ plant: serializePlant(saved) }, { status: 201 });
  } catch (error) {
    console.error("Failed to save plant:", error);
    return NextResponse.json({ error: "Could not save that plant." }, { status: 500 });
  }
}
