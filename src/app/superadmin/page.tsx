"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Wallet, ClipboardList, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function SuperAdminDashboard() {
    const [stockAlertas, setStockAlertas] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
    const [cajaMovimientos, setCajaMovimientos] = useState(0);

    useEffect(() => {
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then((items: any[]) => {
                if (!Array.isArray(items)) return;
                setTotalItems(items.length);
                setStockAlertas(items.filter(i => i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo).length);
            }).catch(() => {});

        fetch("/api/superadmin/caja", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                setCajaAbierta(!!data.sesion);
                setCajaMovimientos(data.movimientos?.length ?? 0);
            }).catch(() => {});
    }, []);

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-black text-gray-900 mt-4 mb-1">Panel Superadmin</h1>
            <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded">
                Acceso exclusivo del desarrollador
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/superadmin/stock"
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition active:scale-[0.98]">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stockAlertas > 0 ? "bg-yellow-100" : "bg-gray-100"}`}>
                        {stockAlertas > 0
                            ? <AlertTriangle size={22} className="text-yellow-600" />
                            : <Package size={22} className="text-gray-500" />
                        }
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900">Stock</p>
                        <p className="text-xs text-gray-500">
                            {totalItems} producto{totalItems !== 1 ? "s" : ""}
                            {stockAlertas > 0 && <span className="text-yellow-600 font-semibold"> · {stockAlertas} bajo mínimo</span>}
                        </p>
                    </div>
                </Link>

                <Link href="/superadmin/caja"
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition active:scale-[0.98]">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cajaAbierta ? "bg-emerald-100" : "bg-gray-100"}`}>
                        {cajaAbierta
                            ? <CheckCircle size={22} className="text-emerald-600" />
                            : <Wallet size={22} className="text-gray-500" />
                        }
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900">Caja</p>
                        <p className="text-xs text-gray-500">
                            {cajaAbierta === null ? "Cargando..." : cajaAbierta
                                ? <span className="text-emerald-600 font-semibold">Sesión abierta · {cajaMovimientos} movimientos</span>
                                : "Sin sesión activa"
                            }
                        </p>
                    </div>
                </Link>

                <Link href="/admin/pedidos"
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition active:scale-[0.98] sm:col-span-2">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gray-100">
                        <ClipboardList size={22} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900">Pedidos</p>
                        <p className="text-xs text-gray-500">Gestión de pedidos (panel admin)</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
