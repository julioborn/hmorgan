"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, QrCode, Award, Utensils, Scan, Users, RefreshCw, User } from "lucide-react";
import Image from "next/image";
import { Coins, Storefront } from "phosphor-react";

export default function Header() {
    const { user, loading, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const pathname = usePathname(); // 👈 Ruta actual

    // 🔒 Bloquear scroll del body cuando el menú está abierto
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const linksCliente = [
        { href: "/", label: "Inicio" },
        { href: "/cliente/qr", label: "Mi QR", icon: QrCode },
        { href: "/cliente/menu", label: "Menú", icon: Utensils },
        { href: "/cliente/rewards", label: "Canjes", icon: Storefront },
        { href: "/cliente/historial", label: "Historial", icon: Coins }
    ];

    const linksAdmin = [
        { href: "/", label: "Inicio" },
        { href: "/admin/scan", label: "Escanear Puntos", icon: Scan },
        { href: "/admin/rewards/scan", label: "Escanear Canjes", icon: Scan },
        { href: "/admin/clientes", label: "Clientes", icon: Users },
        { href: "/admin/menu", label: "Menú", icon: Utensils },
        { href: "/admin/rewards", label: "Canjes", icon: Storefront },
    ];

    const links = user?.role === "admin" ? linksAdmin : linksCliente;

    function getInitials(nombre?: string, apellido?: string) {
        if (!nombre && !apellido) return "";
        const n = nombre ? nombre[0].toUpperCase() : "";
        const a = apellido ? apellido[0].toUpperCase() : "";
        return n + a;
    }

    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/60 border-b border-white/10">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    {/* Bloque izquierdo: hamburguesa */}
                    <div className="w-1/3 flex">
                        <button
                            onClick={() => setOpen(!open)}
                            className="p-2 rounded-md hover:bg-white/10"
                        >
                            {open ? (
                                <X size={24} className="text-emerald-400" />
                            ) : (
                                <Menu size={24} className="text-emerald-400" />
                            )}
                        </button>
                    </div>

                    {/* Bloque centro: logo */}
                    <div className="w-1/3 flex justify-center">
                        <Link href="/" className="flex justify-center">
                            <Image
                                src="/morganwhite.png"
                                alt="Morgan Bar"
                                width={80}
                                height={80}
                                priority
                            />
                        </Link>
                    </div>

                    {/* Bloque derecho: perfil + recargar */}
                    <div className="w-1/3 flex justify-end items-center gap-3">
                        {user && (
                            <Link
                                href="/cliente/perfil"
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                title="Mi Perfil"
                            >
                                {getInitials(user.nombre, user.apellido)}
                            </Link>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 rounded-full bg-emerald-600 hover:bg-white/10"
                            title="Recargar página"
                        >
                            <RefreshCw size={22} />
                        </button>
                    </div>
                </div>

                {/* Drawer lateral */}
                <AnimatePresence>
                    {open && (
                        <>
                            {/* Overlay oscuro */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 bg-black z-40"
                                onClick={() => setOpen(false)}
                            />
                            {/* Drawer */}
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ duration: 0.3 }}
                                className="fixed top-0 left-0 h-screen w-72 bg-slate-800 border-r border-white/10 shadow-lg p-6 flex flex-col gap-4 z-50"
                            >
                                <button
                                    onClick={() => setOpen(false)}
                                    className="self-end p-2 hover:bg-white/10 rounded-md"
                                >
                                    <X size={22} />
                                </button>

                                {loading ? (
                                    <span className="text-sm opacity-70">Cargando…</span>
                                ) : user ? (
                                    <>
                                        <span className="text-sm opacity-90">
                                            Hola, <b>{user.nombre}</b>
                                        </span>
                                        <nav className="flex flex-col gap-3 mt-6">
                                            {links.map((l) => {
                                                const active = pathname === l.href;
                                                return (
                                                    <Link
                                                        key={l.href}
                                                        href={l.href}
                                                        onClick={() => setOpen(false)}
                                                        className={`flex items-center gap-4 px-4 py-4 rounded-xl font-semibold text-lg transition ${active
                                                                ? "bg-emerald-600 text-white"
                                                                : "hover:bg-white/10 text-gray-200"
                                                            }`}
                                                    >
                                                        {l.icon && <l.icon size={24} />} {/* iconos más grandes */}
                                                        {l.label}
                                                    </Link>
                                                );
                                            })}
                                        </nav>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setOpen(false);
                                            }}
                                            className="mt-4 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-sm text-white"
                                        >
                                            Cerrar Sesión
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className={`px-3 py-2 rounded-lg text-sm ${pathname === "/login"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-white/10 hover:bg-white/15"
                                                }`}
                                            onClick={() => setOpen(false)}
                                        >
                                            Ingresar
                                        </Link>
                                        <Link
                                            href="/register"
                                            className={`px-3 py-2 rounded-lg text-sm ${pathname === "/register"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                }`}
                                            onClick={() => setOpen(false)}
                                        >
                                            Crear cuenta
                                        </Link>
                                    </>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}
