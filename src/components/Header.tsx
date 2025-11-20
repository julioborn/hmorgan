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
                top: 0,
                backgroundColor: "#000",
                paddingTop: "env(safe-area-inset-top, 24px)",
                height: "180px",             // ⬅️ HACE EL HEADER GIGANTE PARA PROBAR
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end"   // ⬅️ BAJA EL CONTENIDO
            }}
        >
            <div className="w-full px-6 py-6 flex items-center justify-between">
                {/* Hamburguesa */}
                <div>
                    <button className="p-2">
                        <Menu size={28} className="text-red-500" />
                    </button>
                </div>

                {/* Logo */}
                <div className="flex justify-center flex-1">
                    <Image
                        src="/morganwhite.png"
                        alt="Morgan Bar"
                        width={90}
                        height={90}
                    />
                </div>

                {/* Iconos derecha */}
                <div className="flex items-center gap-4">
                    <button className="p-2 bg-red-600 rounded-full">
                        <Bell size={20} className="text-white" />
                    </button>
                    <button className="p-2 bg-red-600 rounded-full">
                        <RefreshCw size={20} className="text-white" />
                    </button>
                </div>
            </div>
        </header>
    );
}
