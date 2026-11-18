import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: the tracking code is the family access in Phase A.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body: unknown = await request.json().catch(() => null);
  const sessionId = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).session_id
    : undefined;
  if (typeof sessionId !== "string" || sessionId.length < 1 || sessionId.length > 36) {
    return Response.json({ error: "invalid_session_id" }, { status: 422 });
  }

  try {
    const upstream = await fetch(`${apiBaseUrl()}/api/v1/family/${encodeURIComponent(code)}/session`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
      signal: AbortSignal.timeout(5_000),
    });
    return new Response(null, { status: upstream.status, headers: { "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
