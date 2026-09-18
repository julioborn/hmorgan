"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";
import { ChevronLeft, Plus, X, Trash2, History, Loader2, TrendingUp, TrendingDown } from "lucide-react";

type Tipo = "cocina" | "bebida";
type Presentacion = { nombre: string; unidades: number };
type StockSubcategoria = { _id: string; tipo: Tipo; nombre: string };
type StockItem = {
    _id?: string; nombre: string; descripcion?: string; tipo: Tipo;
    categoria: string; unidad: string; stockActual: number; stockMinimo: number;
    activo: boolean; presentaciones: Presentacion[];
};
type StockMovimiento = {
    _id: string; tipo: "entrada" | "salida"; cantidad: number;
    motivo: string; createdAt: string;
};

const TIPO_META = {
    cocina: { label: "Cocina", emoji: "🍳", accent: "bg-orange-600" },
    bebida:  { label: "Bebida", emoji: "🍺", accent: "bg-blue-600" },
} as const;

const inputCls = "w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white";

function Label({ text }: { text: string }) {
    return <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{text}</p>;
}

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export default function EditarStockPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const esNuevo = id === "nuevo";

    const tipoParam = (searchParams.get("tipo") ?? "cocina") as Tipo;
    const categoriaParam = searchParams.get("categoria") ?? "";

    const [form, setForm] = useState<StockItem>({
        nombre: "", descripcion: "", tipo: tipoParam, categoria: categoriaParam,
        unidad: "unidades", stockActual: 0, stockMinimo: 0, activo: true, presentaciones: [],
    });
    const [subcats, setSubcats] = useState<StockSubcategoria[]>([]);
    const [historial, setHistorial] = useState<StockMovimiento[]>([]);
    const [mostrarHist, setMostrarHist] = useState(false);
    const [histLoading, setHistLoading] = useState(false);
    const [loading, setLoading] = useState(!esNuevo);
    const [saving, setSaving] = useState(false);

    // Cargar item existente
    useEffect(() => {
        if (esNuevo) return;
        fetch(`/api/superadmin/stock/${id}`, { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (data.item) setForm({ ...data.item, presentaciones: data.item.presentaciones ?? [] });
            })
            .finally(() => setLoading(false));
    }, [id, esNuevo]);

    // Cargar subcategorías
    useEffect(() => {
        fetch("/api/superadmin/stock/subcategorias", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setSubcats(data); });
    }, []);

    async function cargarHistorial() {
        if (esNuevo) return;
        setHistLoading(true);
        try {
            const res = await fetch(`/api/superadmin/stock/${id}`, { credentials: "include" });
            const data = await res.json();
            setHistorial(data.movimientos ?? []);
        } finally { setHistLoading(false); }
    }

    async function guardar() {
        if (!form.nombre.trim()) return;
        setSaving(true);
        try {
            const { _id, stockActual, ...body } = form as any;
            const url = esNuevo ? "/api/superadmin/stock" : `/api/superadmin/stock/${id}`;
            const method = esNuevo ? "POST" : "PATCH";
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                credentials: "include", body: JSON.stringify(esNuevo ? { ...body, stockActual: 0 } : body),
            });
            if (res.ok) router.back();
        } finally { setSaving(false); }
    }

    async function eliminar() {
        const r = await swalBase.fire({
            title: `¿Eliminar "${form.nombre}"?`,
            icon: "warning", showCancelButton: true,
            confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        await fetch(`/api/superadmin/stock/${id}`, { method: "DELETE", credentials: "include" });
        router.back();
    }

    const subcatsDeTipo = subcats.filter(s => s.tipo === form.tipo);

    function addPresentacion() {
        setForm(f => ({ ...f, presentaciones: [...f.presentaciones, { nombre: "", unidades: 1 }] }));
    }
    function removePresentacion(idx: number) {
        setForm(f => ({ ...f, presentaciones: f.presentaciones.filter((_, i) => i !== idx) }));
    }
    function updatePresentacion(idx: number, field: keyof Presentacion, value: string | number) {
        setForm(f => {
            const arr = [...f.presentaciones];
            arr[idx] = { ...arr[idx], [field]: value };
            return { ...f, presentaciones: arr };
        });
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-28 px-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 py-5">
                <button onClick={() => router.back()}
                    className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shrink-0">
                    <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-extrabold text-black">
                    {esNuevo ? "Nuevo producto" : "Editar producto"}
                </h1>
            </div>

            <div className="space-y-5">
                {/* Sección */}
                <div>
                    <Label text="Sección" />
                    <div className="flex gap-2">
                        {(["cocina", "bebida"] as Tipo[]).map(t => (
                            <button key={t}
                                onClick={() => setForm(f => ({ ...f, tipo: t, categoria: "" }))}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition ${form.tipo === t ? TIPO_META[t].accent + " text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                {TIPO_META[t].emoji} {TIPO_META[t].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nombre */}
                <div>
                    <Label text="Nombre *" />
                    <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Ej: Cerveza Quilmes" className={inputCls} />
                </div>

                {/* Subcategoría */}
                <div>
                    <Label text="Subcategoría" />
                    {subcatsDeTipo.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {subcatsDeTipo.map(s => (
                                <button key={s._id}
                                    onClick={() => setForm(f => ({ ...f, categoria: s.nombre }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${form.categoria === s.nombre
                                        ? (form.tipo === "bebida" ? "bg-blue-600 text-white border-blue-600" : "bg-orange-600 text-white border-orange-600")
                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                                    {s.nombre}
                                </button>
                            ))}
                        </div>
                    )}
                    <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                        placeholder="O escribí una personalizada" className={inputCls} />
                </div>

                {/* Unidad */}
                <div>
                    <Label text="Unidad de medida" />
                    <input value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                        placeholder="kg, lts, unidades, cajas…" className={inputCls} />
                </div>

                {/* Presentaciones */}
                <div>
                    <Label text="Presentaciones (cajón, caja, bolsa, etc.)" />
                    <div className="space-y-2">
                        {form.presentaciones.map((p, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-gray-50 rounded-xl p-3">
                                <input value={p.nombre}
                                    onChange={e => updatePresentacion(idx, "nombre", e.target.value)}
                                    placeholder="Nombre (ej: Cajón)" className={inputCls + " flex-1"} />
                                <div className="flex items-center gap-1 shrink-0">
                                    <input type="number" min="0.001" step="any" inputMode="decimal"
                                        value={p.unidades}
                                        onChange={e => updatePresentacion(idx, "unidades", Number(e.target.value))}
                                        placeholder="Cant." className={inputCls + " w-20"} />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{form.unidad || "u."}</span>
                                </div>
                                <button onClick={() => removePresentacion(idx)}
                                    className="p-2 text-red-400 hover:text-red-600 transition shrink-0">
                                    <X size={15} />
                                </button>
                            </div>
                        ))}
                        <button onClick={addPresentacion}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-semibold py-2 px-3 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition w-full justify-center">
                            <Plus size={14} /> Agregar presentación
                        </button>
                    </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-3">
                    {!esNuevo && (
                        <div>
                            <Label text="Stock actual" />
                            <div className={inputCls + " text-gray-400 bg-gray-50 cursor-default"}>
                                {formatNum(form.stockActual)} {form.unidad}
                            </div>
                        </div>
                    )}
                    <div className={esNuevo ? "col-span-2" : ""}>
                        <Label text="Stock mínimo" />
                        <input type="number" min="0" value={form.stockMinimo}
                            onChange={e => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))}
                            className={inputCls} />
                    </div>
                </div>

                {/* Activo */}
                {!esNuevo && (
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.activo}
                            onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                            className="w-4 h-4 accent-gray-700" />
                        <span className="text-sm text-gray-700 font-medium">Producto activo</span>
                    </label>
                )}

                {/* Historial */}
                {!esNuevo && (
                    <div>
                        <button
                            onClick={async () => {
                                if (!mostrarHist && historial.length === 0) await cargarHistorial();
                                setMostrarHist(v => !v);
                            }}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition w-full justify-center">
                            <History size={15} /> {mostrarHist ? "Ocultar historial" : "Ver historial de movimientos"}
                        </button>

                        {mostrarHist && (
                            <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
                                {histLoading ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="animate-spin text-gray-400" size={22} />
                                    </div>
                                ) : historial.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-5">Sin movimientos</p>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {historial.map(m => (
                                            <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.tipo === "entrada" ? "bg-emerald-100" : "bg-red-100"}`}>
                                                    {m.tipo === "entrada"
                                                        ? <TrendingUp size={12} className="text-emerald-600" />
                                                        : <TrendingDown size={12} className="text-red-600" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{m.motivo}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(m.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                                <p className={`text-sm font-black shrink-0 ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                                                    {m.tipo === "entrada" ? "+" : "−"}{formatNum(m.cantidad)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer fijo */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 flex gap-2 max-w-lg mx-auto">
                {!esNuevo && (
                    <button onClick={eliminar}
                        className="flex items-center justify-center gap-1.5 px-4 py-3 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-semibold transition shrink-0">
                        <Trash2 size={15} /> Eliminar
                    </button>
                )}
                <button onClick={() => router.back()}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                </button>
                <button onClick={guardar} disabled={saving || !form.nombre.trim()}
                    className="flex-1 py-3 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </div>
    );
}
