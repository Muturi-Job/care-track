const DEFAULT_API_BASE_URL = "http://localhost:3001";

export type HealthStatus = "ok" | "degraded" | "unreachable";
export type DatabaseStatus = "ok" | "unavailable" | "unknown";

export type ApiHealth = {
  reachable: boolean;
  status: HealthStatus;
  database: DatabaseStatus;
};

export const UNREACHABLE: ApiHealth = {
  reachable: false,
  status: "unreachable",
  database: "unknown",
};

/**
 * Maps an untrusted health payload to the shape the UI renders.
 * Anything unexpected is treated as unreachable rather than guessed at.
 */
export function parseHealth(body: unknown): ApiHealth {
  if (typeof body !== "object" || body === null) return UNREACHABLE;

  const { status, database } = body as Record<string, unknown>;
  if (status !== "ok" && status !== "degraded") return UNREACHABLE;

  return {
    reachable: true,
    status,
    database: database === "ok" || database === "unavailable" ? database : "unknown",
  };
}

/** Called from the server only: the browser never talks to the API directly. */
export async function fetchApiHealth(): Promise<ApiHealth> {
  const baseUrl = process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return UNREACHABLE;

    return parseHealth(await response.json());
  } catch {
    return UNREACHABLE;
  }
}
