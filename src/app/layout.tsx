import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "H Morgan Bar",
  description: "Fidelización de clientes para bar/resto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
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
