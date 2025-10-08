// src/context/auth-context.tsx
"use client";
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
            setUser(data.user || null);
        } finally {
            setLoading(false);
        }
    };

    // 🔓 Cerrar sesión
    const logout = async () => {
        // Guardá el id antes de setUser(null)
        const uid = (user as any)?.id || (user as any)?._id;

        // 🔕 Desuscribir push en DB + navegador
        try {
            await unsubscribePushSafe();
        } catch (err) {
            console.warn("Error al desuscribir push:", err);
        }

        // 🚪 Cerrar sesión en el backend
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => { });

        // 🧹 Limpiar memoria local de “push ya activado”
        try {
            if (uid) localStorage.removeItem(`hm_push_done_${uid}`);
        } catch { }

        // 🧹 Eliminar service workers y caches para evitar sesiones “fantasma”
        if ("serviceWorker" in navigator) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) {
                    await r.unregister();
                    console.log("🧹 Service Worker eliminado:", r.scope);
                }

                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
                console.log("🧹 Cachés limpiados");
            } catch (err) {
                console.warn("Error limpiando SW/caches:", err);
            }
        }

        // 🔒 Limpiar storage
        localStorage.clear();
        sessionStorage.clear();

        // ❌ Limpiar estado y redirigir
        setUser(null);
        window.location.href = "/login";
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
