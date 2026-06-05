// src/context/auth-context.tsx
"use client";
import { silentPushRecovery } from "@/lib/push-auto-recover"
import { removePushToken } from "@/lib/pushNotifications";
import { createContext, useContext, useEffect, useState } from "react";

type User =
    | {
        id: string;               // ⚠️ si tu API devuelve _id, cambia a _id aquí y abajo
        nombre: string;
        apellido: string;
        dni: string;
        telefono: string;
        role: "cliente" | "admin" | "empleado" | "superadmin" | "cajero";
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
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        // Timeout de 2s: navigator.serviceWorker.ready puede colgarse indefinidamente
        const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sw-timeout")), 2000)),
        ]) as ServiceWorkerRegistration;

        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;

        try {
            await fetch("/api/push/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ endpoint: sub.endpoint }),
            });
        } catch { }

        try { await sub.unsubscribe(); } catch { }
    } catch { }
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
            await removePushToken();
            await unsubscribePushSafe();
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            setUser(null);
            window.location.href = "/";
        } catch (err) {
            console.error("❌ Error durante logout:", err);
        }
    };

    // ⏳ Cargar usuario al inicio
    useEffect(() => {
        refresh();
    }, []);

    // 🔄 Refresh silencioso: actualiza el usuario SIN activar loading
    // (no muestra spinner → el usuario no percibe ningún cambio de pantalla)
    const silentRefresh = async () => {
        try {
            const res = await fetch("/api/auth/me", { cache: "no-store" });
            const data = await res.json();
            const usr = data.user || null;
            setUser(usr);
            if (usr?.id || usr?._id) {
                silentPushRecovery(usr.id || usr._id);
            }
        } catch { }
    };

    // 🔄 Mantener la sesión activa automáticamente
    useEffect(() => {
        let t: NodeJS.Timeout;

        const ping = async () => {
            try {
                await fetch("/api/auth/me", { cache: "no-store" });
            } catch { }
            t = setTimeout(ping, 1000 * 60 * 60 * 12);
        };

        // Al volver a la ventana: refresh silencioso (sin loading → sin "reload" visual)
        const onFocus = () => { silentRefresh(); };

        ping();
        window.addEventListener("focus", onFocus);

        return () => {
            clearTimeout(t);
            window.removeEventListener("focus", onFocus);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, refresh, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
