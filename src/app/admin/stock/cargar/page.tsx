"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Save, ClipboardList, Trash2, Loader2, DollarSign, RotateCcw, PlusCircle } from "lucide-react";

const DRAFT_KEY = "hmorgan_stock_cargar_draft";

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
    precioUnitario?: number;
};

type Conteo = {
    _id: string;
    createdAt: string;
    notas?: string;
    items: ConteoItem[];
    totalValorizacion?: number;
};

type Draft = {
    cantidades: Record<string, string>;
    notas: string;
    precios: Record<string, string>;
    savedAt: number;
};

type Tipo = "cocina" | "bebida";

const TIPO_META: Record<Tipo, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    cocina: { label: "Cocina", emoji: "🍳", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    bebida: { label: "Bebida", emoji: "🍺", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
};

const TIPO_LABEL: Record<string, string> = { cocina: "🍳 Cocina", bebida: "🍺 Bebida" };

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatFechaCorta = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

const formatHora = (ts: number) =>
    new Date(ts).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function CargarStockPage() {
    const router = useRouter();
    const [productos, setProductos] = useState<StockItem[]>([]);
    const [loadingProd, setLoadingProd] = useState(true);
    const [productosLoaded, setProductosLoaded] = useState(false);

    // vista principal
    const [vista, setVista] = useState<"cargar" | "historial" | "agregar">("cargar");

    // navegación dentro del formulario (compartida entre cargar y agregar)
    const [navTipo, setNavTipo] = useState<Tipo | null>(null);
    const [navSubcat, setNavSubcat] = useState<string | null>(null);

    // ── Estado carga nueva ──
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [notas, setNotas] = useState("");
    const [precios, setPrecios] = useState<Record<string, string>>({});
    const [mostrarPrecios, setMostrarPrecios] = useState(false);
    const [saving, setSaving] = useState(false);
    const [borrador, setBorrador] = useState<Draft | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // ── Estado agregar ──
    const [conteoObjetivo, setConteoObjetivo] = useState<Conteo | null>(null);
    const [cantAgregar, setCantAgregar] = useState<Record<string, string>>({});
    const [preciosAgregar, setPreciosAgregar] = useState<Record<string, string>>({});
    const [mostrarPreciosAgregar, setMostrarPreciosAgregar] = useState(false);
    const [savingAgregar, setSavingAgregar] = useState(false);

    // ── Historial ──
    const [conteos, setConteos] = useState<Conteo[]>([]);
    const [loadingConteos, setLoadingConteos] = useState(true);
    const [expandido, setExpandido] = useState<string | null>(null);
    const [comparandoCon, setComparandoCon] = useState<string | null>(null);

    const loadProductos = useCallback(() => {
        setLoadingProd(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const activos = data.filter((i: StockItem) => i.stockActual >= 0);
                    setProductos(activos);
                    const init: Record<string, string> = {};
                    activos.forEach((i: StockItem) => { init[i._id] = String(i.stockActual); });
                    setCantidades(init);
                    try {
                        const raw = localStorage.getItem(DRAFT_KEY);
                        if (raw) setBorrador(JSON.parse(raw) as Draft);
                    } catch { /* ignore */ }
                    setProductosLoaded(true);
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

    // Auto-guardar borrador (solo si el usuario hizo algún cambio)
    useEffect(() => {
        if (!productosLoaded || vista !== "cargar" || !isDirty) return;
        const t = setTimeout(() => {
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cantidades, notas, precios, savedAt: Date.now() })); }
            catch { /* ignore */ }
        }, 600);
        return () => clearTimeout(t);
    }, [cantidades, notas, precios, productosLoaded, vista, isDirty]);

    // Wrappers que marcan dirty solo cuando el usuario edita
    const editCantidades = (fn: (p: Record<string, string>) => Record<string, string>) => {
        setIsDirty(true); setCantidades(fn);
    };
    const editNotas = (v: string) => { setIsDirty(true); setNotas(v); };
    const editPrecios = (fn: (p: Record<string, string>) => Record<string, string>) => {
        setIsDirty(true); setPrecios(fn);
    };

    function restaurarBorrador() {
        if (!borrador) return;
        setCantidades(borrador.cantidades ?? {});
        setNotas(borrador.notas ?? "");
        setPrecios(borrador.precios ?? {});
        if (Object.values(borrador.precios ?? {}).some(v => !!v)) setMostrarPrecios(true);
        setBorrador(null);
        setIsDirty(true);
    }

    function descartarBorrador() {
        localStorage.removeItem(DRAFT_KEY);
        setBorrador(null);
        setIsDirty(false);
    }

    function cambiarVista(v: "cargar" | "historial") {
        setVista(v);
        setNavTipo(null);
        setNavSubcat(null);
    }

    function volverEnNav() {
        if (navSubcat !== null) { setNavSubcat(null); return; }
        if (navTipo !== null) { setNavTipo(null); return; }
    }

    // Totales valorización
    const totalVal = (cant: Record<string, string>, prec: Record<string, string>) =>
        productos.reduce((s, p) => s + Number(cant[p._id] ?? 0) * Number(prec[p._id] ?? 0), 0);

    async function guardar() {
        const items: ConteoItem[] = productos.map(p => ({
            stockId: p._id, nombre: p.nombre, tipo: p.tipo,
            categoria: p.categoria, unidad: p.unidad,
            cantidad: Number(cantidades[p._id] ?? 0),
            precioUnitario: precios[p._id] ? Number(precios[p._id]) : undefined,
        }));
        setSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/conteos", {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "include", body: JSON.stringify({ items, notas }),
            });
            if (res.ok) {
                localStorage.removeItem(DRAFT_KEY);
                setBorrador(null); setNotas(""); setPrecios({}); setIsDirty(false);
                loadConteos(); setVista("historial"); setNavTipo(null); setNavSubcat(null);
            }
        } finally { setSaving(false); }
    }

    function iniciarAgregar(conteo: Conteo) {
        setConteoObjetivo(conteo);
        const init: Record<string, string> = {};
        productos.forEach(p => { init[p._id] = ""; });
        setCantAgregar(init); setPreciosAgregar({});
        setMostrarPreciosAgregar(false);
        setNavTipo(null); setNavSubcat(null);
        setVista("agregar");
    }

    async function guardarAgregar() {
        if (!conteoObjetivo) return;
        const items = productos
            .filter(p => Number(cantAgregar[p._id] ?? 0) > 0)
            .map(p => ({
                stockId: p._id, nombre: p.nombre, tipo: p.tipo,
                categoria: p.categoria, unidad: p.unidad,
                cantidad: Number(cantAgregar[p._id]),
                precioUnitario: preciosAgregar[p._id] ? Number(preciosAgregar[p._id]) : undefined,
            }));
        if (!items.length) return;
        setSavingAgregar(true);
        try {
            const res = await fetch(`/api/superadmin/stock/conteos/${conteoObjetivo._id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                credentials: "include", body: JSON.stringify({ items }),
            });
            if (res.ok) {
                const idPrev = conteoObjetivo._id;
                setConteoObjetivo(null); loadConteos();
                setVista("historial"); setExpandido(idPrev);
                setNavTipo(null); setNavSubcat(null);
            }
        } finally { setSavingAgregar(false); }
    }

    async function eliminarConteo(id: string, fecha: string) {
        const fechaLabel = new Date(fecha).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
        const ok = window.confirm(`¿Seguro que querés eliminar la carga del ${fechaLabel}? Esta acción no se puede deshacer.`);
        if (!ok) return;
        await fetch(`/api/superadmin/stock/conteos/${id}`, { method: "DELETE", credentials: "include" });
        setConteos(prev => prev.filter(c => c._id !== id));
        if (expandido === id) setExpandido(null);
        if (comparandoCon === id) setComparandoCon(null);
    }

    // Agrupación por tipo → subcat
    const porTipo = (["cocina", "bebida"] as Tipo[]).map(tipo => {
        const prodsTipo = productos.filter(p => (p.tipo ?? "bebida").toLowerCase() === tipo);
        const subcats = prodsTipo.reduce((acc, p) => {
            const cat = p.categoria || "Otros";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {} as Record<string, StockItem[]>);
        return { tipo, subcats, total: prodsTipo.length };
    }).filter(t => t.total > 0);

    // ── Render formulario según nivel de navegación ──
    function renderForm(
        cant: Record<string, string>,
        setCant: (fn: (p: Record<string, string>) => Record<string, string>) => void,
        prec: Record<string, string>,
        setPrec: (fn: (p: Record<string, string>) => Record<string, string>) => void,
        mostrarPrec: boolean,
        setMostrarPrec: (v: boolean) => void,
        onGuardar: () => void,
        guardando: boolean,
        labelGuardar: string,
    ) {
        // Nivel 0: tiles de tipo
        if (navTipo === null) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {porTipo.map(({ tipo }) => {
                            const m = TIPO_META[tipo];
                            // contar productos con valor distinto al default en este tipo
                            const filled = productos.filter(p => p.tipo === tipo && Number(cant[p._id] ?? 0) > 0).length;
                            return (
                                <button key={tipo} onClick={() => setNavTipo(tipo)}
                                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 ${m.border} ${m.bg} py-10 px-4 shadow-sm active:scale-[0.97] transition-transform`}>
                                    <span className="text-5xl">{m.emoji}</span>
                                    <p className={`text-xl font-black ${m.color}`}>{m.label}</p>
                                    {filled > 0 && (
                                        <span className="absolute top-2 right-2 text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                                            {filled} cargados
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Valorizar toggle + total */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMostrarPrec(!mostrarPrec)}
                            className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border transition ${mostrarPrec ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                            <DollarSign size={15} /> Valorizar
                        </button>
                        {mostrarPrec && totalVal(cant, prec) > 0 && (
                            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                                <p className="text-xs font-bold text-emerald-700">Total</p>
                                <p className="text-sm font-black text-emerald-700">{formatMoney(totalVal(cant, prec))}</p>
                            </div>
                        )}
                    </div>

                    <button onClick={onGuardar} disabled={guardando || loadingProd}
                        className="w-full py-3.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                        {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {labelGuardar}</>}
                    </button>
                </div>
            );
        }

        const tipoData = porTipo.find(t => t.tipo === navTipo);
        const m = TIPO_META[navTipo];

        // Nivel 1: tiles de subcategoría
        if (navSubcat === null) {
            const subcatEntries = Object.entries(tipoData?.subcats ?? {}).sort(([a], [b]) => a.localeCompare(b));
            return (
                <div className="grid grid-cols-2 gap-3">
                    {subcatEntries.map(([cat, prods]) => {
                        const filled = prods.filter(p => Number(cant[p._id] ?? 0) > 0).length;
                        return (
                            <button key={cat} onClick={() => setNavSubcat(cat)}
                                className={`relative flex flex-col items-start gap-2 rounded-2xl border-2 ${m.border} bg-white px-4 py-5 shadow-sm active:scale-[0.97] transition-transform text-left`}>
                                <p className={`text-base font-black ${m.color}`}>{cat}</p>
                                <p className="text-xs text-gray-400">{prods.length} producto{prods.length !== 1 ? "s" : ""}</p>
                                {filled > 0 && (
                                    <span className="absolute top-2 right-2 text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                                        {filled}✓
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            );
        }

        // Nivel 2: productos de la subcategoría
        const prods = tipoData?.subcats[navSubcat] ?? [];
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{prods.length} producto{prods.length !== 1 ? "s" : ""}</p>
                    <button
                        onClick={() => setMostrarPrec(!mostrarPrec)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${mostrarPrec ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                        <DollarSign size={13} /> Valorizar
                    </button>
                </div>
                <div className="space-y-2">
                    {prods.map(prod => (
                        <div key={prod._id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <p className="flex-1 text-sm font-semibold text-gray-800">{prod.nombre}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => setCant(p => ({ ...p, [prod._id]: String(Math.max(0, Number(p[prod._id] ?? 0) - 1)) }))}
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg transition">−</button>
                                    <input
                                        type="number" min="0" step="any" inputMode="numeric"
                                        value={cant[prod._id] ?? ""}
                                        onChange={e => setCant(p => ({ ...p, [prod._id]: e.target.value }))}
                                        className="w-16 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    />
                                    <button onClick={() => setCant(p => ({ ...p, [prod._id]: String(Number(p[prod._id] ?? 0) + 1) }))}
                                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg transition">+</button>
                                    <span className="text-xs text-gray-400 w-12">{prod.unidad}</span>
                                </div>
                            </div>
                            {mostrarPrec && (
                                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-2">
                                    <span className="text-xs text-gray-400">$ por {prod.unidad}</span>
                                    <input
                                        type="number" min="0" step="any" inputMode="decimal"
                                        value={prec[prod._id] ?? ""}
                                        onChange={e => setPrec(p => ({ ...p, [prod._id]: e.target.value }))}
                                        placeholder="Precio unit."
                                        className="flex-1 border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50 text-emerald-800"
                                    />
                                    {prec[prod._id] && Number(cant[prod._id] ?? 0) > 0 && (
                                        <span className="text-xs font-bold text-emerald-700 shrink-0">
                                            = {formatMoney(Number(prec[prod._id]) * Number(cant[prod._id]))}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Header de navegación del formulario ──
    function navLabel() {
        if (navSubcat) return navSubcat;
        if (navTipo) return TIPO_META[navTipo].label;
        return vista === "agregar" ? "Agregar compra" : "Cargar Stock";
    }

    function navSubtitle() {
        if (vista === "agregar" && conteoObjetivo && !navTipo)
            return `Sumando al stock del ${formatFechaCorta(conteoObjetivo.createdAt)}`;
        if (navSubcat && navTipo) return `${TIPO_META[navTipo].emoji} ${TIPO_META[navTipo].label}`;
        return null;
    }

    const enNav = navTipo !== null;

    return (
        <div className="min-h-screen pb-24">
            <div className="px-4 max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 py-5">
                    <button
                        onClick={() => {
                            if (enNav) { volverEnNav(); return; }
                            if (vista === "agregar") { setVista("historial"); return; }
                            router.push("/admin/stock");
                        }}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-extrabold text-black truncate">{navLabel()}</h1>
                        {navSubtitle() && <p className="text-xs text-gray-400 mt-0.5">{navSubtitle()}</p>}
                    </div>
                </div>

                {/* Tabs (solo en nivel 0) */}
                {vista !== "agregar" && !enNav && (
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => cambiarVista("cargar")}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${vista === "cargar" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            <Save size={15} /> Nueva carga
                        </button>
                        <button onClick={() => cambiarVista("historial")}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${vista === "historial" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                            <ClipboardList size={15} /> Historial {conteos.length > 0 && <span className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{conteos.length}</span>}
                        </button>
                    </div>
                )}

                {/* ── VISTA CARGAR ── */}
                {vista === "cargar" && (
                    <>
                        {/* Banner borrador (solo nivel 0) */}
                        {!enNav && borrador && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                                <RotateCcw size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-amber-800">Hay un borrador guardado</p>
                                    <p className="text-xs text-amber-600 mt-0.5">Guardado el {formatHora(borrador.savedAt)}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={restaurarBorrador}
                                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition">
                                            Restaurar borrador
                                        </button>
                                        <button onClick={descartarBorrador}
                                            className="flex-1 py-1.5 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg transition hover:bg-amber-50">
                                            Descartar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notas (solo nivel 0) */}
                        {!enNav && (
                            <div className="mb-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase">Notas (opcional)</label>
                                <textarea value={notas} onChange={e => editNotas(e.target.value)} rows={2}
                                    placeholder="Ej: semana del 2 al 8 de septiembre, post-evento..."
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
                            </div>
                        )}

                        {loadingProd ? (
                            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                        ) : renderForm(cantidades, editCantidades, precios, editPrecios, mostrarPrecios, setMostrarPrecios, guardar, saving, "Guardar carga de esta semana")}
                    </>
                )}

                {/* ── VISTA AGREGAR ── */}
                {vista === "agregar" && (
                    loadingProd
                        ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                        : renderForm(cantAgregar, setCantAgregar, preciosAgregar, setPreciosAgregar, mostrarPreciosAgregar, setMostrarPreciosAgregar, guardarAgregar, savingAgregar, "Sumar al stock existente")
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
                                    const conteoComp = conteos.find(c => c._id === comparandoCon);
                                    const gruposConteo = conteo.items.reduce((acc, it) => {
                                        const key = `${it.tipo}-${it.categoria}`;
                                        if (!acc[key]) acc[key] = { tipo: it.tipo, categoria: it.categoria, items: [] };
                                        acc[key].items.push(it);
                                        return acc;
                                    }, {} as Record<string, { tipo: string; categoria: string; items: ConteoItem[] }>);
                                    const tienePrecios = conteo.items.some(i => (i.precioUnitario ?? 0) > 0);

                                    return (
                                        <div key={conteo._id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <button onClick={() => { setExpandido(abierto ? null : conteo._id); setComparandoCon(null); }} className="flex-1 text-left">
                                                    <p className="text-sm font-black text-gray-900 capitalize">{formatFecha(conteo.createdAt)}</p>
                                                    {conteo.notas && <p className="text-xs text-gray-400 mt-0.5 italic">{conteo.notas}</p>}
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <p className="text-xs text-gray-400">{conteo.items.length} productos</p>
                                                        {(conteo.totalValorizacion ?? 0) > 0 && (
                                                            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                                {formatMoney(conteo.totalValorizacion!)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => iniciarAgregar(conteo)} title="Agregar compra"
                                                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition">
                                                        <PlusCircle size={15} className="text-blue-600" />
                                                    </button>
                                                    <button onClick={() => { setExpandido(abierto ? null : conteo._id); setComparandoCon(null); }}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition">
                                                        {abierto ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                                                    </button>
                                                    <button onClick={() => eliminarConteo(conteo._id, conteo.createdAt)}
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
                                                                    const subtotal = (it.precioUnitario ?? 0) > 0 ? it.cantidad * (it.precioUnitario ?? 0) : null;
                                                                    return (
                                                                        <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-50 gap-2">
                                                                            <p className="text-sm text-gray-700 flex-1">{it.nombre}</p>
                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                {compItem !== undefined && <span className="text-xs text-gray-400">{formatNum(compItem.cantidad)}</span>}
                                                                                <span className="text-sm font-bold text-gray-900">{formatNum(it.cantidad)} <span className="text-xs font-normal text-gray-400">{it.unidad}</span></span>
                                                                                {diff !== null && (
                                                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                                                                        {diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                                                                                    </span>
                                                                                )}
                                                                                {subtotal !== null && tienePrecios && (
                                                                                    <span className="text-xs text-emerald-600 font-semibold">{formatMoney(subtotal)}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(conteo.totalValorizacion ?? 0) > 0 && (
                                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                            <p className="text-sm font-black text-gray-700">Total valorización</p>
                                                            <p className="text-base font-black text-emerald-700">{formatMoney(conteo.totalValorizacion!)}</p>
                                                        </div>
                                                    )}
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
