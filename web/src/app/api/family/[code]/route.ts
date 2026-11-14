import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: the tracking code in the URL is the whole of the
// access in Phase A (CLAUDE.md rule 3).

type FamilyRouteContext = { params: Promise<{ code: string }> };

/**
 * The conditional poll, server side. The page passes its last ETag as `?etag=`
 * so this handler can set If-None-Match itself; a matching ETag comes back as
 * a 304 with no body, which is all a 10-second poll should cost.
 */
export async function GET(request: Request, { params }: FamilyRouteContext) {
  const { code } = await params;
  const etag =
    request.headers.get("if-none-match") ??
    new URL(request.url).searchParams.get("etag") ??
    "";

  let upstream: Response;

  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/family/${encodeURIComponent(code)}`, {
      cache: "no-store",
      headers: etag === "" ? undefined : { "if-none-match": etag },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return Response.json(
      { error: "unavailable", message: "We cannot update this page right now." },
      { status: 503 },
    );
  }

  const upstreamEtag = upstream.headers.get("etag");

  if (upstream.status === 304) {
    const headers = new Headers({ "cache-control": "no-store" });
    if (upstreamEtag) headers.set("etag", upstreamEtag);

    return new Response(null, { status: 304, headers });
  }

  const body = await upstream.text();
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (upstreamEtag) headers.set("etag", upstreamEtag);

  return new Response(body, { status: upstream.status, headers });
}
