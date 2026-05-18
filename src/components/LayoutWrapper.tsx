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
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [showReview, setShowReview] = useState(false);
    const [pendingTxId, setPendingTxId] = useState<string | null>(null);

    useSwipeBack();
    usePullToRefresh();

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
        <NextAuthSessionProvider>
            <AuthProvider>
                {/* Zona de swipe-back */}
                <SwipeBackZone />
                <RegisterSW />

                {/* Fondo iOS-style para swipe-back */}
                <div
                    id="swipe-backdrop"
                    className="fixed inset-0 bg-neutral-200/80 backdrop-blur-sm transition-opacity duration-200 opacity-0 z-10"
                />

                {/* Pull-to-refresh indicator */}
                <div
                    id="pull-indicator"
                    style={{
                        position: "fixed",
                        top: "calc(env(safe-area-inset-top) + 40px)",
                        left: "50%",
                        transform: "translateX(-50%) translateY(-48px)",
                        opacity: 0,
                        zIndex: 9999,
                        pointerEvents: "none",
                    }}
                >
                    <div className="bg-white rounded-full p-3 shadow-lg border border-gray-200">
                        <div id="pull-arrow" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Header y notificador fuera de #app-content para que position:fixed
                    sea relativo al viewport y no al contenedor con will-change:transform */}
                {!esChat && <Header />}
                {!esChat && <Notificador userRole="cliente" />}

                {/* Contenido animable (swipe-back / pull-to-refresh) */}
                <div
                    id="app-content"
                    className="relative z-20 min-h-screen bg-white transition-transform duration-200 will-change-transform"
                >
                    <main
                        className={
                            esChat
                                ? "h-[100dvh] overflow-hidden bg-transparent p-0"
                                : "min-h-screen bg-white text-black px-4 pb-6 container mx-auto"
                        }
                        style={
                            esChat
                                ? undefined
                                : { paddingTop: "calc(env(safe-area-inset-top) + 98px)" }
                        }
                    >
                        {children}
                    </main>
                </div>

                <ReviewModal
                    open={showReview}
                    onClose={async () => {
                        setShowReview(false);
                        if (pendingTxId) {
                            await fetch("/api/reviews/dismiss", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ transactionId: pendingTxId }),
                            });
                            setPendingTxId(null);
                        }
                    }}
                    onSubmit={async ({ rating, comment }) => {
                        if (!pendingTxId) return;

                        const res = await fetch("/api/reviews/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                rating,
                                comment: comment,
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
    );
}
