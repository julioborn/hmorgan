"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { TrendingUp, Package, Users, Coins } from "lucide-react";

type Stats = {
    totalIngresos: number;
    totalPedidos: number;
    conteos: {
        pendiente: number;
        preparando: number;
        listo: number;
        entregado: number;
        cancelado: number;
    };
    itemsPopulares: { nombre: string; cantidad: number; categoria: string }[];
    pedidosPorDia: { fecha: string; cantidad: number }[];
    ingresosPorDia: { fecha: string; total: number }[];
    totalUsuarios: number;
    totalPuntos: number;
    pedidosEmpleado: number;
    pedidosCliente: number;
};

export default function EstadisticasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!loading && user?.role !== "admin") router.replace("/");
    }, [user, loading, router]);

    useEffect(() => {
        fetch("/api/admin/estadisticas", { cache: "no-store" })
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setLoadingStats(false));
    }, []);

    if (loading || loadingStats) {
        return (
            <div className="flex justify-center py-20">
                <Loader size={64} />
            </div>
        );
    }

    if (!stats || !stats.conteos) {
        return <p className="text-center py-20 text-gray-500">Error cargando estadísticas</p>;
    }

    const maxPedidosDia = Math.max(...stats.pedidosPorDia.map(d => d.cantidad), 1);
    const maxIngresosDia = Math.max(...stats.ingresosPorDia.map(d => d.total), 1);
    const maxItems = Math.max(...stats.itemsPopulares.map(i => i.cantidad), 1);

    return (
        <div
            className="min-h-screen bg-gray-50 pb-10 px-4 max-w-3xl mx-auto"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
        >
            <h1 className="text-3xl font-extrabold text-center py-8 text-black">Estadísticas</h1>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                    label="Ingresos totales"
                    value={`$${stats.totalIngresos.toLocaleString("es-AR")}`}
                    color="bg-green-50 border-green-200"
                />
                <StatCard
                    icon={<Package className="w-6 h-6 text-red-600" />}
                    label="Total pedidos"
                    value={stats.totalPedidos}
                    color="bg-red-50 border-red-200"
                />
                <StatCard
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    label="Clientes registrados"
                    value={stats.totalUsuarios}
                    color="bg-blue-50 border-blue-200"
                />
                <StatCard
                    icon={<Coins className="w-6 h-6 text-yellow-600" />}
                    label="Puntos distribuidos"
                    value={stats.totalPuntos.toLocaleString("es-AR")}
                    color="bg-yellow-50 border-yellow-200"
                />
            </div>

            {/* Estado de pedidos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="font-bold text-lg text-gray-900 mb-4">Estado de pedidos</h2>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                        <p className="text-2xl font-extrabold text-yellow-700">{stats.conteos.pendiente}</p>
                        <p className="text-xs text-yellow-700 font-medium">Pendientes</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                        <p className="text-2xl font-extrabold text-orange-700">{stats.conteos.preparando}</p>
                        <p className="text-xs text-orange-700 font-medium">Preparando</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                        <p className="text-2xl font-extrabold text-emerald-700">{stats.conteos.entregado}</p>
                        <p className="text-xs text-emerald-700 font-medium">Entregados</p>
                    </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                    <span>Pedidos de clientes: <strong>{stats.pedidosCliente}</strong></span>
                    <span>Pedidos de mozos: <strong>{stats.pedidosEmpleado}</strong></span>
                </div>
            </div>

            {/* Pedidos últimos 7 días */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="font-bold text-lg text-gray-900 mb-4">Pedidos — últimos 7 días</h2>
                <div className="flex items-end gap-2 h-32">
                    {stats.pedidosPorDia.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-700">{d.cantidad > 0 ? d.cantidad : ""}</span>
                            <div
                                className="w-full bg-red-500 rounded-t-lg"
                                style={{
                                    height: `${(d.cantidad / maxPedidosDia) * 96}px`,
                                    minHeight: d.cantidad > 0 ? "4px" : "0px",
                                }}
                            />
                            <span className="text-[10px] text-gray-500 text-center leading-tight">{d.fecha}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ingresos últimos 7 días */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="font-bold text-lg text-gray-900 mb-4">Ingresos — últimos 7 días</h2>
                <div className="flex items-end gap-2 h-32">
                    {stats.ingresosPorDia.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-700">
                                {d.total > 0 ? `$${d.total.toLocaleString("es-AR")}` : ""}
                            </span>
                            <div
                                className="w-full bg-green-500 rounded-t-lg"
                                style={{
                                    height: `${(d.total / maxIngresosDia) * 96}px`,
                                    minHeight: d.total > 0 ? "4px" : "0px",
                                }}
                            />
                            <span className="text-[10px] text-gray-500 text-center leading-tight">{d.fecha}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Productos más pedidos */}
            {stats.itemsPopulares.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-lg text-gray-900 mb-4">Productos más pedidos</h2>
                    <div className="space-y-3">
                        {stats.itemsPopulares.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-800">{item.nombre}</span>
                                        <span className="font-bold text-red-600">×{item.cantidad}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${(item.cantidad / maxItems) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className={`${color} rounded-2xl border p-4`}>
            <div className="mb-2">{icon}</div>
            <p className="text-xs text-gray-600 font-medium">{label}</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{value}</p>
        </div>
    );
}
