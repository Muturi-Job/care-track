import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: inquiry logging is staff-only once access control exists.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const channel = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).channel
    : undefined;
  if (!["phone", "desk", "ward", "other"].includes(String(channel))) {
    return Response.json({ error: "invalid_channel", message: "Choose phone, desk, ward, or other." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/episodes/${encodeURIComponent(id)}/inquiries`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "idempotency-key": request.headers.get("idempotency-key") ?? "",
      },
      body: JSON.stringify({ channel }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return Response.json({ error: "unavailable", message: "The inquiry could not be logged. Please try again." }, { status: 503 });
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
