"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";
import {
    Plus, TrendingUp, TrendingDown, AlertTriangle,
    X, History, Edit2, Trash2, Loader2, ChevronLeft, ClipboardList, Settings, DollarSign, Package, FileText,
} from "lucide-react";

type Tipo = "cocina" | "bebida";
type StockSubcategoria = { _id: string; tipo: Tipo; nombre: string };
type Presentacion = { nombre: string; unidades: number };
type StockItem = {
    _id: string; nombre: string; descripcion?: string; tipo: Tipo;
    categoria: string; unidad: string; stockActual: number; stockMinimo: number;
    activo: boolean; unidadesPorCaja?: number; presentaciones?: Presentacion[];
    precioUnitario?: number;
};
type StockMovimiento = {
    _id: string; tipo: "entrada" | "salida"; cantidad: number;
    motivo: string; precioUnitario?: number; notas?: string; createdAt: string;
};

const TIPO_META: Record<Tipo, { label: string; emoji: string; color: string; bg: string; border: string; accent: string }> = {
    cocina: { label: "Cocina", emoji: "🍳", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", accent: "bg-orange-600" },
    bebida: { label: "Bebida", emoji: "🍺", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", accent: "bg-blue-600" },
};

const EMPTY_ITEM = (tipo: Tipo, categoria = ""): Omit<StockItem, "_id"> => ({
    nombre: "", descripcion: "", tipo, categoria,
    unidad: "unidades", stockActual: 0, stockMinimo: 0, activo: true,
    unidadesPorCaja: undefined, presentaciones: [],
});

const EMPTY_MOV = {
    tipo: "entrada" as "entrada" | "salida",
    cantidad: "", motivo: "",
    presentacionSel: null as Presentacion | null,
    cantidadBultos: "",
};

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

// ── Wrapper modal uniforme ──
function Modal({ onClose, title, children, footer }: {
    onClose: () => void; title: string;
    children: React.ReactNode; footer: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-14" style={{ height: "100dvh" }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: "88dvh" }}>
                <div className="flex items-center px-5 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="font-black text-gray-900 flex-1 text-base">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <X size={17} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">{children}</div>
                <div className="px-5 py-4 border-t border-gray-100 shrink-0">{footer}</div>
            </div>
        </div>
    );
}

// ── Fila de botones de modal ──
function ModalFooter({ onCancel, onConfirm, confirmLabel, confirmDisabled, danger }: {
    onCancel: () => void; onConfirm: () => void;
    confirmLabel: string; confirmDisabled?: boolean; danger?: boolean;
}) {
    return (
        <div className="flex gap-2">
            <button onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancelar
            </button>
            <button onClick={onConfirm} disabled={confirmDisabled}
                className={`flex-1 py-2.5 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition ${danger ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-700"}`}>
                {confirmLabel}
            </button>
        </div>
    );
}

// ── Field label ──
function Label({ text }: { text: string }) {
    return <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{text}</label>;
}

// ── Input compartido ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><Label text={label} />{children}</div>;
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white";

export default function StockPage() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [subcats, setSubcats] = useState<StockSubcategoria[]>([]);
    const router = useRouter();

    const [vista, setVista] = useState<Tipo | null>(null);
    const [subcatVista, setSubcatVista] = useState<string | null>(null);

    const [editModal, setEditModal] = useState<{ open: boolean; item: Partial<StockItem> & { _id?: string } }>({ open: false, item: EMPTY_ITEM("cocina") });
    const [movModal, setMovModal] = useState<{ open: boolean; item: StockItem | null }>({ open: false, item: null });
    const [histModal, setHistModal] = useState<{ open: boolean; item: StockItem | null; movs: StockMovimiento[] }>({ open: false, item: null, movs: [] });
    const [subcatModal, setSubcatModal] = useState(false);
    const [histLoading, setHistLoading] = useState(false);

    const [movForm, setMovForm] = useState(EMPTY_MOV);
    const [movSaving, setMovSaving] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [mostrarValorizacion, setMostrarValorizacion] = useState(false);
    const [precios, setPrecios] = useState<Record<string, string>>({});
    const [newSubcat, setNewSubcat] = useState({ tipo: "cocina" as Tipo, nombre: "" });
    const [subcatSaving, setSubcatSaving] = useState(false);

    const loadItems = useCallback(() => {
        setLoading(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setItems(data);
                    // Inicializar precios desde la base
                    const pMap: Record<string, string> = {};
                    data.forEach((i: StockItem) => {
                        if (i.precioUnitario != null) pMap[i._id] = String(i.precioUnitario);
                    });
                    setPrecios(prev => ({ ...pMap, ...prev }));
                }
            })
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

    const getSubcats = (tipo: Tipo) => subcats.filter(s => s.tipo === tipo);
    function irATipo(t: Tipo) { setVista(t); setSubcatVista(null); setSearch(""); }
    function irASubcat(nombre: string) { setSubcatVista(nombre); setSearch(""); }
    function volverATipo() { setSubcatVista(null); setSearch(""); }
    function volverAMain() { setVista(null); setSubcatVista(null); setSearch(""); }

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
        setEditModal({ open: false, item: EMPTY_ITEM(vista ?? "cocina") });
        loadItems();
    }

    async function registrarMovimiento() {
        if (!movModal.item) return;
        const cantFinal = movForm.presentacionSel
            ? Number(movForm.cantidadBultos) * movForm.presentacionSel.unidades
            : Number(movForm.cantidad);
        if (!cantFinal || !movForm.motivo) return;
        setMovSaving(true);
        try {
            const res = await fetch("/api/superadmin/stock/movimientos", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    stockId: movModal.item._id, tipo: movForm.tipo,
                    cantidad: cantFinal, motivo: movForm.motivo,
                }),
            });
            if (res.ok) { setMovModal({ open: false, item: null }); setMovForm(EMPTY_MOV); loadItems(); }
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

    async function guardarPrecio(itemId: string, valor: string) {
        const precio = valor === "" ? null : Number(valor);
        await fetch(`/api/superadmin/stock/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ precioUnitario: precio }),
        });
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

    const openMov = (item: StockItem) => { setMovModal({ open: true, item }); setMovForm(EMPTY_MOV); };
    const normCat = (i: StockItem) => i.categoria || "Otros";

    // ── PANTALLA PRINCIPAL ──
    if (!vista) {
        return (
            <div className="min-h-screen pb-20 px-4 max-w-3xl mx-auto">
                <div className="py-7">
                    <h1 className="text-3xl font-extrabold text-black">Stock</h1>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {(["cocina", "bebida"] as Tipo[]).map(t => {
                        const m = TIPO_META[t];
                        const total = items.filter(i => (i.tipo ?? "cocina").toLowerCase() === t).length;
                        return (
                            <button key={t} onClick={() => irATipo(t)}
                                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 ${m.border} ${m.bg} py-10 px-4 shadow-sm active:scale-[0.97] transition-transform`}>
                                <span className="text-5xl">{m.emoji}</span>
                                <div className="text-center">
                                    <p className={`text-xl font-black ${m.color}`}>{m.label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{total} producto{total !== 1 ? "s" : ""}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={() => router.push("/admin/stock/cargar")}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl font-bold text-sm transition">
                        <ClipboardList size={17} /> Cargar Stock
                    </button>
                    <button onClick={() => setSubcatModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-gray-200 hover:border-gray-400 bg-white text-gray-700 hover:text-gray-900 rounded-2xl font-bold text-sm transition">
                        <Settings size={17} /> Subcategorías
                    </button>
                </div>
                <button onClick={() => router.push("/admin/stock/pedido")}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 border-2 border-gray-200 hover:border-gray-400 bg-white text-gray-700 hover:text-gray-900 rounded-2xl font-bold text-sm transition">
                    <FileText size={17} /> Nota de Pedido
                </button>

                {/* Modal subcategorías */}
                {subcatModal && (
                    <Modal title="Subcategorías" onClose={() => setSubcatModal(false)}
                        footer={<button onClick={() => setSubcatModal(false)} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">Cerrar</button>}>
                        <div>
                            <Label text="Agregar" />
                            <div className="flex gap-2 mb-3">
                                {(["cocina", "bebida"] as Tipo[]).map(t => (
                                    <button key={t} onClick={() => setNewSubcat(p => ({ ...p, tipo: t }))}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${newSubcat.tipo === t ? TIPO_META[t].accent + " text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                        {TIPO_META[t].emoji} {TIPO_META[t].label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={newSubcat.nombre} onChange={e => setNewSubcat(p => ({ ...p, nombre: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && crearSubcat()}
                                    placeholder="Nombre de la subcategoría"
                                    className={inputCls} />
                                <button onClick={crearSubcat} disabled={subcatSaving || !newSubcat.nombre.trim()}
                                    className="px-4 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center shrink-0">
                                    {subcatSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <Label text={`${TIPO_META[newSubcat.tipo].emoji} ${TIPO_META[newSubcat.tipo].label}`} />
                            {(() => {
                                const lista = subcats.filter(s => s.tipo === newSubcat.tipo);
                                return lista.length === 0
                                    ? <p className="text-xs text-gray-400 italic py-2">Sin subcategorías</p>
                                    : <div className="space-y-1">{lista.map(s => (
                                        <div key={s._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                                            <button onClick={() => { setSubcatModal(false); setVista(s.tipo); setSubcatVista(s.nombre); setSearch(""); }}
                                                className="flex-1 text-left text-sm font-medium text-gray-800">{s.nombre}</button>
                                            <button onClick={() => eliminarSubcat(s._id)} className="text-red-400 hover:text-red-600 transition p-1 ml-2">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}</div>;
                            })()}
                        </div>
                    </Modal>
                )}
            </div>
        );
    }

    const meta = TIPO_META[vista];
    const subcatsDeVista = getSubcats(vista);

    // ── GRID DE SUBCATEGORÍAS ──
    if (!subcatVista) {
        const itemsDelTipo = items.filter(i => (i.tipo ?? "cocina").toLowerCase() === vista);
        return (
            <div className="min-h-screen pb-20 px-4 max-w-3xl mx-auto">
                <div className="flex items-center gap-3 py-5">
                    <button onClick={volverAMain} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${meta.color}`}>
                        {meta.emoji} {meta.label}
                    </h1>
                </div>
                {subcatsDeVista.length === 0 ? (
                    <p className="text-center text-gray-400 py-16 text-sm">Sin subcategorías. Creá una desde "Subcategorías" en la pantalla principal.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {subcatsDeVista.map(s => {
                            const count = itemsDelTipo.filter(i => normCat(i) === s.nombre).length;
                            const hayBajoMinimo = itemsDelTipo.some(i => normCat(i) === s.nombre && i.activo && i.stockMinimo > 0 && i.stockActual <= i.stockMinimo);
                            return (
                                <button key={s._id} onClick={() => irASubcat(s.nombre)}
                                    className={`relative flex flex-col items-start gap-1.5 rounded-2xl border-2 ${meta.border} bg-white px-4 py-5 shadow-sm active:scale-[0.97] transition-transform text-left`}>
                                    {hayBajoMinimo && <AlertTriangle size={13} className="absolute top-3 right-3 text-yellow-500" />}
                                    <p className={`text-base font-black ${meta.color}`}>{s.nombre}</p>
                                    <p className="text-xs text-gray-400">{count} producto{count !== 1 ? "s" : ""}</p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ── LISTA DE PRODUCTOS ──
    const itemsSubcat = items
        .filter(i => (i.tipo ?? "cocina").toLowerCase() === vista && normCat(i) === subcatVista)
        .filter(i => !search || i.nombre.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen pb-20">
            <div className="px-4 max-w-3xl mx-auto">
                <div className="flex items-center gap-3 py-5">
                    <button onClick={volverATipo} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${meta.color}`}>{meta.emoji} {meta.label}</p>
                        <h1 className="text-xl font-extrabold text-black truncate">{subcatVista}</h1>
                    </div>
                    <button onClick={() => setEditModal({ open: true, item: { ...EMPTY_ITEM(vista, subcatVista) } })}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0">
                        <Plus size={15} /> Nuevo
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
                        className={inputCls + " flex-1"} />
                    <button onClick={() => setMostrarValorizacion(v => !v)}
                        className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2.5 rounded-xl border transition shrink-0 ${mostrarValorizacion ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                        <DollarSign size={14} /> Valorizar
                    </button>
                </div>

                {mostrarValorizacion && (() => {
                    const total = itemsSubcat.reduce((s, i) => s + i.stockActual * Number(precios[i._id] ?? 0), 0);
                    return total > 0 ? (
                        <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                            <p className="text-xs font-bold text-emerald-700">Total valorización</p>
                            <p className="text-sm font-black text-emerald-700">{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(total)}</p>
                        </div>
                    ) : null;
                })()}

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
                ) : itemsSubcat.length === 0 ? (
                    <p className="text-center text-gray-400 py-16 text-sm">Sin productos en esta subcategoría.</p>
                ) : (
                    <div className="space-y-2">
                        {itemsSubcat.map(item => {
                            const isLow = item.activo && item.stockMinimo > 0 && item.stockActual <= item.stockMinimo;
                            const subtotal = item.stockActual * Number(precios[item._id] ?? 0);
                            return (
                                <div key={item._id}
                                    className={`bg-white rounded-2xl border shadow-sm ${isLow ? "border-yellow-300" : "border-gray-100"} ${!item.activo ? "opacity-50" : ""}`}>
                                    <div className="px-4 py-3.5 flex items-center gap-3">
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900 text-sm truncate">{item.nombre}</p>
                                                {!item.activo && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">inactivo</span>}
                                            </div>
                                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                                <span className={`text-lg font-black ${isLow ? "text-yellow-600" : "text-gray-800"}`}>{formatNum(item.stockActual)}</span>
                                                <span className="text-xs text-gray-400">{item.unidad}</span>
                                                {isLow && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ml-1"><AlertTriangle size={9} />bajo mín</span>}
                                                {mostrarValorizacion && subtotal > 0 && (
                                                    <span className="text-xs font-bold text-emerald-600 ml-1">= {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(subtotal)}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Acciones */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => setEditModal({ open: true, item: { ...item } })}
                                                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition" title="Editar">
                                                <Edit2 size={14} className="text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Fila de precio (solo cuando valorizar está activo) */}
                                    {mostrarValorizacion && (
                                        <div className="px-4 pb-3 flex items-center gap-2 border-t border-gray-50 pt-2">
                                            <span className="text-xs text-gray-400">$ por {item.unidad}</span>
                                            <input
                                                type="number" min="0" step="any" inputMode="decimal"
                                                value={precios[item._id] ?? ""}
                                                onChange={e => setPrecios(p => ({ ...p, [item._id]: e.target.value }))}
                                                onBlur={e => guardarPrecio(item._id, e.target.value)}
                                                placeholder="Precio unitario"
                                                className="flex-1 border border-emerald-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50 text-emerald-800"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── MODAL EDITAR / NUEVO ── */}
            {editModal.open && (
                <Modal
                    title={editModal.item._id ? "Editar producto" : "Nuevo producto"}
                    onClose={() => setEditModal({ open: false, item: EMPTY_ITEM(vista, subcatVista ?? "") })}
                    footer={
                        <div className="space-y-2">
                            <ModalFooter
                                onCancel={() => setEditModal({ open: false, item: EMPTY_ITEM(vista, subcatVista ?? "") })}
                                onConfirm={saveItem}
                                confirmLabel={editSaving ? "Guardando..." : "Guardar"}
                                confirmDisabled={editSaving || !editModal.item.nombre?.trim()}
                            />
                            {editModal.item._id && (
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => { setEditModal({ open: false, item: EMPTY_ITEM(vista, subcatVista ?? "") }); openHistorial(editModal.item as StockItem); }}
                                        className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                        <History size={13} /> Historial de movimientos
                                    </button>
                                    <button onClick={() => deleteItem(editModal.item._id!, editModal.item.nombre ?? "")}
                                        className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 border border-red-100 rounded-xl hover:bg-red-50 transition">
                                        <Trash2 size={13} /> Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    }>
                    {/* Sección */}
                    <Field label="Sección">
                        <div className="flex gap-2">
                            {(["cocina", "bebida"] as Tipo[]).map(t => (
                                <button key={t} onClick={() => setEditModal(p => ({ ...p, item: { ...p.item, tipo: t, categoria: "" } }))}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${editModal.item.tipo === t ? TIPO_META[t].accent + " text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                    {TIPO_META[t].emoji} {TIPO_META[t].label}
                                </button>
                            ))}
                        </div>
                    </Field>
                    {/* Nombre */}
                    <Field label="Nombre *">
                        <input value={editModal.item.nombre || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, nombre: e.target.value } }))}
                            placeholder="Ej: Cerveza Quilmes" className={inputCls} />
                    </Field>
                    {/* Subcategoría */}
                    <Field label="Subcategoría">
                        {getSubcats(editModal.item.tipo ?? "cocina").length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {getSubcats(editModal.item.tipo ?? "cocina").map(s => (
                                    <button key={s._id} onClick={() => setEditModal(p => ({ ...p, item: { ...p.item, categoria: s.nombre } }))}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${editModal.item.categoria === s.nombre ? (editModal.item.tipo === "bebida" ? "bg-blue-600 text-white border-blue-600" : "bg-orange-600 text-white border-orange-600") : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                                        {s.nombre}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input value={editModal.item.categoria || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, categoria: e.target.value } }))}
                            placeholder="O escribí una personalizada" className={inputCls} />
                    </Field>
                    {/* Unidad */}
                    <Field label="Unidad">
                        <input value={editModal.item.unidad || ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, unidad: e.target.value } }))}
                            placeholder="kg, lts, unidades, cajas…" className={inputCls} />
                    </Field>
                    {/* Presentaciones */}
                    <Field label="Presentaciones (cajón, caja, etc.)">
                        <div className="space-y-2">
                            {(editModal.item.presentaciones ?? []).map((p, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input value={p.nombre}
                                        onChange={e => setEditModal(prev => { const arr = [...(prev.item.presentaciones ?? [])]; arr[idx] = { ...arr[idx], nombre: e.target.value }; return { ...prev, item: { ...prev.item, presentaciones: arr } }; })}
                                        placeholder="Nombre (ej: Cajón)" className={inputCls + " flex-1"} />
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input type="number" min="0.001" step="any" inputMode="decimal" value={p.unidades}
                                            onChange={e => setEditModal(prev => { const arr = [...(prev.item.presentaciones ?? [])]; arr[idx] = { ...arr[idx], unidades: Number(e.target.value) }; return { ...prev, item: { ...prev.item, presentaciones: arr } }; })}
                                            placeholder="Cant." className={inputCls + " w-20"} />
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{editModal.item.unidad || "u."}</span>
                                    </div>
                                    <button onClick={() => setEditModal(prev => { const arr = (prev.item.presentaciones ?? []).filter((_, i) => i !== idx); return { ...prev, item: { ...prev.item, presentaciones: arr } }; })}
                                        className="p-2 text-red-400 hover:text-red-600 transition shrink-0"><X size={14} /></button>
                                </div>
                            ))}
                            <button onClick={() => setEditModal(prev => ({ ...prev, item: { ...prev.item, presentaciones: [...(prev.item.presentaciones ?? []), { nombre: "", unidades: 1 }] } }))}
                                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold py-1.5 px-2 rounded-lg hover:bg-gray-100 transition">
                                <Plus size={13} /> Agregar presentación
                            </button>
                        </div>
                    </Field>
                    {/* Stock mínimo */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Stock actual">
                            <div className={inputCls + " text-gray-400 bg-gray-50 cursor-default"}>
                                {formatNum(editModal.item.stockActual ?? 0)}
                            </div>
                        </Field>
                        <Field label="Stock mínimo">
                            <input type="number" min="0" value={editModal.item.stockMinimo ?? ""} onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, stockMinimo: Number(e.target.value) } }))}
                                className={inputCls} />
                        </Field>
                    </div>
                    {editModal.item._id && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="activo" checked={editModal.item.activo ?? true}
                                onChange={e => setEditModal(p => ({ ...p, item: { ...p.item, activo: e.target.checked } }))} className="w-4 h-4 accent-gray-700" />
                            <label htmlFor="activo" className="text-sm text-gray-600">Producto activo</label>
                        </div>
                    )}
                </Modal>
            )}

            {/* ── MODAL MOVIMIENTO ── */}
            {movModal.open && movModal.item && (() => {
                const pres: Presentacion[] = [
                    ...(movModal.item.presentaciones?.filter(p => p.nombre && p.unidades > 0) ?? []),
                    ...(!movModal.item.presentaciones?.length && movModal.item.unidadesPorCaja
                        ? [{ nombre: "Caja", unidades: movModal.item.unidadesPorCaja }] : []),
                ];
                const cantCalc = movForm.presentacionSel
                    ? (movForm.cantidadBultos ? Number(movForm.cantidadBultos) * movForm.presentacionSel.unidades : 0)
                    : Number(movForm.cantidad);
                return (
                    <Modal
                        title={movModal.item.nombre}
                        onClose={() => setMovModal({ open: false, item: null })}
                        footer={
                            <ModalFooter
                                onCancel={() => setMovModal({ open: false, item: null })}
                                onConfirm={registrarMovimiento}
                                confirmLabel={movSaving ? "Guardando..." : "Registrar"}
                                confirmDisabled={movSaving || !(movForm.presentacionSel ? movForm.cantidadBultos : movForm.cantidad) || !movForm.motivo}
                            />
                        }>
                        {/* Tipo */}
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
                        {/* Presentación */}
                        {pres.length > 0 && (
                            <Field label="Presentación">
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setMovForm(p => ({ ...p, presentacionSel: null, cantidadBultos: "", cantidad: "" }))}
                                        className={`py-2 px-3.5 rounded-xl text-sm font-bold border transition ${!movForm.presentacionSel ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                        Suelto
                                    </button>
                                    {pres.map((pr, idx) => (
                                        <button key={idx} onClick={() => setMovForm(p => ({ ...p, presentacionSel: pr, cantidadBultos: "", cantidad: "" }))}
                                            className={`py-2 px-3.5 rounded-xl text-sm font-bold border transition flex items-center gap-1.5 ${movForm.presentacionSel?.nombre === pr.nombre ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            <Package size={13} /> {pr.nombre} <span className="opacity-50 text-xs">({pr.unidades})</span>
                                        </button>
                                    ))}
                                </div>
                            </Field>
                        )}
                        {/* Cantidad */}
                        {movForm.presentacionSel ? (
                            <Field label={`Cantidad de ${movForm.presentacionSel.nombre.toLowerCase()}s *`}>
                                <input type="number" min="1" step="1" value={movForm.cantidadBultos}
                                    onChange={e => setMovForm(p => ({ ...p, cantidadBultos: e.target.value }))}
                                    placeholder="Ej: 2" className={inputCls} />
                                {movForm.cantidadBultos && (
                                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-xl px-3 py-2">
                                        {movForm.cantidadBultos} {movForm.presentacionSel.nombre.toLowerCase()}{Number(movForm.cantidadBultos) !== 1 ? "s" : ""}
                                        {" "}× {movForm.presentacionSel.unidades} = <strong>{Number(movForm.cantidadBultos) * movForm.presentacionSel.unidades} {movModal.item.unidad}</strong>
                                    </p>
                                )}
                            </Field>
                        ) : (
                            <Field label={`Cantidad en ${movModal.item.unidad} *`}>
                                <input type="number" min="0.01" step="any" value={movForm.cantidad}
                                    onChange={e => setMovForm(p => ({ ...p, cantidad: e.target.value }))}
                                    placeholder={`Ej: 5 ${movModal.item.unidad}`} className={inputCls} />
                            </Field>
                        )}
                        {/* Motivo */}
                        <Field label="Motivo *">
                            <input value={movForm.motivo} onChange={e => setMovForm(p => ({ ...p, motivo: e.target.value }))}
                                placeholder="Ej: compra, ajuste, merma…" className={inputCls} />
                        </Field>
                        {/* Resumen */}
                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold ${movForm.tipo === "entrada" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                            <span>Stock actual: <strong>{formatNum(movModal.item.stockActual)}</strong> {movModal.item.unidad}</span>
                            {cantCalc > 0 && (
                                <span>→ <strong>{formatNum(movForm.tipo === "entrada" ? movModal.item.stockActual + cantCalc : Math.max(0, movModal.item.stockActual - cantCalc))}</strong></span>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {/* ── MODAL HISTORIAL ── */}
            {histModal.open && histModal.item && (
                <Modal
                    title={`Historial · ${histModal.item.nombre}`}
                    onClose={() => setHistModal({ open: false, item: null, movs: [] })}
                    footer={<button onClick={() => setHistModal({ open: false, item: null, movs: [] })} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">Cerrar</button>}>
                    {histLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                    ) : histModal.movs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados</p>
                    ) : (
                        <div className="space-y-2">
                            {histModal.movs.map(m => (
                                <div key={m._id} className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.tipo === "entrada" ? "bg-emerald-100" : "bg-red-100"}`}>
                                        {m.tipo === "entrada" ? <TrendingUp size={13} className="text-emerald-600" /> : <TrendingDown size={13} className="text-red-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{m.motivo}</p>
                                        <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    <p className={`text-sm font-black shrink-0 ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                                        {m.tipo === "entrada" ? "+" : "−"}{formatNum(m.cantidad)} <span className="text-xs font-normal text-gray-400">{histModal.item!.unidad}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}
