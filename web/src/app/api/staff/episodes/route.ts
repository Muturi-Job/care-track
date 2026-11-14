import { errorBody, readJsonBody, failureResponse } from "@/lib/staff/http";
import { createEpisode, loadEpisodes } from "@/lib/staff/server";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: same gap as the Rails endpoints behind these handlers.

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    return Response.json({ episodes: await loadEpisodes(query) });
  } catch (error) {
    return failureResponse(error, "Could not load episodes.");
  }
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === null) {
    return Response.json(errorBody("invalid_request", "Send a JSON body."), { status: 400 });
  }

  const alias = typeof body.alias === "string" ? body.alias.trim() : "";
  const bed = typeof body.bed === "string" ? body.bed.trim() : "";
  const procedureTemplateId =
    typeof body.procedureTemplateId === "string" ? body.procedureTemplateId.trim() : "";

  if (alias === "" || bed === "" || procedureTemplateId === "") {
    return Response.json(
      errorBody("invalid_request", "Alias, procedure and bed are required."),
      { status: 400 },
    );
  }

  try {
    const episode = await createEpisode({ alias, bed, procedureTemplateId });

    return Response.json({ episode }, { status: 201 });
  } catch (error) {
    return failureResponse(error, "Could not create the episode.");
  }
}
