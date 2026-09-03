"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Save, ClipboardList, Trash2, Loader2, X } from "lucide-react";

type StockItem = {
    _id: string;
    nombre: string;
    tipo: string;
    categoria: string;
    unidad: string;
    stockActual: number;
};

type ConteoItem = {
    stockId: string;
    nombre: string;
    tipo: string;
    categoria: string;
    unidad: string;
    cantidad: number;
};

type Conteo = {
    _id: string;
    createdAt: string;
    notas?: string;
    items: ConteoItem[];
};

const TIPO_LABEL: Record<string, string> = { cocina: "🍳 Cocina", bebida: "🍺 Bebida" };

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function CargarStockPage() {
    const router = useRouter();
    const [productos, setProductos] = useState<StockItem[]>([]);
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [notas, setNotas] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingProd, setLoadingProd] = useState(true);

    // historial
    const [conteos, setConteos] = useState<Conteo[]>([]);
    const [loadingConteos, setLoadingConteos] = useState(true);
    const [expandido, setExpandido] = useState<string | null>(null);
    const [comparandoCon, setComparandoCon] = useState<string | null>(null);

    // vista: "cargar" | "historial"
    const [vista, setVista] = useState<"cargar" | "historial">("cargar");

    // grupos expandidos en la carga
    const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});

    const loadProductos = useCallback(() => {
        setLoadingProd(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const activos = data.filter((i: StockItem) => i.stockActual >= 0);
                    setProductos(activos);
                    // pre-rellenar con stock actual
                    const init: Record<string, string> = {};
                    activos.forEach((i: StockItem) => { init[i._id] = String(i.stockActual); });
                    setCantidades(init);
                    // abrir todos los grupos por defecto
                    const grupos: Record<string, boolean> = {};
                    activos.forEach((i: StockItem) => { grupos[`${i.tipo}-${i.categoria}`] = true; });
                    setGruposAbiertos(grupos);
                }
            })
            .finally(() => setLoadingProd(false));
    }, []);

    const loadConteos = useCallback(() => {
        setLoadingConteos(true);
        fetch("/api/superadmin/stock/conteos", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setConteos(data); })
            .finally(() => setLoadingConteos(false));
    }, []);

    useEffect(() => { loadProductos(); loadConteos(); }, [loadProductos, loadConteos]);

    async function guardar() {
        const items: ConteoItem[] = productos.map(p => ({
            stockId: p._id,
            nombre: p.nombre,
            tipo: p.tipo,
            categoria: p.categoria,
            unidad: p.unidad,
            cantidad: Number(cantidades[p._id] ?? 0),
        }));
        setSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/conteos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ items, notas }),
            });
            if (res.ok) {
                setNotas("");
                loadConteos();
                setVista("historial");
            }
        } finally { setSaving(false); }
    }

    async function eliminarConteo(id: string) {
        await fetch(`/api/superadmin/stock/conteos/${id}`, { method: "DELETE", credentials: "include" });
        setConteos(prev => prev.filter(c => c._id !== id));
        if (expandido === id) setExpandido(null);
        if (comparandoCon === id) setComparandoCon(null);
    }

    // Agrupación por tipo → subcategorías
    const porTipo = (["cocina", "bebida"] as const).map(tipo => {
        const prodsTipo = productos.filter(p => (p.tipo ?? "bebida") === tipo);
        const subcats = prodsTipo.reduce((acc, p) => {
            const cat = p.categoria || "Otros";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {} as Record<string, StockItem[]>);
        return { tipo, subcats, total: prodsTipo.length };
    }).filter(t => t.total > 0);

    // Comparativa entre dos conteos
    const conteoBase = conteos.find(c => c._id === expandido);
    const conteoComp = conteos.find(c => c._id === comparandoCon);

    return (
        <div className="min-h-screen pb-24">
            <div className="px-4 max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 py-5">
                    <button onClick={() => router.push("/admin/stock")} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-extrabold text-black flex-1">Cargar Stock</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setVista("cargar")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${vista === "cargar" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        <Save size={15} /> Nueva carga
                    </button>
                    <button onClick={() => setVista("historial")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${vista === "historial" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        <ClipboardList size={15} /> Historial {conteos.length > 0 && <span className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{conteos.length}</span>}
                    </button>
                </div>

                {/* ── VISTA CARGAR ── */}
                {vista === "cargar" && (
                    <>
                        <p className="text-xs text-gray-400 mb-4">Ingresá la cantidad actual de cada producto. Esto queda guardado como registro de esta semana.</p>

                        {loadingProd ? (
                            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                        ) : (
                            <>
                                {porTipo.map(({ tipo, subcats }) => {
                                    const tipoKey = `tipo-${tipo}`;
                                    const tipoAbierto = gruposAbiertos[tipoKey] !== false;
                                    return (
                                        <div key={tipo} className="mb-6">
                                            {/* Encabezado de tipo */}
                                            <button
                                                onClick={() => setGruposAbiertos(p => ({ ...p, [tipoKey]: !tipoAbierto }))}
                                                className="w-full flex items-center justify-between mb-3"
                                            >
                                                <p className="text-base font-black text-gray-900">{TIPO_LABEL[tipo]}</p>
                                                {tipoAbierto ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                            </button>

                                            {tipoAbierto && Object.entries(subcats).sort(([a], [b]) => a.localeCompare(b)).map(([cat, prods]) => {
                                                const subKey = `${tipo}-${cat}`;
                                                const subAbierto = gruposAbiertos[subKey] !== false;
                                                return (
                                                    <div key={cat} className="mb-3 ml-1">
                                                        {/* Encabezado de subcategoría */}
                                                        <button
                                                            onClick={() => setGruposAbiertos(p => ({ ...p, [subKey]: !subAbierto }))}
                                                            className="w-full flex items-center justify-between px-1 mb-2"
                                                        >
                                                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{cat}</p>
                                                            {subAbierto ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                                        </button>

                                                        {subAbierto && (
                                                            <div className="space-y-2">
                                                                {prods.map(prod => (
                                                                    <div key={prod._id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                                                        <p className="flex-1 text-sm font-semibold text-gray-800">{prod.nombre}</p>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <button onClick={() => setCantidades(p => ({ ...p, [prod._id]: String(Math.max(0, Number(p[prod._id] ?? 0) - 1)) }))}
                                                                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg transition">−</button>
                                                                            <input
                                                                                type="number" min="0" step="any" inputMode="numeric"
                                                                                value={cantidades[prod._id] ?? "0"}
                                                                                onChange={e => setCantidades(p => ({ ...p, [prod._id]: e.target.value }))}
                                                                                className="w-16 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                                            />
                                                                            <button onClick={() => setCantidades(p => ({ ...p, [prod._id]: String(Number(p[prod._id] ?? 0) + 1) }))}
                                                                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg transition">+</button>
                                                                            <span className="text-xs text-gray-400 w-12">{prod.unidad}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                                <div className="mt-4">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Notas (opcional)</label>
                                    <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                                        placeholder="Ej: semana del 2 al 8 de septiembre, post-evento..."
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
                                </div>

                                <button onClick={guardar} disabled={saving || loadingProd}
                                    className="w-full mt-4 py-3.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                                    {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar carga de esta semana</>}
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* ── VISTA HISTORIAL ── */}
                {vista === "historial" && (
                    <>
                        {loadingConteos ? (
                            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                        ) : conteos.length === 0 ? (
                            <p className="text-center text-gray-400 py-16 text-sm">Todavía no hay cargas registradas.</p>
                        ) : (
                            <div className="space-y-3">
                                {/* Selector de comparativa */}
                                {conteos.length >= 2 && expandido && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <p className="text-xs font-semibold text-blue-700 mb-2">Comparar con:</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setComparandoCon(null)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${!comparandoCon ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200"}`}>
                                                Sin comparar
                                            </button>
                                            {conteos.filter(c => c._id !== expandido).map(c => (
                                                <button key={c._id} onClick={() => setComparandoCon(c._id)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${comparandoCon === c._id ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200"}`}>
                                                    {new Date(c.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {conteos.map(conteo => {
                                    const abierto = expandido === conteo._id;
                                    const gruposConteo = conteo.items.reduce((acc, it) => {
                                        const key = `${it.tipo}-${it.categoria}`;
                                        if (!acc[key]) acc[key] = { tipo: it.tipo, categoria: it.categoria, items: [] };
                                        acc[key].items.push(it);
                                        return acc;
                                    }, {} as Record<string, { tipo: string; categoria: string; items: ConteoItem[] }>);

                                    return (
                                        <div key={conteo._id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <button onClick={() => { setExpandido(abierto ? null : conteo._id); setComparandoCon(null); }} className="flex-1 text-left">
                                                    <p className="text-sm font-black text-gray-900 capitalize">{formatFecha(conteo.createdAt)}</p>
                                                    {conteo.notas && <p className="text-xs text-gray-400 mt-0.5 italic">{conteo.notas}</p>}
                                                    <p className="text-xs text-gray-400 mt-0.5">{conteo.items.length} productos</p>
                                                </button>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => { setExpandido(abierto ? null : conteo._id); setComparandoCon(null); }}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition">
                                                        {abierto ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                                                    </button>
                                                    <button onClick={() => eliminarConteo(conteo._id)}
                                                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                                        <Trash2 size={14} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </div>

                                            {abierto && (
                                                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                                                    {Object.entries(gruposConteo).sort(([a], [b]) => a.localeCompare(b)).map(([key, grupo]) => (
                                                        <div key={key}>
                                                            <div className="mb-2">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{TIPO_LABEL[grupo.tipo] ?? grupo.tipo}</span>
                                                                <p className="text-xs font-black text-gray-600">{grupo.categoria}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {grupo.items.map((it, idx) => {
                                                                    const compItem = conteoComp?.items.find(ci => ci.stockId === it.stockId);
                                                                    const diff = compItem !== undefined ? it.cantidad - compItem.cantidad : null;
                                                                    return (
                                                                        <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-50 gap-2">
                                                                            <p className="text-sm text-gray-700 flex-1">{it.nombre}</p>
                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                {compItem !== undefined && (
                                                                                    <span className="text-xs text-gray-400">{formatNum(compItem.cantidad)}</span>
                                                                                )}
                                                                                <span className="text-sm font-bold text-gray-900">{formatNum(it.cantidad)} <span className="text-xs font-normal text-gray-400">{it.unidad}</span></span>
                                                                                {diff !== null && (
                                                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                                                                        {diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
