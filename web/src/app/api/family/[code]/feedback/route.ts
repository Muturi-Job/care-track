import { apiBaseUrl } from "@/lib/api";
import { FEEDBACK_OPTIONS } from "@/lib/family/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: the tracking code is the whole of the access in
// Phase A (CLAUDE.md rule 3); feedback is as public as the page itself.

type FeedbackContext = { params: Promise<{ code: string }> };

/** One answer, forwarded with the tracking code and nothing else (rule 2). */
export async function POST(request: Request, { params }: FeedbackContext) {
  const { code } = await params;
  const body: unknown = await request.json().catch(() => null);
  const answer =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).answer
      : undefined;

  if (!FEEDBACK_OPTIONS.some((option) => option.value === answer)) {
    return Response.json(
      { error: "invalid_answer", message: "Please choose one of the answers." },
      { status: 400 },
    );
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${apiBaseUrl()}/api/v1/family/${encodeURIComponent(code)}/feedback`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ answer }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return Response.json(
      { error: "unavailable", message: "We could not save your answer. Please try again." },
      { status: 503 },
    );
  }

  const text = await upstream.text();

  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
