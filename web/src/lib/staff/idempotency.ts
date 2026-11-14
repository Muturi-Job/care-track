/**
 * One fresh key per tap, so a retried tap cannot move a patient twice.
 * The API accepts any opaque string up to 100 characters.
 */
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `tap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
