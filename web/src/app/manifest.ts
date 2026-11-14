import type { MetadataRoute } from "next";

/**
 * Lets the family page be added to a phone's home screen. The icons are drawn
 * by `npm run icons` (scripts/make-icons.mjs) and committed, so nothing heavy
 * is generated at runtime.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareTrack",
    short_name: "CareTrack",
    description: "Follow a patient's progress through a procedure.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
