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
    Utensils,
    Users,
    RefreshCw,
    Bell,
    PackagePlus,
    History,
    Ticket,
    Package,
    LoaderPinwheel,
    ScanText,
    ScanQrCode,
    UserRoundPen,
    Settings,
} from "lucide-react";
import Image from "next/image";
import { clearPushData, registerSW, subscribeUser } from "@/lib/push-client";
import { swalBase } from "@/lib/swalConfig";

export default function Header() {
    const { user, loading, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        document.body.style.overflowX = open ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "";
            document.body.style.overflowX = "";
        };
    }, [open]);

    const linksCliente = [
        { href: "/", label: "Inicio" },
        { href: "/cliente/qr", label: "Mi QR", icon: QrCode },
        { href: "/cliente/perfil", label: "Mi Perfil", icon: UserRoundPen },
        { href: "/cliente/menu", label: "Menú", icon: Utensils },
        { href: "/cliente/pedidos", label: "Pedir", icon: PackagePlus },
        { href: "/cliente/mis-pedidos", label: "Mis Pedidos", icon: Package },
        { href: "/cliente/rewards", label: "Canjes", icon: Ticket },
        { href: "/cliente/historial", label: "Historial", icon: History },
        { href: "/cliente/ruleta", label: "Ruleta de Tragos", icon: LoaderPinwheel },
    ];

    const linksAdmin = [
        { href: "/", label: "Inicio" },
        { href: "/admin/scan", label: "Escanear Puntos", icon: ScanQrCode },
        { href: "/admin/rewards/scan", label: "Escanear Canjes", icon: ScanText },
        { href: "/admin/clientes", label: "Clientes", icon: Users },
        { href: "/admin/menu", label: "Menú", icon: Utensils },
        { href: "/admin/rewards", label: "Canjes", icon: Ticket },
        { href: "/admin/pedidos", label: "Pedidos", icon: Package },
        { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
        { href: "/admin/configuracion", label: "Ajustes", icon: Settings },
    ];

    const links = user?.role === "admin" ? linksAdmin : linksCliente;

    async function handleNotificationsClick() {
        try {
            const hasSW = "serviceWorker" in navigator;
            const hasPush = "PushManager" in window;
            const hasNotif = typeof Notification !== "undefined";

            if (!hasSW || !hasPush || !hasNotif) {
                await swalBase.fire("❌", "Este dispositivo no soporta notificaciones push.", "error");
                return;
            }

            let perm = Notification.permission;
            if (perm === "default") {
                perm = await Notification.requestPermission();
            }

            if (perm !== "granted") {
                await swalBase.fire("🚫", "Debes permitir las notificaciones.", "info");
                return;
            }

            const reg = await registerSW();
            if (!reg) {
                await swalBase.fire("❌", "No se pudo registrar el Service Worker.", "error");
                return;
            }

            await reg.update();
            const sub = await subscribeUser(reg);
            if (!sub) {
                await swalBase.fire("❌", "No se pudo crear la suscripción push.", "error");
                return;
            }

            await swalBase.fire("✅ Listo", "Notificaciones activadas.", "success");
            window.location.href = "/";
        } catch (err: any) {
            console.error("❌ Error:", err);
            await swalBase.fire("⚠️", "Ocurrió un error.", "error");
        }
    }

    return (
        <header className="fixed left-0 right-0 z-30 bg-black">

            {/* BLOQUE QUE CREA ESPACIO REAL PARA LA ISLA */}
            <div
                style={{
                    height: "calc(env(safe-area-inset-top) + 40px)"
                }}
            />

            {/* CONTENIDO REAL DEL HEADER */}
            <div className="w-full px-6 lg:px-12 py-4 flex items-center" style={{ paddingTop: 20 }}>

                {/* IZQUIERDA */}
                <div className="flex-1 flex justify-start">
                    <button
                        onClick={() => setOpen(true)}
                        className="p-2 rounded-md hover:bg-red-700/20 transition"
                    >
                        <Menu size={26} className="text-red-600" />
                    </button>
                </div>

                {/* CENTRO */}
                <div className="flex-1 flex justify-center">
                    <img src="/morganwhite.png" width={58} height={58} />
                </div>

                {/* DERECHA */}
                <div className="flex-1 flex justify-end items-center gap-3">
                    <button className="p-2 rounded-full bg-red-600 text-white">
                        <Bell size={20} />
                    </button>
                    <button className="p-2 rounded-full bg-red-600 text-white">
                        <RefreshCw size={20} />
                    </button>
                </div>

            </div>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Fondo oscuro */}
                        <div
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 bg-black/60 z-40"
                        />

                        {/* Menú lateral */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-0 left-0 h-full w-72 bg-black z-50 p-6"
                        >
                            <button
                                onClick={() => setOpen(false)}
                                className="text-white mb-6"
                            >
                                <X size={28} />
                            </button>

                            <nav className="flex flex-col gap-4">
                                {links.map((link) => {
                                    const Icon = link.icon

                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 text-white text-lg hover:text-red-500 transition"
                                        >
                                            {Icon && <Icon size={20} />}
                                            {link.label}
                                        </Link>
                                    )
                                })}
                            </nav>

                            {/* BOTÓN CERRAR SESIÓN */}
                            <button
                                onClick={() => {
                                    setOpen(false)
                                    logout()
                                }}
                                className="mt-8 flex items-center gap-3 text-red-500 text-lg hover:text-red-400 transition"
                            >
                                Cerrar sesión
                            </button>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </header>

    );
}
