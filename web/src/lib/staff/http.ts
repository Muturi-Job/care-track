import { StaffApiError } from "./server";

/** Helpers shared by the /api/staff route handlers. Server-side only. */

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Every failure carries a `message` the browser can show as-is. */
export function errorBody(code: string, message: string): { error: string; message: string } {
  return { error: code, message };
}

export function failureResponse(error: unknown, fallback: string): Response {
  if (error instanceof StaffApiError) {
    return Response.json(errorBody("staff_request_failed", error.message), {
      status: error.status,
    });
  }

  return Response.json(errorBody("staff_request_failed", fallback), { status: 500 });
}
