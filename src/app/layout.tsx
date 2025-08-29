import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "H Morgan Bar",
  description: "Fidelización de clientes para bar/resto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
        <RegisterSW />
        {/* tu Provider / Header / main existentes */}
        {children}
      </body>
    </html>
  );
}
