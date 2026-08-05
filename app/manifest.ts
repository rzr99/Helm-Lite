import type { MetadataRoute } from "next";

// Web app manifest — drives the icon and name when someone installs Helm Lite
// to their home screen (Add to Home Screen / Install app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Helm Lite",
    short_name: "Helm Lite",
    description: "Linear Solutions internal operations",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e0d",
    theme_color: "#0e0e0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
