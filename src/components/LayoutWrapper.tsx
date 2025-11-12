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

    // 🖤 Fondo oscuro solo en los chats específicos
    const esChat =
        pathname.match(/^\/admin\/pedidos\/[^/]+\/chat$/) ||
        pathname.match(/^\/cliente\/mis-pedidos\/[^/]+\/chat$/);

    return (
        <>
            <RegisterSW />

            <NextAuthSessionProvider>
                <AuthProvider>
                    {/* 👇 Siempre mostrar el Header */}
                    <Header />
                    <Notificador userRole="cliente" />

                    {/* Fondo condicional */}
                    <main
                        className={`min-h-screen ${esChat
                                ? "bg-black text-white p-0"
                                : "bg-white text-black px-4 pb-6 container mx-auto"
                            }`}
                        style={{
                            // ✅ Deja espacio para el header y el área segura superior
                            paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)",
                        }}
                    >
                        {children}
                    </main>
                </AuthProvider>
            </NextAuthSessionProvider>
        </>
    );
}
