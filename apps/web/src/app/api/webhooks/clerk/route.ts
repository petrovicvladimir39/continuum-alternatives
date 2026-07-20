import { Webhook } from "svix";
import { softDeleteMemberProfile, upsertMemberProfile } from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * Clerk → member_profiles sync (Phase 24C), svix-verified.
 *
 * - user.created → upsert profile (id, display name, primary email)
 * - user.deleted → SOFT delete (deleted_at) and NOTHING else — members own
 *   no graph rows, so deletion never cascades into entities/facts/edges.
 * - Unsigned/mis-signed payloads → 400. Missing CLERK_WEBHOOK_SECRET → 503
 *   (the on-demand upsert on /account keeps profiles fresh meanwhile).
 */

type ClerkUserPayload = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
};

function displayNameOf(user: ClerkUserPayload): string | null {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name !== "" ? name : (user.username ?? null);
}

function primaryEmailOf(user: ClerkUserPayload): string | null {
  const addresses = user.email_addresses ?? [];
  const primary = addresses.find((a) => a.id === user.primary_email_address_id) ?? addresses[0];
  return primary?.email_address ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("webhook not configured", { status: 503 });
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: ClerkUserPayload };
  try {
    event = new Webhook(secret).verify(payload, headers) as { type: string; data: ClerkUserPayload };
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  const clerkUserId = event.data.id;
  if (clerkUserId === undefined || clerkUserId === "") {
    return new Response("no user id", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      await upsertMemberProfile({
        clerkUserId,
        displayName: displayNameOf(event.data),
        email: primaryEmailOf(event.data),
      });
      return new Response("ok", { status: 200 });
    }
    case "user.deleted": {
      await softDeleteMemberProfile(clerkUserId);
      return new Response("ok", { status: 200 });
    }
    default:
      // Unhandled event types acknowledge without action.
      return new Response("ignored", { status: 200 });
  }
}
