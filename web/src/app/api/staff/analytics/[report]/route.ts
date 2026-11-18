import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: analytics are staff-only once access control exists.
const REPORTS = new Set(["overview", "bottlenecks", "delays", "inquiries", "data_quality", "export.csv"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  if (!REPORTS.has(report)) return Response.json({ error: "not_found" }, { status: 404 });

  const query = new URL(request.url).search;
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/analytics/${report}${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return Response.json({ error: "unavailable", message: "Analytics are not available right now." }, { status: 503 });
  }

  const body = await upstream.arrayBuffer();
  const headers = new Headers({ "cache-control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  const disposition = upstream.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (disposition) headers.set("content-disposition", disposition);
  return new Response(body, { status: upstream.status, headers });
}
