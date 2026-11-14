import { headers } from "next/headers";

/**
 * Absolute origin for family links, taken from the request the staff member is
 * already using. Server-side only, so the browser never has to guess its host.
 */
export async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (isLocalHost(host) ? "http" : "https");

  return `${proto}://${host}`;
}

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}
