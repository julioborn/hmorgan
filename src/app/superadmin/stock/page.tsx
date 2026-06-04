"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Plus, Package, TrendingUp, TrendingDown, AlertTriangle,
    X, History, Edit2, Trash2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

type StockItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    categoria: string;
    unidad: string;
    stockActual: number;
    stockMinimo: number;
    activo: boolean;
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

const EMPTY_ITEM: Omit<StockItem, "_id"> = {
    nombre: "", descripcion: "", categoria: "General",
    unidad: "unidades", stockActual: 0, stockMinimo: 0, activo: true,
};

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export default function StockPage() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    // modals
    const [editModal, setEditModal] = useState<{ open: boolean; item: Partial<StockItem> & { _id?: string } }>({ open: false, item: EMPTY_ITEM });
    const [movModal, setMovModal] = useState<{ open: boolean; item: StockItem | null }>({ open: false, item: null });
    const [histModal, setHistModal] = useState<{ open: boolean; item: StockItem | null; movs: StockMovimiento[] }>({ open: false, item: null, movs: [] });
    const [histLoading, setHistLoading] = useState(false);

    // movement form
    const [movForm, setMovForm] = useState({ tipo: "entrada" as "entrada" | "salida", cantidad: "", motivo: "", precioUnitario: "", notas: "" });
    const [movSaving, setMovSaving] = useState(false);

    // edit form saving
    const [editSaving, setEditSaving] = useState(false);

    // filter
    const [search, setSearch] = useState("");

    const loadItems = useCallback(() => {
        setLoading(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setItems(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadItems(); }, [loadItems]);

    async function saveItem() {
        const { _id, ...body } = editModal.item as any;
        if (!body.nombre?.trim()) return;
        setEditSaving(true);
        try {
            const url = _id ? `/api/superadmin/stock/${_id}` : "/api/superadmin/stock";
            const method = _id ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
            if (res.ok) {
                setEditModal({ open: false, item: EMPTY_ITEM });
                loadItems();
            }
        } finally {
            setEditSaving(false);
        }
    }

    async function deleteItem(id: string, nombre: string) {
        if (!confirm(`¿Eliminar "${nombre}"?`)) return;
        await fetch(`/api/superadmin/stock/${id}`, { method: "DELETE", credentials: "include" });
        loadItems();
    }

    async function toggleActivo(item: StockItem) {
        await fetch(`/api/superadmin/stock/${item._id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify({ activo: !item.activo }),
        });
        loadItems();
    }

    async function registrarMovimiento() {
        if (!movModal.item) return;
        if (!movForm.cantidad || !movForm.motivo) return;
        setMovSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/movimientos", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    stockId: movModal.item._id,
                    tipo: movForm.tipo,
                    cantidad: Number(movForm.cantidad),
                    motivo: movForm.motivo,
                    precioUnitario: movForm.precioUnitario ? Number(movForm.precioUnitario) : undefined,
                    notas: movForm.notas || undefined,
                }),
            });
            if (res.ok) {
                setMovModal({ open: false, item: null });
                setMovForm({ tipo: "entrada", cantidad: "", motivo: "", precioUnitario: "", notas: "" });
                loadItems();
            }
        } finally {
            setMovSaving(false);
        }
    }

    async function openHistorial(item: StockItem) {
        setHistModal({ open: true, item, movs: [] });
        setHistLoading(true);
        try {
            const res = await fetch(`/api/superadmin/stock/${item._id}`, { credentials: "include" });
            const data = await res.json();
            setHistModal(prev => ({ ...prev, movs: data.movimientos || [] }));
        } finally {
            setHistLoading(false);
        }
    }

    const filtered = items.filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()) || i.categoria.toLowerCase().includes(search.toLowerCase()));

    // group by category
    const byCategory = filtered.reduce((acc, item) => {
        (acc[item.categoria] = acc[item.categoria] || []).push(item);
        return acc;
    }, {} as Record<string, StockItem[]>);

    const alertas = items.filter(i => i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <Package size={18} className="text-gray-500 shrink-0" />
                <h1 className="font-black text-gray-900 flex-1">Stock</h1>
                <button onClick={() => setEditModal({ open: true, item: { ...EMPTY_ITEM } })}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">
                    <Plus size={15} /> Nuevo
                </button>
            </div>

            <div className="px-4 pt-4 max-w-3xl mx-auto">
                {/* Alertas */}
                {alertas.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">Stock bajo mínimo</p>
                            <p className="text-xs text-yellow-700 mt-0.5">{alertas.map(i => `${i.nombre} (${i.stockActual} ${i.unidad})`).join(", ")}</p>
                        </div>
                    </div>
                )}

                {/* Search */}
                <input
                    type="text" placeholder="Buscar producto o categoría..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                />

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 py-16 text-sm">Sin productos. Agregá uno con "+ Nuevo".</p>
                ) : (
                    Object.entries(byCategory).map(([cat, catItems]) => (
                        <div key={cat} className="mb-5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{cat}</p>
                            <div className="space-y-2">
                                {catItems.map(item => {
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
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button onClick={() => { setMovModal({ open: true, item }); setMovForm({ tipo: "entrada", cantidad: "", motivo: "", precioUnitario: "", notas: "" }); }}
                                                        className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition" title="Movimiento">
                                                        <TrendingUp size={14} className="text-emerald-600" />
                                                    </button>
                                                    <button onClick={() => openHistorial(item)}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition" title="Historial">
                                                        <History size={14} className="text-gray-500" />
                                                    </button>
                                                    <button onClick={() => setEditModal({ open: true, item: { ...item } })}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition" title="Editar">
                                                        <Edit2 size={14} className="text-gray-500" />
                                                    </button>
                                                    <button onClick={() => deleteItem(item._id, item.nombre)}
                                                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition" title="Eliminar">
                                                        <Trash2 size={14} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">{editModal.item._id ? "Editar producto" : "Nuevo producto"}</h2>
                            <button onClick={() => setEditModal({ open: false, item: EMPTY_ITEM })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Nombre *</label>
                                <input value={editModal.item.nombre || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, nombre: e.target.value } }))}
                                    placeholder="Ej: Harina 000" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Categoría</label>
                                    <input value={editModal.item.categoria || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, categoria: e.target.value } }))}
                                        placeholder="General" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Unidad</label>
                                    <input value={editModal.item.unidad || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, unidad: e.target.value } }))}
                                        placeholder="kg, lts, unidades" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                            </div>
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
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Descripción</label>
                                <input value={editModal.item.descripcion || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, descripcion: e.target.value } }))}
                                    placeholder="Opcional" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {editModal.item._id && (
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="activo" checked={editModal.item.activo ?? true}
                                        onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, activo: e.target.checked } }))}
                                        className="w-4 h-4 accent-red-600" />
                                    <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setEditModal({ open: false, item: EMPTY_ITEM })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                            <button onClick={saveItem} disabled={editSaving || !editModal.item.nombre?.trim()}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {editSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Movement Modal */}
            {movModal.open && movModal.item && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Movimiento · {movModal.item.nombre}</h2>
                            <button onClick={() => setMovModal({ open: false, item: null })} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
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
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Motivo *</label>
                                <input value={movForm.motivo} onChange={e => setMovForm(p => ({ ...p, motivo: e.target.value }))}
                                    placeholder="Ej: compra, venta, ajuste..."
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

            {/* Historial Modal */}
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
                                                {m.tipo === "entrada"
                                                    ? <TrendingUp size={13} className="text-emerald-600" />
                                                    : <TrendingDown size={13} className="text-red-600" />
                                                }
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
