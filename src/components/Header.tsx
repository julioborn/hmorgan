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
  BarChart2,
  LayoutGrid,
  Images,
  Bell,
  ClipboardList,
  CalendarDays,
  Truck,
} from "lucide-react";
import NotifBell from "@/components/NotifBell";

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
    { href: "/cliente/ruleta", label: "Ruleta de Tragos", icon: LoaderPinwheel },
    { href: "/cliente/reservas", label: "Reservas", icon: CalendarDays },
  ];

  const linksAdmin = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/caja", label: "Caja", icon: ClipboardList },
    { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/admin/caja", label: "Caja Admin", icon: BarChart2 },
    { href: "/admin/scan", label: "Escanear Puntos", icon: ScanQrCode },
    { href: "/admin/rewards/scan", label: "Escanear Canjes", icon: ScanText },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/menu", label: "Menú", icon: Utensils },
    { href: "/admin/rewards", label: "Canjes", icon: Ticket },
    { href: "/admin/mesas", label: "Mesas", icon: LayoutGrid },
    { href: "/admin/reviews", label: "Reseñas", icon: Star },
    { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart2 },
    { href: "/admin/carrousel", label: "Fotos", icon: Images },
    { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
    { href: "/admin/configuracion", label: "Ajustes", icon: Settings },
  ];

  const linksSuper = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/admin/caja", label: "Caja", icon: BarChart2 },
    { href: "/admin/stock", label: "Stock", icon: Package },
    { href: "/admin/mesas", label: "Mesas", icon: LayoutGrid },
    { href: "/admin/reservas", label: "Reservas", icon: CalendarDays },
    { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/admin/empleados", label: "Empleados", icon: Users },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/menu", label: "Menú", icon: Utensils },
    { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart2 },
    { href: "/admin/configuracion", label: "Ajustes", icon: Settings },
  ];

  const linksCajero = [
    { href: "/caja", label: "Caja", icon: ClipboardList },
  ];

  const linksDelivery = [
    { href: "/delivery", label: "Entregas", icon: Truck },
  ];

  const linksEmpleado = [
    { href: "/empleado/anotador", label: "Anotador de Pedidos", icon: ClipboardList },
    { href: "/menu", label: "Menú", icon: Utensils },
    { href: "/cliente/reservas", label: "Reservas de mesas", icon: CalendarDays },
  ];

  const links =
    user?.role === "superadmin" ? linksSuper :
    user?.role === "admin"      ? linksAdmin :
    user?.role === "cajero"     ? linksCajero :
    user?.role === "delivery"   ? linksDelivery :
    user?.role === "empleado"   ? linksEmpleado :
    linksCliente;

  if (loading) return null;

  return (
    <header className="fixed left-0 right-0 z-30 bg-black print:hidden">

      {/* Safe area / Dynamic Island */}
      <div style={{ height: "calc(env(safe-area-inset-top) + 16px)" }} />

      {/* Header visible */}
      <div className="w-full px-4 py-2 flex items-center">

        {/* IZQUIERDA */}
        <div className="flex-1">
          {user && (
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-md hover:bg-red-700/20 transition"
            >
              <Menu size={22} className="text-red-600" />
            </button>
          )}
        </div>

        {/* CENTRO */}
        <div className="flex-1 flex justify-center">
          <Link href="/">
            <img
              src="/morganwhite.png"
              width={48}
              height={48}
              className="cursor-pointer"
            />
          </Link>
        </div>

        {/* DERECHA — campanita */}
        <div className="flex-1 flex justify-end items-center gap-1 pr-1">
          {user && (user.role === "admin" || user.role === "cliente") && (
            <NotifBell />
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
              className="fixed left-0 top-[calc(env(safe-area-inset-top)+40px)] h-[calc(100%-env(safe-area-inset-top)-40px)] w-72 bg-black z-50 flex flex-col rounded-tr-2xl"
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
