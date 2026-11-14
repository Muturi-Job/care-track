import { errorBody, failureResponse } from "@/lib/staff/http";
import { loadEpisode } from "@/lib/staff/server";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: same gap as the Rails endpoint behind this handler.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const episode = await loadEpisode(id);
    if (episode === null) {
      return Response.json(errorBody("not_found", "Episode not found."), { status: 404 });
    }

    return Response.json({ episode });
  } catch (error) {
    return failureResponse(error, "Could not load this episode.");
  }
}
