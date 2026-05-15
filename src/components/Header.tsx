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
  PackagePlus,
  History,
  Ticket,
  Package,
  LoaderPinwheel,
  ScanText,
  ScanQrCode,
  UserRoundPen,
  Settings,
  Star,
  Home,
  LogOut,
  MessageSquare,
} from "lucide-react";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatsCount, setChatsCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "cliente")) return;
    const fetchChats = async () => {
      try {
        const res = await fetch("/api/pedidos", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const activos = data.filter(
          (p: any) => p.chatActivo || ["pendiente", "preparando", "listo"].includes(p.estado)
        );
        setChatsCount(activos.length || 0);
      } catch {}
    };
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const linksCliente = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/cliente/chats", label: "Chats", icon: MessageSquare },
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
    { href: "/", label: "Inicio", icon: Home },
    { href: "/admin/chats", label: "Chats", icon: MessageSquare },
    { href: "/admin/scan", label: "Escanear Puntos", icon: ScanQrCode },
    { href: "/admin/rewards/scan", label: "Escanear Canjes", icon: ScanText },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/menu", label: "Menú", icon: Utensils },
    { href: "/admin/rewards", label: "Canjes", icon: Ticket },
    { href: "/admin/pedidos", label: "Pedidos", icon: Package },
    { href: "/admin/configuracion", label: "Ajustes", icon: Settings },
    { href: "/admin/reviews", label: "Reseñas", icon: Star },
  ];

  const links = user?.role === "admin" ? linksAdmin : linksCliente;

  if (loading) return null;

  return (
    <header className="fixed left-0 right-0 z-30 bg-black">

      {/* Safe area / Dynamic Island */}
      <div style={{ height: "calc(env(safe-area-inset-top) + 40px)" }} />

      {/* Header visible */}
      <div className="w-full px-6 py-4 flex items-center">

        {/* IZQUIERDA */}
        <div className="flex-1">
          {user && (
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-md hover:bg-red-700/20 transition"
            >
              <Menu size={26} className="text-red-600" />
            </button>
          )}
        </div>

        {/* CENTRO */}
        <div className="flex-1 flex justify-center">
          <Link href="/">
            <img
              src="/morganwhite.png"
              width={58}
              height={58}
              className="cursor-pointer"
            />
          </Link>
        </div>

        {/* DERECHA — inbox de chats */}
        <div className="flex-1 flex justify-end pr-1">
          {user && (user.role === "admin" || user.role === "cliente") && (
            <Link
              href={user.role === "admin" ? "/admin/chats" : "/cliente/chats"}
              className="relative p-2 rounded-md hover:bg-white/10 transition"
            >
              <MessageSquare size={24} className="text-white" />
              {chatsCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5 ring-1 ring-black animate-pulse">
                  {chatsCount > 9 ? "9+" : chatsCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* MENÚ */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3 }}
              className="fixed left-0 top-[calc(env(safe-area-inset-top)+60px)] h-[calc(100%-env(safe-area-inset-top)-60px)] w-72 bg-black z-50 flex flex-col rounded-tr-2xl"
            >
              <div className="p-6 pb-0">
                <button
                  onClick={() => setOpen(false)}
                  className="text-white mb-6"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <nav className="flex flex-col gap-3">
                  {links.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-lg transition
                          ${
                            active
                              ? "bg-red-600 text-white"
                              : "text-white hover:bg-red-600/20"
                          }`}
                      >
                        <Icon size={20} />
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Cerrar sesión */}
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="mt-8 flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition text-lg w-full"
                >
                  <LogOut size={20} />
                  Cerrar sesión
                </button>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
