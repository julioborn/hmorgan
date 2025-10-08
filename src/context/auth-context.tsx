// src/context/auth-context.tsx
"use client";
import { silentPushRecovery } from "@/lib/push-auto-recover";
import { createContext, useContext, useEffect, useState } from "react";

type User =
    | {
        id: string;               // ⚠️ si tu API devuelve _id, cambia a _id aquí y abajo
        nombre: string;
        apellido: string;
        dni: string;
        telefono: string;
        role: "cliente" | "admin";
        qrToken?: string;
        puntos?: number;
    }
    | null;

type Ctx = {
    user: User;
    loading: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
    user: null,
    loading: true,
    refresh: async () => { },
    logout: async () => { },
});

async function unsubscribePushSafe() {
    try {
        // Si el browser no soporta SW/Push, no hay nada que hacer
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        // Obtenemos la suscripción actual del navegador (si existe)
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;

        // 1) Borrarla de la DB del usuario actual
        try {
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: sub.endpoint }),
            });
        } catch { /* no rompemos logout si falla */ }

        // 2) Cancelar la suscripción en el navegador
        try { await sub.unsubscribe(); } catch { }
    } catch {
        // silencioso a propósito
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    // 🔄 Refrescar datos del usuario actual
    // src/context/auth-context.tsx
    const refresh = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/me", { cache: "no-store" });
            const data = await res.json();
            const usr = data.user || null;
            setUser(usr);

            // 🧩 Si hay usuario, intentamos restaurar push silenciosamente
            if (usr?.id || usr?._id) {
                silentPushRecovery(usr.id || usr._id);

                // OPCIONAL: si querés que el modal se muestre sólo la primera vez:
                // ensurePushAfterLogin(usr.id || usr._id);
            }
        } finally {
            setLoading(false);
        }
    };

    // 🔓 Cerrar sesión
    const logout = async () => {
        try {
            const uid = (user as any)?.id || (user as any)?._id || "generic";

            // 🔕 Desuscribir notificaciones push
            try {
                // Si el browser soporta SW y Push, intentamos borrar suscripción
                if ("serviceWorker" in navigator && "PushManager" in window) {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();

                    if (sub) {
                        // 1️⃣ Eliminar del backend (usuario actual y globalmente)
                        await fetch("/api/push/unsubscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "same-origin",
                            body: JSON.stringify({ endpoint: sub.endpoint }),
                        }).catch(() => { });

                        await fetch("/api/push/unsubscribe-any", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "same-origin",
                            body: JSON.stringify({ endpoint: sub.endpoint }),
                        }).catch(() => { });

                        // 2️⃣ Cancelar suscripción en el navegador
                        await sub.unsubscribe().catch(() => { });
                    }

                    // 3️⃣ Borrar el SW viejo si existiera (para evitar bugs en reinstalación)
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const r of regs) {
                        try {
                            await r.unregister();
                            console.log("🧹 Service Worker eliminado:", r.scope);
                        } catch { }
                    }
                }
            } catch (err) {
                console.warn("⚠️ Error al desuscribir push:", err);
            }

            // 4️⃣ Cerrar sesión en backend
            await fetch("/api/auth/logout", { method: "POST" });

            // 5️⃣ Limpiar flags locales
            try {
                localStorage.removeItem(`hm_push_done_${uid}`);
                localStorage.removeItem("hm_push_done_generic");
                console.log("🧽 Flags locales eliminados");
            } catch { }

            // 6️⃣ Resetear usuario en contexto
            setUser(null);

            // 7️⃣ Redirigir
            window.location.href = "/login";
        } catch (err) {
            console.error("❌ Error durante logout:", err);
        }
    };

    // ⏳ Cargar usuario al inicio
    useEffect(() => {
        refresh();
    }, []);

    // 🔄 Mantener la sesión activa automáticamente
    useEffect(() => {
        let t: NodeJS.Timeout;

        const ping = async () => {
            try {
                await fetch("/api/auth/me", { cache: "no-store" });
            } catch { }
            // renovar cada 12 horas
            t = setTimeout(ping, 1000 * 60 * 60 * 12);
        };

        const onFocus = () => {
            // Al volver a la app refresca (y reintenta push si hiciera falta)
            refresh();
        };

        ping();
        window.addEventListener("focus", onFocus);

        return () => {
            clearTimeout(t);
            window.removeEventListener("focus", onFocus);
        };
    }, [refresh]);

    return (
        <AuthCtx.Provider value={{ user, loading, refresh, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
