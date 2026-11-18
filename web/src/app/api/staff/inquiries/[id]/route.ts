import { apiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: inquiry undo is staff-only once access control exists.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/inquiries/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return Response.json({ error: "unavailable", message: "The inquiry could not be undone." }, { status: 503 });
  }
  return new Response(null, { status: upstream.status });
}
