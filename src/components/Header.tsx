"use client";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
export default function Header() {
    const { user, loading, logout } = useAuth();

    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/60 border-b border-white/10">
            <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                <Link href="/" className="font-extrabold tracking-tight text-lg">
                    H<span className="text-emerald-400">Morgan</span>
                </Link>

                {loading ? (
                    <div className="text-sm opacity-70">Cargando…</div>
                ) : user ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm opacity-90">
                            Hola, <b>{user.nombre}</b> <span className="opacity-60">({user.role})</span>
                        </span>
                        {user.role === "cliente" && (
                            <Link href="/cliente/qr" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">Mi QR</Link>
                        )}
                        {user.role === "admin" && (
                            <Link href="/admin/scan" className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white">Escanear</Link>
                        )}
                        <button onClick={logout} className="px-3 py-1.5 rounded bg-black hover:bg-slate-800 text-sm">Salir</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm">Ingresar</Link>
                        <Link href="/register" className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white">Crear cuenta</Link>
                    </div>
                )}
            </div>
        </header>
    );
}
