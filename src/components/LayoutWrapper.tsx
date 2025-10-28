"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/auth-context";
import NextAuthSessionProvider from "@/providers/session-provider";
import Header from "@/components/Header";
import Notificador from "@/components/Notificador";
import RegisterSW from "@/components/RegisterSW";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const esChat = pathname.includes("/chat") || pathname.includes("/pedido");

    return (
        <>
            <RegisterSW />

            <NextAuthSessionProvider>
                <AuthProvider>
                    {/* 👇 SIEMPRE mostrar el header */}
                    <Header />
                    <Notificador userRole="cliente" />

                    {/* Fondo condicional */}
                    <main
                        className={`min-h-screen ${esChat
                                ? "bg-black text-white p-0"
                                : "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white px-4 py-6 container mx-auto"
                            }`}
                    >
                        {children}
                    </main>
                </AuthProvider>
            </NextAuthSessionProvider>
        </>
    );
}
