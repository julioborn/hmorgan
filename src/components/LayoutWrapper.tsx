"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/auth-context";
import NextAuthSessionProvider from "@/providers/session-provider";
import Header from "@/components/Header";
import Notificador from "@/components/Notificador";
import RegisterSW from "@/components/RegisterSW";
import { useEffect } from "react";
import { initPush } from "@/lib/pushNotifications";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        initPush();
    }, []);

    const esChat =
        pathname.match(/^\/admin\/pedidos\/[^/]+\/chat$/) ||
        pathname.match(/^\/cliente\/mis-pedidos\/[^/]+\/chat$/);

    return (
        <>
            <RegisterSW />

            <NextAuthSessionProvider>
                <AuthProvider>

                    {/* HEADER — ahora con su propio safe-area */}
                    <Header />

                    <Notificador userRole="cliente" />

                    <main
                        className={`min-h-screen ${esChat
                            ? "bg-black text-white p-0"
                            : "bg-white text-black px-4 pb-6 container mx-auto"
                            }`}
                        style={{
                            paddingTop: "180px"   // ⬅️ COINCIDE CON EL HEADER GIGANTE
                        }}
                    >
                        {children}
                    </main>

                </AuthProvider>
            </NextAuthSessionProvider>
        </>
    );
}
