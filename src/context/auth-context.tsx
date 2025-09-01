"use client";
import { createContext, useContext, useEffect, useState } from "react";

type User = {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    role: "cliente" | "admin";
    qrToken?: string;
    points?: number;
} | null;

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    // 🔄 Refrescar datos del usuario actual
    const refresh = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/me", { cache: "no-store" });
            const data = await res.json();
            setUser(data.user || null);
            if (data.user) {
                import("@/lib/push-client").then(async (m) => {
                    try {
                        const reg = await m.registerSW();
                        if (!reg) return;
                        // Pedir permiso (idealmente desde un botón, pero para probar):
                        const perm = await Notification.requestPermission();
                        if (perm !== "granted") return;
                        await m.subscribeUser(reg);
                    } catch { }
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // 🔓 Cerrar sesión
    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/login"; // o "/" si preferís
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
