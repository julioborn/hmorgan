"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, CalendarDays, Clock, Users, Search, ChevronLeft, ToggleLeft, ToggleRight } from "lucide-react";

type Usuario = { _id: string; nombre: string; apellido: string; username?: string };

type Invitacion = {
    _id: string;
    titulo: string;
    descripcion: string;
    fecha: string;
    hora: string;
    precio: number;
    imagenUrl: string;
    colorFondo: string;
    activo: boolean;
    tema: "default" | "trasnoche";
    destinatarios: "todos" | "seleccionados";
    usuariosIds: string[];
};

const EMPTY: Omit<Invitacion, "_id"> = {
    titulo: "", descripcion: "", fecha: "", hora: "", precio: 0,
    imagenUrl: "", colorFondo: "#111111", activo: false,
    tema: "default", destinatarios: "todos", usuariosIds: [],
};

const fmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function InvitacionesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState<Invitacion | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [buscarUsuario, setBuscarUsuario] = useState("");

    useEffect(() => {
        if (!loading && user?.role !== "admin" && user?.role !== "superadmin") router.replace("/");
    }, [user, loading, router]);

    const cargar = useCallback(async () => {
        const r = await fetch("/api/admin/invitaciones", { credentials: "include" });
        const d = await r.json().catch(() => []);
        setInvitaciones(Array.isArray(d) ? d : []);
    }, []);

    const cargarUsuarios = useCallback(async () => {
        const r = await fetch("/api/admin/clientes", { credentials: "include" });
        const d = await r.json().catch(() => []);
        const lista = Array.isArray(d) ? d : (d.clientes ?? []);
        setUsuarios(lista.filter((u: any) => u.role === "cliente" || !u.role));
    }, []);

    useEffect(() => { cargar(); cargarUsuarios(); }, [cargar, cargarUsuarios]);

    function abrirCrear() {
        setEditando(null);
        setForm({ ...EMPTY });
        setBuscarUsuario("");
        setModalOpen(true);
    }

    function abrirEditar(inv: Invitacion) {
        setEditando(inv);
        setForm({
            titulo: inv.titulo, descripcion: inv.descripcion,
            fecha: inv.fecha ? inv.fecha.slice(0, 10) : "",
            hora: inv.hora, precio: inv.precio,
            imagenUrl: inv.imagenUrl, colorFondo: inv.colorFondo,
            activo: inv.activo, tema: inv.tema ?? "default",
            destinatarios: inv.destinatarios,
            usuariosIds: inv.usuariosIds ?? [],
        });
        setBuscarUsuario("");
        setModalOpen(true);
    }

    async function guardar() {
        if (!form.titulo.trim() || !form.fecha) return;
        setSaving(true);
        try {
            const body = { ...form, precio: Number(form.precio) || 0 };
            const url = editando ? `/api/admin/invitaciones/${editando._id}` : "/api/admin/invitaciones";
            const method = editando ? "PUT" : "POST";
            const r = await fetch(url, {
                method, credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (r.ok) { setModalOpen(false); cargar(); }
        } finally { setSaving(false); }
    }

    async function eliminar(id: string) {
        if (!confirm("¿Eliminar esta invitación?")) return;
        await fetch(`/api/admin/invitaciones/${id}`, { method: "DELETE", credentials: "include" });
        cargar();
    }

    async function toggleActivo(inv: Invitacion) {
        await fetch(`/api/admin/invitaciones/${inv._id}`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...inv, fecha: inv.fecha.slice(0, 10), activo: !inv.activo }),
        });
        cargar();
    }

    function toggleUsuario(uid: string) {
        setForm(f => ({
            ...f,
            usuariosIds: f.usuariosIds.includes(uid)
                ? f.usuariosIds.filter(id => id !== uid)
                : [...f.usuariosIds, uid],
        }));
    }

    const usuariosFiltrados = usuarios.filter(u => {
        const q = buscarUsuario.toLowerCase();
        return !q || `${u.nombre} ${u.apellido} ${u.username ?? ""}`.toLowerCase().includes(q);
    });

    const bgPreview = form.imagenUrl
        ? `url(${form.imagenUrl})`
        : `linear-gradient(135deg, ${form.colorFondo}cc, ${form.colorFondo})`;

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {/* Header */}
            <div className="bg-black px-4 py-4 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-1.5 rounded-lg bg-white/10 text-white">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-lg leading-none">Invitaciones</p>
                    <p className="text-white/50 text-xs mt-0.5">Eventos visibles en el inicio del cliente</p>
                </div>
                <button onClick={abrirCrear}
                    className="flex items-center gap-1.5 bg-white text-black font-black text-sm px-3 py-2 rounded-xl transition active:scale-95">
                    <Plus size={15} /> Nueva
                </button>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 space-y-3">
                {invitaciones.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <CalendarDays size={44} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Sin invitaciones creadas</p>
                        <p className="text-sm mt-1">Creá la primera para que aparezca en el inicio del cliente.</p>
                    </div>
                )}

                {invitaciones.map(inv => {
                    const fechaStr = inv.fecha ? fmt.format(new Date(inv.fecha)) : "—";
                    const bg = inv.imagenUrl
                        ? `url(${inv.imagenUrl}) center/cover`
                        : `linear-gradient(135deg, ${inv.colorFondo}cc, ${inv.colorFondo})`;
                    return (
                        <div key={inv._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Preview mini */}
                            <div className="h-28 relative" style={{ background: bg }}>
                                <div className="absolute inset-0 bg-black/50" />
                                <div className="absolute inset-0 flex flex-col justify-end p-3">
                                    <p className="text-white font-black text-lg leading-tight truncate">{inv.titulo}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-white/70 text-xs flex items-center gap-1">
                                            <CalendarDays size={11} />{fechaStr}
                                        </span>
                                        {inv.hora && (
                                            <span className="text-white/70 text-xs flex items-center gap-1">
                                                <Clock size={11} />{inv.hora}
                                            </span>
                                        )}
                                        {inv.precio > 0 && (
                                            <span className="text-white/90 text-xs font-black">
                                                ${new Intl.NumberFormat("es-AR").format(inv.precio)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Acciones */}
                            <div className="px-4 py-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${inv.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                        {inv.activo ? "Visible" : "Oculta"}
                                    </span>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Users size={10} />
                                        {inv.destinatarios === "todos" ? "Todos" : `${inv.usuariosIds?.length ?? 0} usuarios`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleActivo(inv)}
                                        className={`p-1.5 rounded-lg transition ${inv.activo ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                                        title={inv.activo ? "Ocultar" : "Mostrar"}>
                                        {inv.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                                    </button>
                                    <button onClick={() => abrirEditar(inv)}
                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                                        <Pencil size={15} />
                                    </button>
                                    <button onClick={() => eliminar(inv._id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal crear/editar */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
                    onClick={() => !saving && setModalOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>

                        {/* Header modal */}
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <p className="font-black text-gray-900 text-base">{editando ? "Editar invitación" : "Nueva invitación"}</p>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">

                            {/* Preview card */}
                            <div className="h-36 rounded-2xl relative overflow-hidden"
                                style={{ background: bgPreview, backgroundSize: "cover", backgroundPosition: "center" }}>
                                <div className="absolute inset-0 bg-black/50" />
                                <div className="absolute inset-0 flex flex-col justify-end p-4">
                                    <p className="text-white font-black text-xl leading-tight">
                                        {form.titulo || "Título del evento"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {form.fecha && (
                                            <span className="text-white/80 text-xs flex items-center gap-1">
                                                <CalendarDays size={11} />
                                                {fmt.format(new Date(form.fecha + "T12:00:00"))}
                                            </span>
                                        )}
                                        {form.hora && (
                                            <span className="text-white/80 text-xs flex items-center gap-1">
                                                <Clock size={11} />{form.hora}
                                            </span>
                                        )}
                                        {form.precio > 0 && (
                                            <span className="text-white font-black text-sm">
                                                ${new Intl.NumberFormat("es-AR").format(form.precio)}
                                            </span>
                                        )}
                                    </div>
                                    {form.descripcion && (
                                        <p className="text-white/70 text-xs mt-1 line-clamp-1">{form.descripcion}</p>
                                    )}
                                </div>
                            </div>

                            {/* Campos */}
                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Título *</label>
                                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                                    placeholder="Ej: Noche de Jazz en H. Morgan"
                                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Descripción</label>
                                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                    rows={2} placeholder="Breve descripción del evento…"
                                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Fecha *</label>
                                    <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                                        className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Hora</label>
                                    <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                                        className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Precio (entrada / consumición)</label>
                                <input type="number" min={0} value={form.precio}
                                    onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
                                    placeholder="0 = gratis"
                                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                            </div>

                            {/* Fondo */}
                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">URL de imagen de fondo</label>
                                <input value={form.imagenUrl} onChange={e => setForm(f => ({ ...f, imagenUrl: e.target.value }))}
                                    placeholder="https://… (opcional)"
                                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Color de fondo (si no hay imagen)</label>
                                <div className="mt-1 flex items-center gap-3">
                                    <input type="color" value={form.colorFondo}
                                        onChange={e => setForm(f => ({ ...f, colorFondo: e.target.value }))}
                                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
                                    <span className="text-sm text-gray-500 font-mono">{form.colorFondo}</span>
                                </div>
                            </div>

                            {/* Estilo visual */}
                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Estilo visual</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setForm(f => ({ ...f, tema: "default" }))}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition ${form.tema === "default" ? "border-black bg-black text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                                        <span className="text-xl">🎫</span>
                                        <span className="text-xs font-black">Estándar</span>
                                    </button>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, tema: "trasnoche" }))}
                                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition ${form.tema === "trasnoche" ? "border-purple-600 bg-[#0a0010] text-white" : "border-gray-200 text-gray-500 hover:border-purple-300"}`}>
                                        <span className="text-xl">🪩</span>
                                        <span className="text-xs font-black">Trasnoche</span>
                                    </button>
                                </div>
                            </div>

                            {/* Destinatarios */}
                            <div>
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">¿A quiénes mostrarlo?</label>
                                <div className="mt-2 flex gap-2">
                                    {(["todos", "seleccionados"] as const).map(opt => (
                                        <button key={opt} onClick={() => setForm(f => ({ ...f, destinatarios: opt }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${form.destinatarios === opt ? "border-black bg-black text-white" : "border-gray-200 text-gray-500"}`}>
                                            {opt === "todos" ? "Todos los usuarios" : "Seleccionar usuarios"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.destinatarios === "seleccionados" && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                                            Usuarios invitados ({form.usuariosIds.length} seleccionados)
                                        </label>
                                        {form.usuariosIds.length > 0 && (
                                            <button onClick={() => setForm(f => ({ ...f, usuariosIds: [] }))}
                                                className="text-[11px] text-red-500 font-bold hover:underline">
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative mb-2">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={buscarUsuario} onChange={e => setBuscarUsuario(e.target.value)}
                                            placeholder="Buscar usuario…"
                                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition" />
                                    </div>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                                        {usuariosFiltrados.length === 0 && (
                                            <p className="text-center text-gray-400 text-sm py-4">Sin resultados</p>
                                        )}
                                        {usuariosFiltrados.map((u, i) => {
                                            const sel = form.usuariosIds.includes(u._id);
                                            return (
                                                <button key={u._id} onClick={() => toggleUsuario(u._id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${sel ? "bg-emerald-50" : "hover:bg-gray-100"}`}>
                                                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition ${sel ? "bg-black border-black" : "border-gray-300"}`}>
                                                        {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{u.nombre} {u.apellido}</p>
                                                        {u.username && <p className="text-xs text-gray-400 truncate">@{u.username}</p>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Visible */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-black text-gray-900">Visible en el inicio</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Los clientes invitados verán esta card</p>
                                </div>
                                <button onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                                    className={`transition ${form.activo ? "text-emerald-600" : "text-gray-300"}`}>
                                    {form.activo ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                </button>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white px-5 pb-5 pt-3 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setModalOpen(false)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500">
                                Cancelar
                            </button>
                            <button onClick={guardar} disabled={saving || !form.titulo.trim() || !form.fecha}
                                className="flex-1 py-3 bg-black text-white rounded-xl text-sm font-black disabled:opacity-50 transition">
                                {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear invitación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
