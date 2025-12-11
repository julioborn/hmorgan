"use client";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/context/auth-context";
import NextAuthSessionProvider from "@/providers/session-provider";
import Header from "@/components/Header";
import Notificador from "@/components/Notificador";
import RegisterSW from "@/components/RegisterSW";
import { useEffect, useState } from "react";
import { initPush } from "@/lib/pushNotifications";
import ReviewModal from "@/components/ReviewModal";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [showReview, setShowReview] = useState(false);
    const [pendingTxId, setPendingTxId] = useState<string | null>(null);

    // 👉 SWIPE BACK ACTIVATION
    useEffect(() => {
        const handler = () => {
            console.log("⬅️ Swipe detectado: navegando atrás");
            router.back();
        };

        // Escuchar evento proveniente del plugin nativo (Swift)
        window.addEventListener("swipeBack", handler);

        // Activar plugin nativo cuando existe Capacitor
        if (typeof window !== "undefined" && (window as any).Capacitor) {
            try {
                (window as any).Capacitor.Plugins.SwipeBackPlugin.enableSwipeBack();
                console.log("✨ SwipeBackPlugin habilitado");
            } catch (err) {
                console.error("❌ Error activando SwipeBackPlugin:", err);
            }
        }

        return () => window.removeEventListener("swipeBack", handler);
    }, []);

    // 👉 Inicialización de push + review pendiente
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
            <RegisterSW />

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
        </>
    );
}
