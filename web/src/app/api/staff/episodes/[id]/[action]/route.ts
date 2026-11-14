import { errorBody, failureResponse, readJsonBody } from "@/lib/staff/http";
import {
  advanceEpisode,
  clearFlag,
  flagEpisode,
  undoEpisode,
} from "@/lib/staff/server";
import { DELAY_REASONS } from "@/lib/staff/types";
import type { StatusFlag } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: same gap as the Rails endpoints behind this handler.

type ActionContext = { params: Promise<{ id: string; action: string }> };

/** One route for the four staff actions, so the browser has one URL shape. */
export async function POST(request: Request, { params }: ActionContext) {
  const { id, action } = await params;

  try {
    switch (action) {
      case "advance": {
        const idempotencyKey = request.headers.get("idempotency-key") ?? "";

        return Response.json({ episode: await advanceEpisode(id, idempotencyKey) });
      }

      case "undo":
        return Response.json({ episode: await undoEpisode(id) });

      case "flag": {
        const body = await readJsonBody(request);
        if (body === null) {
          return Response.json(errorBody("invalid_request", "Send a JSON body."), { status: 400 });
        }

        const statusFlag = statusFlagFrom(body.statusFlag);
        if (statusFlag === null) {
          return Response.json(
            errorBody("invalid_request", "Choose delayed or call the care team."),
            { status: 400 },
          );
        }

        const delayReason =
          statusFlag === "delayed"
            ? (DELAY_REASONS.find((reason) => reason === body.delayReason) ?? null)
            : null;

        return Response.json({ episode: await flagEpisode(id, statusFlag, delayReason) });
      }

      case "clear-flag":
        return Response.json({ episode: await clearFlag(id) });

      default:
        return Response.json(errorBody("unknown_action", "Unknown action."), { status: 404 });
    }
  } catch (error) {
    return failureResponse(error, "Could not update the episode.");
  }
}

function statusFlagFrom(value: unknown): StatusFlag | null {
  if (value === "delayed" || value === "call_care_team") return value;

  return null;
}
