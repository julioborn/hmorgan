"use client";
import { createContext, useContext, useEffect, useState } from "react";

type User = {
    _id: string;
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

const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => { }, logout: async () => { } });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

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

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/";
    };

    useEffect(() => { refresh(); }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, refresh, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
