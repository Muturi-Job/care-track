import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: analytics settings are staff-only once access control exists.
async function forward(method: "GET" | "PATCH", body?: unknown) {
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/settings/metrics`, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return Response.json({ error: "unavailable", message: "Settings are not available right now." }, { status: 503 });
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function GET() {
  return forward("GET");
}

export async function PATCH(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "invalid_request", message: "Send valid settings." }, { status: 400 });
  }
  return forward("PATCH", body);
}
