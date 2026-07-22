"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, Trash2, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";
import Swal from "sweetalert2";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mes de inicio del servicio (ajustar si corresponde)
const INICIO_MES = 7;
const INICIO_AÑO = 2026;

type Cuota = {
    _id: string;
    mes: number;
    año: number;
    monto: number;
    fechaPago: string;
    notas: string;
};

function generarMeses(): { mes: number; año: number }[] {
    const hoy = new Date();
    const mesList: { mes: number; año: number }[] = [];
    let m = INICIO_MES;
    let a = INICIO_AÑO;
    while (a < hoy.getFullYear() || (a === hoy.getFullYear() && m <= hoy.getMonth() + 1)) {
        mesList.unshift({ mes: m, año: a });
        m++;
        if (m > 12) { m = 1; a++; }
    }
    return mesList;
}

function formatFechaPago(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(n: number) {
    return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function CuotasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [cuotas, setCuotas] = useState<Cuota[]>([]);
    const [cargando, setCargando] = useState(true);
    const meses = generarMeses();
    const esSuperadmin = user?.role === "superadmin";

    useEffect(() => {
        if (!loading && !["admin", "superadmin"].includes(user?.role ?? "")) {
            router.replace("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        fetch("/api/admin/cuotas", { credentials: "include" })
            .then(r => r.ok ? r.json() : [])
            .then(setCuotas)
            .catch(() => setCuotas([]))
            .finally(() => setCargando(false));
    }, []);

    function getCuota(mes: number, año: number): Cuota | undefined {
        return cuotas.find(c => c.mes === mes && c.año === año);
    }

    async function registrarPago(mes: number, año: number, cuotaExistente?: Cuota) {
        const { value: formValues } = await Swal.fire({
            title: `${MESES[mes - 1]} ${año}`,
            html: `
                <div style="text-align:left;display:flex;flex-direction:column;gap:12px;padding:4px 0">
                    <div>
                        <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Monto cobrado</label>
                        <input id="monto" type="number" class="swal2-input" style="margin:4px 0 0;width:100%"
                            placeholder="$ 0" value="${cuotaExistente?.monto ?? ""}">
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Fecha de pago</label>
                        <input id="fecha" type="date" class="swal2-input" style="margin:4px 0 0;width:100%"
                            value="${cuotaExistente?.fechaPago ? cuotaExistente.fechaPago.slice(0, 10) : new Date().toISOString().slice(0, 10)}">
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Notas (opcional)</label>
                        <input id="notas" type="text" class="swal2-input" style="margin:4px 0 0;width:100%"
                            placeholder="Ej: Transferencia bancaria" value="${cuotaExistente?.notas ?? ""}">
                    </div>
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Guardar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#111827",
            preConfirm: () => ({
                monto: parseFloat((document.getElementById("monto") as HTMLInputElement).value),
                fecha: (document.getElementById("fecha") as HTMLInputElement).value,
                notas: (document.getElementById("notas") as HTMLInputElement).value,
            }),
        });
        if (!formValues || !formValues.monto || isNaN(formValues.monto)) return;

        const res = await fetch("/api/admin/cuotas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ mes, año, monto: formValues.monto, fechaPago: formValues.fecha, notas: formValues.notas }),
        });
        if (!res.ok) return;
        const nueva = await res.json();
        setCuotas(prev => {
            const sin = prev.filter(c => !(c.mes === mes && c.año === año));
            return [...sin, nueva];
        });
    }

    async function eliminarPago(mes: number, año: number) {
        const { isConfirmed } = await Swal.fire({
            title: "¿Eliminar pago?",
            text: `Se borrará el registro de pago de ${MESES[mes - 1]} ${año}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#ef4444",
        });
        if (!isConfirmed) return;
        await fetch("/api/admin/cuotas", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ mes, año }),
        });
        setCuotas(prev => prev.filter(c => !(c.mes === mes && c.año === año)));
    }

    if (loading || cargando) return (
        <div className="flex justify-center py-20"><Loader size={48} /></div>
    );

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const añoActual = hoy.getFullYear();
    const pagadas = meses.filter(m => getCuota(m.mes, m.año)).length;
    const pendientes = meses.length - pagadas;

    return (
        <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 space-y-5"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

            {/* Header */}
            <div className="flex items-center gap-3 pt-5">
                <Link href="/admin" className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-800 transition">
                    <ChevronLeft size={18} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-gray-900">Cuotas del servicio</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Registro de pagos mensuales</p>
                </div>
                <CreditCard size={22} className="text-gray-400" />
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                    <p className="text-2xl font-black text-emerald-700">{pagadas}</p>
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">Pagadas</p>
                </div>
                <div className={`border rounded-2xl px-4 py-3 ${pendientes > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                    <p className={`text-2xl font-black ${pendientes > 0 ? "text-red-600" : "text-gray-400"}`}>{pendientes}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${pendientes > 0 ? "text-red-500" : "text-gray-400"}`}>Pendientes</p>
                </div>
            </div>

            {/* Lista de meses */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
                {meses.map(({ mes, año }) => {
                    const cuota = getCuota(mes, año);
                    const esEstesMes = mes === mesActual && año === añoActual;
                    const pagada = !!cuota;

                    return (
                        <div key={`${mes}-${año}`}
                            className={`px-4 py-3.5 flex items-center gap-3 ${esEstesMes ? "bg-gray-50" : ""}`}>

                            {/* Ícono estado */}
                            {pagada
                                ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                                : <Clock size={20} className={`shrink-0 ${esEstesMes ? "text-amber-400" : "text-gray-300"}`} />
                            }

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-gray-900">
                                        {MESES[mes - 1]} {año}
                                    </p>
                                    {esEstesMes && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black text-white">
                                            Este mes
                                        </span>
                                    )}
                                </div>
                                {pagada ? (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatMoney(cuota.monto)} · {formatFechaPago(cuota.fechaPago)}
                                        {cuota.notas && ` · ${cuota.notas}`}
                                    </p>
                                ) : (
                                    <p className={`text-xs mt-0.5 font-semibold ${esEstesMes ? "text-amber-500" : "text-gray-300"}`}>
                                        Pendiente
                                    </p>
                                )}
                            </div>

                            {/* Badge + acciones */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${pagada
                                    ? "bg-emerald-100 text-emerald-700"
                                    : esEstesMes
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-100 text-gray-400"
                                    }`}>
                                    {pagada ? "PAGADA" : "PENDIENTE"}
                                </span>

                                {esSuperadmin && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => registrarPago(mes, año, cuota)}
                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                                            title={pagada ? "Editar pago" : "Registrar pago"}
                                        >
                                            <Plus size={14} />
                                        </button>
                                        {pagada && (
                                            <button
                                                onClick={() => eliminarPago(mes, año)}
                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition"
                                                title="Eliminar pago"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
