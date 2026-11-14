/** Family links and the WhatsApp share button. Pure functions, easy to test. */

export function familyUrl(origin: string, familyPath: string): string {
  if (origin === "") return familyPath;

  return `${origin.replace(/\/+$/, "")}${familyPath}`;
}

/** Short and friendly: no stage detail, no diagnosis, just the private link. */
export function familyShareMessage(alias: string, url: string): string {
  return `Here's the link to follow ${alias}'s progress: ${url}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
