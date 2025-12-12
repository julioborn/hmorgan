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
} from "lucide-react";

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
    { href: "/", label: "Inicio", icon: Home },
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

        {/* DERECHA (vacía para balance visual) */}
        <div className="flex-1" />
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
              className="fixed left-0 top-[calc(env(safe-area-inset-top)+60px)] h-[calc(100%-env(safe-area-inset-top)-60px)] w-72 bg-black z-50 p-6 rounded-tr-2xl"
            >
              <button
                onClick={() => setOpen(false)}
                className="text-white mb-6"
              >
                <X size={28} />
              </button>

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
                className="mt-8 flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition text-lg"
              >
                <LogOut size={20} />
                Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
