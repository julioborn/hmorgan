import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "H Morgan Bar",
        short_name: "HMorgan",
        description: "Programa de puntos de H Morgan Bar",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f172a",
        theme_color: "#10b981",
        icons: [
            { src: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
            { src: "/icon-72x72.png", sizes: "72x72", type: "image/png" },
            { src: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
            { src: "/icon-128x128.png", sizes: "128x128", type: "image/png" },
            { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
            { src: "/icon-384x384.png", sizes: "384x384", type: "image/png" },
            { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
            // máscara para Android
            { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            // iOS (además de apple-touch-icon en public/)
            { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
        ]
    };
}
