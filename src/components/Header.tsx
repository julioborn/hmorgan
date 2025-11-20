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
        <header
            className="fixed left-0 right-0 z-30 border-b border-red-700 shadow-lg"
            style={{
                top: "env(safe-area-inset-top, 0px)",
                backgroundColor: "#000",
                paddingTop: "env(safe-area-inset-top, 0px)",
                minHeight: "88px",  // 👈 ESTA ES LA CLAVE
                display: "flex",
                alignItems: "center"
            }}
        >
            {/* ⬇️ Quitado min-h-[72px], agregado padding normal */}
            <div className="w-full px-6 lg:px-12 py-4 flex items-center justify-between min-h-[70px]">
                {/* Hamburguesa */}
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

                {/* Logo */}
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

                {/* Botones derecha */}
                <div className="w-1/3 flex justify-end items-center gap-3">
                    <button
                        onClick={handleNotificationsClick}
                        className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition"
                    >
                        <Bell size={20} />
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Overlay seguro en iOS */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed left-0 right-0 bottom-0 bg-black z-40"
                            style={{ top: "env(safe-area-inset-top)" }}
                            onClick={() => setOpen(false)}
                        />

                        {/* Drawer lateral */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.3 }}
                            className="fixed left-0 h-screen w-72 bg-neutral-900/95 border-r border-red-700 z-50 shadow-xl flex flex-col backdrop-blur-md"
                            style={{
                                top: "env(safe-area-inset-top)",
                                paddingTop: "env(safe-area-inset-top)"
                            }}
                        >
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
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
                                    </>
                                ) : null}
                            </div>

                            {user && !loading && (
                                <div className="p-4 border-t border-red-800 bg-neutral-950">
                                    <button
                                        onClick={async () => {
                                            await logout();
                                            await clearPushData();
                                            setOpen(false);
                                            window.location.href = "/login";
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-sm text-white transition font-semibold"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </header>
    );
}
