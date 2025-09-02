// src/app/layout.tsx
import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "H Morgan Bar",
  description: "Fidelización de clientes para bar/resto",
  // Barras claras SIEMPRE (incluso si el sistema está en dark)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
  // Evita el auto-darkening del navegador
  other: { "color-scheme": "light" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // colorScheme en el html refuerza que todo sea "light"
    <html lang="es" style={{ colorScheme: "light" }}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        {/* ⚠️ Quitamos el <meta name="theme-color" .../> manual para no contradecir metadata */}
        {/* <meta name="theme-color" content="#10b981" /> */}
        {/* (Opcional iOS PWA) */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <RegisterSW />
        {/* Si querés mantener tu tema oscuro, dejá este fondo.
            Si buscás un look claro real, reemplazalo por bg-white y ajustamos colores de texto. */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        <AuthProvider>
          <Header />
          <main className="container mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
