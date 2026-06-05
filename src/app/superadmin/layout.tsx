"use client";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Package, Wallet, ClipboardList, Users, Utensils, BarChart2, Settings, MapPin, CalendarDays, CreditCard } from "lucide-react";

const NAV = [
    { href: "/superadmin", label: "Inicio", icon: LayoutGrid },
    { href: "/superadmin/stock", label: "Stock", icon: Package },
    { href: "/superadmin/caja", label: "Caja", icon: Wallet },
    { href: "/superadmin/mesas", label: "Mesas", icon: MapPin },
    { href: "/superadmin/reservas", label: "Reservas", icon: CalendarDays },
    { href: "/caja",                 label: "Cajero",   icon: Wallet },
    { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/menu", label: "Menú", icon: Utensils },
    { href: "/admin/estadisticas", label: "Stats", icon: BarChart2 },
    { href: "/admin/configuracion", label: "Config", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && user?.role !== "superadmin") router.replace("/");
    }, [user, loading, router]);

    if (loading || user?.role !== "superadmin") return null;

    return (
        <div className="print:hidden">
            {/* Subnav */}
            <div className="bg-gray-900 border-b border-gray-700 overflow-x-auto">
                <div className="flex gap-0.5 px-2 py-1.5 min-w-max">
                    {NAV.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link key={href} href={href}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                                    active ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </div>
            {children}
        </div>
    );
}
