"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";
import {
    Plus, TrendingUp, TrendingDown, AlertTriangle,
    X, History, Edit2, Trash2, Loader2, ChevronLeft, ClipboardList, Settings, Package,
} from "lucide-react";

type Tipo = "cocina" | "bebida";

type StockSubcategoria = { _id: string; tipo: Tipo; nombre: string };

type StockItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    tipo: Tipo;
    categoria: string;
    unidad: string;
    stockActual: number;
    stockMinimo: number;
    activo: boolean;
    unidadesPorCaja?: number;
};

type StockMovimiento = {
    _id: string;
    tipo: "entrada" | "salida";
    cantidad: number;
    motivo: string;
    precioUnitario?: number;
    notas?: string;
    createdAt: string;
};

const TIPO_META: Record<Tipo, { label: string; emoji: string; color: string; bg: string; border: string; pill: string }> = {
    cocina: { label: "Cocina", emoji: "🍳", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", pill: "bg-orange-600" },
    bebida: { label: "Bebida", emoji: "🍺", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", pill: "bg-blue-600" },
};

const EMPTY_ITEM = (tipo: Tipo): Omit<StockItem, "_id"> => ({
    nombre: "", descripcion: "", tipo, categoria: "",
    unidad: "unidades", stockActual: 0, stockMinimo: 0, activo: true, unidadesPorCaja: undefined,
});

const EMPTY_MOV = { tipo: "entrada" as "entrada" | "salida", cantidad: "", motivo: "", precioUnitario: "", notas: "", modo: "suelto" as "suelto" | "caja", cantidadCajas: "" };

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export default function StockPage() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [subcats, setSubcats] = useState<StockSubcategoria[]>([]);

    const router = useRouter();

    const [vista, setVista] = useState<Tipo | null>(null);
    const [subcat, setSubcat] = useState<string>("Todos");

    const [editModal, setEditModal] = useState<{ open: boolean; item: Partial<StockItem> & { _id?: string } }>({ open: false, item: EMPTY_ITEM("cocina") });
    const [movModal, setMovModal] = useState<{ open: boolean; item: StockItem | null }>({ open: false, item: null });
    const [histModal, setHistModal] = useState<{ open: boolean; item: StockItem | null; movs: StockMovimiento[] }>({ open: false, item: null, movs: [] });
    const [subcatModal, setSubcatModal] = useState(false);
    const [histLoading, setHistLoading] = useState(false);

    const [movForm, setMovForm] = useState(EMPTY_MOV);
    const [movSaving, setMovSaving] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [search, setSearch] = useState("");

    const [newSubcat, setNewSubcat] = useState({ tipo: "cocina" as Tipo, nombre: "" });
    const [subcatSaving, setSubcatSaving] = useState(false);

    const loadItems = useCallback(() => {
        setLoading(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setItems(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const loadSubcats = useCallback(() => {
        fetch("/api/superadmin/stock/subcategorias", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setSubcats(data); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadItems(); loadSubcats(); }, [loadItems, loadSubcats]);

    const getSubcats = (tipo: Tipo) => subcats.filter(s => s.tipo === tipo).map(s => s.nombre);

    function abrirVista(t: Tipo) { setVista(t); setSubcat("Todos"); setSearch(""); }
    function volver() { setVista(null); setSubcat("Todos"); setSearch(""); }

    async function saveItem() {
        const { _id, ...body } = editModal.item as any;
        if (!body.nombre?.trim()) return;
        setEditSaving(true);
        try {
            const url = _id ? `/api/superadmin/stock/${_id}` : "/api/superadmin/stock";
            const method = _id ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
            if (res.ok) { setEditModal({ open: false, item: EMPTY_ITEM(vista ?? "cocina") }); loadItems(); }
        } finally { setEditSaving(false); }
    }

    async function deleteItem(id: string, nombre: string) {
        const r = await swalBase.fire({ title: `¿Eliminar "${nombre}"?`, icon: "warning", showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" });
        if (!r.isConfirmed) return;
        await fetch(`/api/superadmin/stock/${id}`, { method: "DELETE", credentials: "include" });
        loadItems();
    }

    async function registrarMovimiento() {
        if (!movModal.item) return;
        const cantFinal = Number(movForm.cantidad);
        if (!cantFinal || !movForm.motivo) return;
        setMovSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/movimientos", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    stockId: movModal.item._id, tipo: movForm.tipo,
                    cantidad: cantFinal, motivo: movForm.motivo,
                    precioUnitario: movForm.precioUnitario ? Number(movForm.precioUnitario) : undefined,
                    notas: movForm.notas || undefined,
                }),
            });
            if (res.ok) {
                setMovModal({ open: false, item: null });
                setMovForm(EMPTY_MOV);
                loadItems();
            }
        } finally { setMovSaving(false); }
    }

    async function openHistorial(item: StockItem) {
        setHistModal({ open: true, item, movs: [] });
        setHistLoading(true);
        try {
            const res = await fetch(`/api/superadmin/stock/${item._id}`, { credentials: "include" });
            const data = await res.json();
            setHistModal(prev => ({ ...prev, movs: data.movimientos || [] }));
        } finally { setHistLoading(false); }
    }

    async function crearSubcat() {
        if (!newSubcat.nombre.trim()) return;
        setSubcatSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/subcategorias", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ tipo: newSubcat.tipo, nombre: newSubcat.nombre.trim() }),
            });
            if (res.ok) { setNewSubcat(p => ({ ...p, nombre: "" })); loadSubcats(); }
        } finally { setSubcatSaving(false); }
    }

    async function eliminarSubcat(id: string) {
        await fetch("/api/superadmin/stock/subcategorias", {
            method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ id }),
        });
        loadSubcats();
    }

    const itemsVista = vista ? items.filter(i => (i.tipo ?? "cocina") === vista) : [];

    const itemsFiltrados = itemsVista.filter(i => {
        const matchSub = subcat === "Todos" || i.categoria === subcat;
        const matchSearch = !search || i.nombre.toLowerCase().includes(search.toLowerCase());
        return matchSub && matchSearch;
    });

    const bySubcat = itemsFiltrados.reduce((acc, item) => {
        const key = item.categoria || "Otros";
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    const subcatsConItems = Array.from(new Set(itemsVista.map(i => i.categoria || "Otros")));

    const openMov = (item: StockItem) => {
        setMovModal({ open: true, item });
        setMovForm(EMPTY_MOV);
    };

    // ── PANTALLA PRINCIPAL ──
    if (!vista) {
        return (
            <div className="min-h-screen pb-20 px-4 max-w-3xl mx-auto">
                <div className="py-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black">Stock</h1>
                        <p className="text-sm text-gray-400 mt-1">Seleccioná una sección para gestionar</p>
                    </div>
                    <button
                        onClick={() => setSubcatModal(true)}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-xl px-3 py-2 transition"
                    >
                        <Settings size={14} /> Subcategorías
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {(["cocina", "bebida"] as Tipo[]).map(t => {
                        const m = TIPO_META[t];
                        const total = items.filter(i => (i.tipo ?? "cocina") === t).length;
                        return (
                            <button key={t} onClick={() => abrirVista(t)}
                                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 ${m.border} ${m.bg} py-10 px-4 shadow-sm active:scale-[0.97] transition-transform`}>
                                <span className="text-5xl">{m.emoji}</span>
                                <div className="text-center">
                                    <p className={`text-xl font-black ${m.color}`}>{m.label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{total} producto{total !== 1 ? "s" : ""}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => router.push("/admin/stock/cargar")}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl font-bold text-sm transition"
                >
                    <ClipboardList size={17} /> Cargar Stock Semanal
                </button>

                {/* ── MODAL SUBCATEGORÍAS ── */}
                {subcatModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                                <h2 className="font-black text-gray-900 flex-1">Gestionar Subcategorías</h2>
                                <button onClick={() => setSubcatModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                            </div>
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                                {/* Agregar nueva */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Agregar subcategoría</p>
                                    <div className="flex gap-2 mb-2">
                                        {(["cocina", "bebida"] as Tipo[]).map(t => (
                                            <button key={t} onClick={() => setNewSubcat(p => ({ ...p, tipo: t }))}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${newSubcat.tipo === t ? (t === "cocina" ? "bg-orange-600 text-white border-orange-600" : "bg-blue-600 text-white border-blue-600") : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                                {TIPO_META[t].emoji} {TIPO_META[t].label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={newSubcat.nombre}
                                            onChange={e => setNewSubcat(p => ({ ...p, nombre: e.target.value }))}
                                            onKeyDown={e => e.key === "Enter" && crearSubcat()}
                                            placeholder="Nombre de la subcategoría"
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                        <button onClick={crearSubcat} disabled={subcatSaving || !newSubcat.nombre.trim()}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center">
                                            {subcatSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Lista por tipo */}
                                {(["cocina", "bebida"] as Tipo[]).map(t => {
                                    const lista = subcats.filter(s => s.tipo === t);
                                    return (
                                        <div key={t}>
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">{TIPO_META[t].emoji} {TIPO_META[t].label}</p>
                                            {lista.length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">Sin subcategorías</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {lista.map(s => (
                                                        <div key={s._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                            <span className="text-sm text-gray-700">{s.nombre}</span>
                                                            <button onClick={() => eliminarSubcat(s._id)} className="text-red-400 hover:text-red-600 transition p-1">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── VISTA DE CATEGORÍA ──
    const meta = TIPO_META[vista];
    const subcatsVista = getSubcats(vista);

    return (
        <div className="min-h-screen pb-20">
            <div className="px-4 max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 py-5">
                    <button onClick={volver} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-extrabold text-black flex items-center gap-2">
                            {meta.emoji} {meta.label}
                        </h1>
                    </div>
                    <button onClick={() => setEditModal({ open: true, item: { ...EMPTY_ITEM(vista) } })}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                        <Plus size={15} /> Nuevo
                    </button>
                </div>

                {/* Tabs de subcategorías */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                    {["Todos", ...subcatsVista].map(s => {
                        const tieneItems = s === "Todos" || subcatsConItems.includes(s);
                        return (
                            <button key={s} onClick={() => setSubcat(s)}
                                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                    subcat === s
                                        ? `${meta.pill} text-white`
                                        : tieneItems
                                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            : "bg-gray-50 text-gray-300"
                                }`}>
                                {s}
                            </button>
                        );
                    })}
                </div>

                {/* Buscador */}
                <input
                    type="text" placeholder="Buscar producto..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                />

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : itemsFiltrados.length === 0 ? (
                    <p className="text-center text-gray-400 py-16 text-sm">Sin productos en esta sección.</p>
                ) : (
                    subcat === "Todos"
                        ? Object.entries(bySubcat).map(([cat, catItems]) => (
                            <div key={cat} className="mb-5">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{cat}</p>
                                <ItemList items={catItems} meta={meta} onMov={openMov} onHist={openHistorial} onEdit={(item) => setEditModal({ open: true, item: { ...item } })} onDelete={deleteItem} />
                            </div>
                        ))
                        : <ItemList items={itemsFiltrados} meta={meta} onMov={openMov} onHist={openHistorial} onEdit={(item) => setEditModal({ open: true, item: { ...item } })} onDelete={deleteItem} />
                )}
            </div>

            {/* ── MODAL NUEVO / EDITAR ── */}
            {editModal.open && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">{editModal.item._id ? "Editar producto" : "Nuevo producto"}</h2>
                            <button onClick={() => setEditModal({ open: false, item: EMPTY_ITEM(vista) })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                            {/* Tipo */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Sección</label>
                                <div className="flex gap-2 mt-1">
                                    {(["cocina", "bebida"] as Tipo[]).map(t => (
                                        <button key={t}
                                            onClick={() => setEditModal(p => ({ ...p, item: { ...p.item, tipo: t, categoria: getSubcats(t)[0] ?? "" } }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${editModal.item.tipo === t ? (t === "cocina" ? "bg-orange-600 text-white border-orange-600" : "bg-blue-600 text-white border-blue-600") : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {TIPO_META[t].emoji} {TIPO_META[t].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Nombre */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Nombre *</label>
                                <input value={editModal.item.nombre || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, nombre: e.target.value } }))}
                                    placeholder="Ej: Cerveza Quilmes" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {/* Subcategoría */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Subcategoría</label>
                                {getSubcats(editModal.item.tipo ?? "cocina").length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {getSubcats(editModal.item.tipo ?? "cocina").map(s => (
                                            <button key={s} onClick={() => setEditModal(p => ({ ...p, item: { ...p.item, categoria: s } }))}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${editModal.item.categoria === s ? (editModal.item.tipo === "bebida" ? "bg-blue-600 text-white border-blue-600" : "bg-orange-600 text-white border-orange-600") : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <input value={editModal.item.categoria || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, categoria: e.target.value } }))}
                                    placeholder="O escribí una personalizada" className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {/* Unidad */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Unidad</label>
                                <input value={editModal.item.unidad || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, unidad: e.target.value } }))}
                                    placeholder="kg, lts, unidades, cajas…" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {/* Unidades por caja */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Unidades por caja</label>
                                <input type="number" min="1" step="1"
                                    value={editModal.item.unidadesPorCaja ?? ""}
                                    onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, unidadesPorCaja: e.target.value ? Number(e.target.value) : undefined } }))}
                                    placeholder="Ej: 6 — opcional, habilita carga por cajas"
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {/* Stock */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Stock actual</label>
                                    <input type="number" min="0" value={editModal.item.stockActual ?? ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, stockActual: Number(e.target.value) } }))}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Stock mínimo</label>
                                    <input type="number" min="0" value={editModal.item.stockMinimo ?? ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, stockMinimo: Number(e.target.value) } }))}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                            </div>
                            {/* Descripción */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
                                <input value={editModal.item.descripcion || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, descripcion: e.target.value } }))}
                                    placeholder="Opcional" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {editModal.item._id && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="activo" checked={editModal.item.activo ?? true}
                                        onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, activo: e.target.checked } }))} className="w-4 h-4 accent-red-600" />
                                    <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setEditModal({ open: false, item: EMPTY_ITEM(vista) })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={saveItem} disabled={editSaving || !editModal.item.nombre?.trim()}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {editSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL MOVIMIENTO ── */}
            {movModal.open && movModal.item && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Movimiento · {movModal.item.nombre}</h2>
                            <button onClick={() => setMovModal({ open: false, item: null })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {/* Entrada / Salida */}
                            <div className="flex gap-2">
                                <button onClick={() => setMovForm(p => ({ ...p, tipo: "entrada" }))}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition border ${movForm.tipo === "entrada" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                    <TrendingUp size={15} /> Entrada
                                </button>
                                <button onClick={() => setMovForm(p => ({ ...p, tipo: "salida" }))}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition border ${movForm.tipo === "salida" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                    <TrendingDown size={15} /> Salida
                                </button>
                            </div>

                            {/* Modo carga — solo si el ítem tiene unidadesPorCaja */}
                            {!!movModal.item.unidadesPorCaja && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Modo de carga</label>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => setMovForm(p => ({ ...p, modo: "suelto", cantidadCajas: "", cantidad: "" }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${movForm.modo === "suelto" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            Suelto
                                        </button>
                                        <button onClick={() => setMovForm(p => ({ ...p, modo: "caja", cantidad: "", cantidadCajas: "" }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-1.5 ${movForm.modo === "caja" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            <Package size={14} /> Por caja
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Campos de cantidad según modo */}
                            {movForm.modo === "caja" && movModal.item.unidadesPorCaja ? (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Cantidad de cajas *</label>
                                    <input type="number" min="1" step="1" value={movForm.cantidadCajas}
                                        onChange={e => {
                                            const cajas = e.target.value;
                                            const unidades = cajas && movModal.item?.unidadesPorCaja
                                                ? String(Number(cajas) * movModal.item.unidadesPorCaja) : "";
                                            setMovForm(p => ({ ...p, cantidadCajas: cajas, cantidad: unidades }));
                                        }}
                                        placeholder="Ej: 2"
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    {movForm.cantidadCajas && movModal.item.unidadesPorCaja && (
                                        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-2">
                                            {movForm.cantidadCajas} caja{Number(movForm.cantidadCajas) !== 1 ? "s" : ""} × {movModal.item.unidadesPorCaja} = <strong>{movForm.cantidad} {movModal.item.unidad}</strong>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Cantidad *</label>
                                        <input type="number" min="0.01" step="any" value={movForm.cantidad}
                                            onChange={e => setMovForm(p => ({ ...p, cantidad: e.target.value }))}
                                            placeholder={`en ${movModal.item.unidad}`}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Precio unit.</label>
                                        <input type="number" min="0" value={movForm.precioUnitario}
                                            onChange={e => setMovForm(p => ({ ...p, precioUnitario: e.target.value }))}
                                            placeholder="$ opcional"
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    </div>
                                </div>
                            )}

                            {/* Motivo */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Motivo *</label>
                                <input value={movForm.motivo} onChange={e => setMovForm(p => ({ ...p, motivo: e.target.value }))}
                                    placeholder="Ej: compra, ajuste, merma…"
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Notas</label>
                                <input value={movForm.notas} onChange={e => setMovForm(p => ({ ...p, notas: e.target.value }))}
                                    placeholder="Opcional"
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            <p className="text-xs text-gray-400">
                                Stock actual: <strong>{formatNum(movModal.item.stockActual)}</strong> {movModal.item.unidad}
                                {movForm.cantidad && (
                                    <> → <strong className={movForm.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}>
                                        {formatNum(movForm.tipo === "entrada"
                                            ? movModal.item.stockActual + Number(movForm.cantidad)
                                            : Math.max(0, movModal.item.stockActual - Number(movForm.cantidad)))}
                                    </strong> {movModal.item.unidad}</>
                                )}
                            </p>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setMovModal({ open: false, item: null })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={registrarMovimiento} disabled={movSaving || !movForm.cantidad || !movForm.motivo}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {movSaving ? "Guardando..." : "Registrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL HISTORIAL ── */}
            {histModal.open && histModal.item && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1">Historial · {histModal.item.nombre}</h2>
                            <button onClick={() => setHistModal({ open: false, item: null, movs: [] })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-5 py-4">
                            {histLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                            ) : histModal.movs.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>
                            ) : (
                                <div className="space-y-2">
                                    {histModal.movs.map(m => (
                                        <div key={m._id} className="flex items-start gap-3 py-2 border-b border-gray-50">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.tipo === "entrada" ? "bg-emerald-100" : "bg-red-100"}`}>
                                                {m.tipo === "entrada" ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline gap-2">
                                                    <p className="text-sm font-semibold text-gray-900">{m.motivo}</p>
                                                    <p className={`text-sm font-bold shrink-0 ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                                                        {m.tipo === "entrada" ? "+" : "-"}{formatNum(m.cantidad)} {histModal.item!.unidad}
                                                    </p>
                                                </div>
                                                {m.precioUnitario && <p className="text-xs text-gray-400">$ {formatNum(m.precioUnitario)} por {histModal.item!.unidad}</p>}
                                                {m.notas && <p className="text-xs text-gray-400 italic">{m.notas}</p>}
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(m.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Componente auxiliar lista de ítems ──
function ItemList({ items, meta, onMov, onHist, onEdit, onDelete }: {
    items: StockItem[];
    meta: typeof TIPO_META[Tipo];
    onMov: (i: StockItem) => void;
    onHist: (i: StockItem) => void;
    onEdit: (i: StockItem) => void;
    onDelete: (id: string, nombre: string) => void;
}) {
    return (
        <div className="space-y-2">
            {items.map(item => {
                const isLow = item.activo && item.stockMinimo > 0 && item.stockActual <= item.stockMinimo;
                return (
                    <div key={item._id}
                        className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${isLow ? "border-yellow-300" : "border-gray-100"} ${!item.activo ? "opacity-50" : ""}`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm">{item.nombre}</p>
                                    {isLow && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={10} />bajo mínimo</span>}
                                    {!item.activo && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">inactivo</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Stock: <span className={`font-bold ${isLow ? "text-yellow-600" : "text-gray-700"}`}>{formatNum(item.stockActual)}</span> {item.unidad}
                                    {item.stockMinimo > 0 && <span className="text-gray-400"> · mín {formatNum(item.stockMinimo)}</span>}
                                    {item.unidadesPorCaja && <span className="text-gray-400"> · {item.unidadesPorCaja} un/caja</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => onMov(item)} className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition" title="Movimiento">
                                    <TrendingUp size={14} className="text-emerald-600" />
                                </button>
                                <button onClick={() => onHist(item)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition" title="Historial">
                                    <History size={14} className="text-gray-500" />
                                </button>
                                <button onClick={() => onEdit(item)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition" title="Editar">
                                    <Edit2 size={14} className="text-gray-500" />
                                </button>
                                <button onClick={() => onDelete(item._id, item.nombre)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition" title="Eliminar">
                                    <Trash2 size={14} className="text-red-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
