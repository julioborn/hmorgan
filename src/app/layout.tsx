// src/app/layout.tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/context/auth-context";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "H Morgan Bar",
  description: "Fidelización de clientes para bar/resto",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/favicon-192x192.png",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Forzamos esquema claro a nivel UA para evitar auto-dark
    <html lang="es" style={{ colorScheme: "light" }} className="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Bloquea el color-scheme del navegador en claro */}
        <meta name="color-scheme" content="light" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />

        {/* No agregamos <meta name="theme-color"> manual: lo gestiona `metadata.themeColor` */}
      </head>
      <body className="min-h-svh">
        <RegisterSW />

        {/* Fondo actual (oscuro). Si querés un look claro real, cambiá por `bg-white`. */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />

        <AuthProvider>
          <Header />
          <main className="container mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
