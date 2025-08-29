import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "H Morgan Bar",
  description: "Fidelización de clientes para bar/resto",
  themeColor: "#10b981",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body>
        <RegisterSW />
        {/* Fondo con gradiente sutil */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        <AuthProvider>
          <Header />
          <main className="container mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
