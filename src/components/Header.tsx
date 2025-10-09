"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    QrCode,
    Award,
    Utensils,
    Scan,
    Users,
    RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { Coins, Storefront } from "phosphor-react";

export default function Header() {
    const { user, loading, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const linksCliente = [
        { href: "/", label: "Inicio" },
        { href: "/cliente/qr", label: "Mi QR", icon: QrCode },
        { href: "/cliente/menu", label: "Menú", icon: Utensils },
        { href: "/cliente/rewards", label: "Canjes", icon: Storefront },
        { href: "/cliente/historial", label: "Historial", icon: Coins },
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
        <header className="sticky top-0 z-30 bg-black border-b border-red-700 shadow-lg">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                {/* Bloque izquierdo: hamburguesa */}
                <div className="w-1/3 flex">
                    <button
                        onClick={() => setOpen(!open)}
                        className="p-2 rounded-md hover:bg-red-700/20 transition"
                    >
                        {open ? (
                            <X size={26} className="text-red-600" />
                        ) : (
                            <Menu size={26} className="text-red-600" />
                        )}
                    </button>
                </div>

                {/* Centro: logo */}
                <div className="w-1/3 flex justify-center">
                    <Link href="/" className="flex justify-center">
                        <Image
                            src="/morganwhite.png" // ⚠️ Usa versión negra del logo si tenés
                            alt="Morgan Bar"
                            width={80}
                            height={80}
                            priority
                        />
                    </Link>
                </div>

                {/* Derecha: perfil + recargar */}
                <div className="w-1/3 flex justify-end items-center gap-3">
                    {user && (
                        <Link
                            href="/cliente/perfil"
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white font-bold transition"
                            title="Mi Perfil"
                        >
                            {getInitials(user.nombre, user.apellido)}
                        </Link>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition"
                        title="Recargar página"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Drawer lateral */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Overlay */}
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
                            className="fixed top-0 left-0 h-screen w-72 bg-neutral-900 border-r border-red-700 p-6 flex flex-col gap-4 z-50 shadow-xl"
                        >
                            <button
                                onClick={() => setOpen(false)}
                                className="self-end p-2 hover:bg-red-700/20 rounded-md transition"
                            >
                                <X size={22} className="text-red-500" />
                            </button>

                            {loading ? (
                                <span className="text-sm text-gray-300">Cargando…</span>
                            ) : user ? (
                                <>
                                    <span className="text-sm text-gray-400">
                                        Hola, <b className="text-white">{user.nombre}</b>
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
                                                            ? "bg-red-600 text-white"
                                                            : "hover:bg-red-700/20 text-gray-200"
                                                        }`}
                                                >
                                                    {l.icon && <l.icon size={22} />}
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
                                        className="mt-4 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-sm text-white transition"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className={`px-3 py-2 rounded-lg text-sm ${pathname === "/login"
                                                ? "bg-red-600 text-white"
                                                : "text-white hover:bg-red-700/20"
                                            }`}
                                        onClick={() => setOpen(false)}
                                    >
                                        Ingresar
                                    </Link>
                                    <Link
                                        href="/register"
                                        className={`px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white`}
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
        </header>
    );
}
