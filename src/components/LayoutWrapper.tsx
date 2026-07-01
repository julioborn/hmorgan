"use client";

import { AuthProvider } from "@/context/auth-context";
import NextAuthSessionProvider from "@/providers/session-provider";
import { SWRConfig } from "swr";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";
import { useEffect, useState } from "react";
import { initPush } from "@/lib/pushNotifications";
import ReviewModal from "@/components/ReviewModal";
import PushToast from "@/components/PushToast";

import { useSwipeBack } from "@/hooks/useSwipeBack";
import SwipeBackZone from "@/components/SwipeBackZone";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {

    const [showReview, setShowReview] = useState(false);
    const [pendingTxId, setPendingTxId] = useState<string | null>(null);
    const [mozoNombre, setMozoNombre] = useState<string | null>(null);
    const [mozoId, setMozoId] = useState<string | null>(null);

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
                    setMozoNombre(data.mozoNombre || null);
                    setMozoId(data.tx?.meta?.mozoId || null);
                    setShowReview(true);
                }
            } catch (e) {
                console.error("Error obteniendo review pendiente", e);
            }
        }

        checkReview();
    }, []);

    return (
        <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false }}>
        <NextAuthSessionProvider>
            <AuthProvider>
                {/* Zona de swipe-back */}
                <SwipeBackZone />
                <RegisterSW />
                <PushToast />

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

                <Header />

                {/* Contenido animable (swipe-back / pull-to-refresh) */}
                <div
                    id="app-content"
                    className="relative z-20 min-h-screen bg-white transition-transform duration-200 will-change-transform"
                >
                    <main
                        className="min-h-screen bg-white text-black px-4 pb-6 container mx-auto"
                        style={{ paddingTop: "calc(env(safe-area-inset-top) + 98px)" }}
                    >
                        {children}
                    </main>
                </div>

                <ReviewModal
                    open={showReview}
                    mozoNombre={mozoNombre}
                    onClose={async () => {
                        setShowReview(false);
                        if (pendingTxId) {
                            await fetch("/api/reviews/dismiss", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ transactionId: pendingTxId }),
                            });
                            setPendingTxId(null);
                            setMozoNombre(null);
                            setMozoId(null);
                        }
                    }}
                    onSubmit={async ({ rating, comment, ratingMozo }) => {
                        if (!pendingTxId) return;

                        const res = await fetch("/api/reviews/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                rating,
                                comment,
                                transactionId: pendingTxId,
                                ...(ratingMozo !== undefined && mozoId ? { ratingMozo, mozoId } : {}),
                            }),
                        });

                        if (res.ok) {
                            setShowReview(false);
                            setPendingTxId(null);
                            setMozoNombre(null);
                            setMozoId(null);
                        }
                    }}
                />
            </AuthProvider>
        </NextAuthSessionProvider>
        </SWRConfig>
    );
}
