"use client";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export default function Header() {
    const { user, loading, logout } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/60 border-b border-white/10">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">

                {/* Mobile layout */}
                <div className="flex w-full items-center justify-between md:hidden relative">
                    {/* Hamburguesa a la izquierda */}
                    <button
                        onClick={() => setOpen(!open)}
                        className="p-2 rounded-md hover:bg-white/10"
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    {/* Logo centrado */}
                    <Link href="/" className="flex justify-center">
                        <Image
                            src="/morganwhite.png"
                            alt="Morgan Bar"
                            width={80}
                            height={80}
                            priority
                        />
                    </Link>

                    {/* Columna derecha vacía para balancear */}
                    <div className="w-10"></div>

                    {/* Drawer lateral */}
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ duration: 0.3 }}
                                className="fixed top-0 left-0 h-screen w-64 bg-slate-800 border-r border-white/10 shadow-lg p-6 flex flex-col gap-4 z-40"
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
                                        {user.role === "cliente" && (
                                            <Link
                                                href="/cliente/qr"
                                                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
                                                onClick={() => setOpen(false)}
                                            >
                                                Mi QR
                                            </Link>
                                        )}
                                        {user.role === "admin" && (
                                            <Link
                                                href="/admin/scan"
                                                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
                                                onClick={() => setOpen(false)}
                                            >
                                                Escanear
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => {
                                                logout();
                                                setOpen(false);
                                            }}
                                            className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-sm"
                                        >
                                            Cerrar Sesión
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-sm"
                                            onClick={() => setOpen(false)}
                                        >
                                            Ingresar
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
                                            onClick={() => setOpen(false)}
                                        >
                                            Crear cuenta
                                        </Link>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center w-full">
                    {/* Columna izquierda vacía */}
                    <div></div>

                    {/* Logo centrado */}
                    <Link href="/" className="flex justify-center">
                        <Image
                            src="/morganwhite.png"
                            alt="Morgan Bar"
                            width={80}   // más chico en desktop
                            height={80}
                            priority
                        />
                    </Link>

                    {/* Menú usuario a la derecha */}
                    <div className="flex justify-end items-center gap-3">
                        {!loading && user && (
                            <>
                                {/* Ocultamos saludo en pantallas medianas */}
                                <span className="text-sm opacity-90 hidden lg:block">
                                    Hola, <b>{user.nombre}</b>
                                </span>
                                {user.role === "cliente" && (
                                    <Link
                                        href="/cliente/qr"
                                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
                                    >
                                        Mi QR
                                    </Link>
                                )}
                                {user.role === "admin" && (
                                    <Link
                                        href="/admin/scan"
                                        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
                                    >
                                        Escanear
                                    </Link>
                                )}
                                <button
                                    onClick={logout}
                                    className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-sm"
                                >
                                    Cerrar Sesión
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
