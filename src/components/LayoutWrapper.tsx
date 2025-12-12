"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/auth-context";
import NextAuthSessionProvider from "@/providers/session-provider";
import Header from "@/components/Header";
import Notificador from "@/components/Notificador";
import RegisterSW from "@/components/RegisterSW";
import { useEffect, useState } from "react";
import { initPush } from "@/lib/pushNotifications";
import ReviewModal from "@/components/ReviewModal";

import { useSwipeBack } from "@/hooks/useSwipeBack";
import SwipeBackZone from "@/components/SwipeBackZone";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [showReview, setShowReview] = useState(false);
    const [pendingTxId, setPendingTxId] = useState<string | null>(null);

    useSwipeBack();

    useEffect(() => {
        initPush();

        async function checkReview() {
            try {
                const res = await fetch("/api/reviews/pending");
                const data = await res.json();

                if (data?.tx?._id) {
                    setPendingTxId(data.tx._id);
                    setShowReview(true);
                }
            } catch (e) {
                console.error("Error obteniendo review pendiente", e);
            }
        }

        checkReview();
    }, []);

    const esChat =
        pathname.match(/^\/admin\/pedidos\/[^/]+\/chat$/) ||
        pathname.match(/^\/cliente\/mis-pedidos\/[^/]+\/chat$/);

    return (
        <>
            {/* 👈 Zona de swipe */}
            <SwipeBackZone />

            <RegisterSW />

            {/* 👇 Fondo iOS-style */}
            <div
                id="swipe-backdrop"
                className="fixed inset-0 bg-neutral-200/80 backdrop-blur-sm transition-opacity duration-200 opacity-0 z-10"
            />

            {/* 👇 Contenido animable */}
            <div
                id="app-content"
                className="relative z-20 min-h-screen bg-white transition-transform duration-200 will-change-transform">
                <NextAuthSessionProvider>
                    <AuthProvider>
                        <Header />
                        <Notificador userRole="cliente" />

                        <main
                            className={`min-h-screen ${esChat
                                ? "bg-black text-white p-0"
                                : "bg-white text-black px-4 pb-6 container mx-auto"
                                }`}
                            style={{
                                paddingTop: "calc(env(safe-area-inset-top) + 140px)",
                            }}
                        >
                            {children}
                        </main>

                        <ReviewModal
                            open={showReview}
                            onClose={() => setShowReview(false)}
                            onSubmit={async ({ rating, comment }) => {
                                if (!pendingTxId) return;

                                const res = await fetch("/api/reviews/create", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        rating,
                                        comentario: comment,
                                        transactionId: pendingTxId,
                                    }),
                                });

                                if (res.ok) {
                                    setShowReview(false);
                                    setPendingTxId(null);
                                }
                            }}
                        />
                    </AuthProvider>
                </NextAuthSessionProvider>
            </div >
        </>
    );
}
