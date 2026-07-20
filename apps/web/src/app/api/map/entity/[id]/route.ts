import { NextResponse } from "next/server";
import { getMapEntityCard } from "@continuum/db";

export const dynamic = "force-dynamic";

/** In-map entity card data — the only client-fetched endpoint; map-scoped. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const card = await getMapEntityCard(id);
  if (card === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(card);
}
