"use client";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Gift, QrCode, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import Loader from "@/components/Loader";
import { Trash2 } from "lucide-react";
import { swalBase } from "@/lib/swalConfig";

type Reward = {
    _id: string;
    titulo: string;
    puntos: number;
    descripcion?: string;
    activo: boolean;
    tema?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminRewardsPage() {
    const { data: rewards, mutate } = useSWR<Reward[]>("/api/rewards?all=true", fetcher);

    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [puntos, setPuntos] = useState<number>(0);
    const [tema, setTema] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    function resetForm() {
        setTitulo("");
        setDescripcion("");
        setPuntos(0);
        setTema("");
        setEditingId(null);
        setShowForm(false);
    }

    function handleEdit(r: Reward) {
        setEditingId(r._id);
        setTitulo(r.titulo);
        setDescripcion(r.descripcion || "");
        setPuntos(r.puntos);
        setTema(r.tema || "");
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(
                editingId ? `/api/rewards/${editingId}` : "/api/rewards",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ titulo, descripcion, puntos, tema }),
                }
            );

            if (!res.ok) throw new Error(editingId ? "Error actualizando canje" : "Error creando canje");
            await mutate();
            resetForm();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!rewards) {
        return (
            <div className="p-12 flex justify-center">
                <Loader size={40} />
            </div>
        );
    }

    async function handleToggle(id: string) {
        await fetch(`/api/rewards/${id}`, { method: "PATCH" });
        await mutate();
    }

    async function handleDelete(id: string) {
        const result = await swalBase.fire({
            title: "Eliminar canje",
            text: "¿Seguro que querés eliminar este canje? Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        const res = await fetch(`/api/rewards/${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            swalBase.fire("Error", "No se pudo eliminar el canje", "error");
            return;
        }

        await mutate(); // 🔥 refresca la lista
    }

    return (
        <div className="max-w-4xl mx-auto py-6">
            {/* 🏷️ Título */}
            <h1 className="text-3xl font-extrabold mb-8 text-black text-center md:text-left flex justify-center items-center gap-2">
                Canjes
            </h1>

            {/* ➕ Formulario toggleable */}
            <div className="mb-10 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <button
                    onClick={() => (showForm ? resetForm() : setShowForm(true))}
                    className="w-full flex items-center justify-between text-lg font-bold text-red-600 hover:text-red-700 transition"
                >
                    <span>{editingId ? "Editar Canje" : "Generar Canje"}</span>
                    {showForm ? <ChevronUp /> : <ChevronDown />}
                </button>

                {showForm && (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                placeholder="Título"
                                required
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <input
                                type="number"
                                value={puntos}
                                onChange={(e) => setPuntos(Number(e.target.value))}
                                placeholder="Puntos"
                                required
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción (opcional)"
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-400 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-500"
                        />

                        <select
                            value={tema}
                            onChange={(e) => setTema(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Tarjeta estándar</option>
                            <option value="argentina">🇦🇷 Especial Argentina — Mundial 2026</option>
                        </select>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex justify-end gap-2">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition disabled:opacity-50"
                            >
                                {loading ? <Loader size={20} /> : editingId ? "Guardar cambios" : "Crear"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* 📱 Botón global Escanear */}
            <div className="flex justify-center mb-10">
                <Link
                    href="/admin/rewards/scan"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 shadow-md hover:scale-105 transition"
                >
                    <QrCode size={18} /> Escanear
                </Link>
            </div>

            {/* 🎟️ Lista de canjes */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((r) => (
                    r.tema === "argentina"
                        ? <ArgentinaCard key={r._id} r={r} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
                        : (
                            <div
                                key={r._id}
                                className={`relative border rounded-2xl shadow-sm p-5 flex flex-col justify-between transition overflow-visible ${
                                    r.activo ? "bg-white border-gray-200 hover:bg-red-50/40" : "bg-gray-50 border-gray-200 opacity-60"
                                }`}
                            >
                                <div className="absolute inset-y-0 -left-3 flex items-center">
                                    <span className="w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                                </div>
                                <div className="absolute inset-y-0 -right-3 flex items-center">
                                    <span className="w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                                </div>
                                <div className="absolute top-3 right-3 flex items-center gap-1">
                                    <button onClick={() => handleToggle(r._id)}
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${r.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                                        {r.activo ? "Activo" : "Inactivo"}
                                    </button>
                                    <button onClick={() => handleEdit(r)}
                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(r._id)}
                                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex-1 pr-24">
                                    <h3 className="text-lg font-bold text-black">{r.titulo}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{r.descripcion || "Sin descripción"}</p>
                                    <p className="text-sm font-semibold text-red-600 mt-2">{r.puntos} puntos</p>
                                </div>
                                <div className="absolute bottom-3 right-3">
                                    <img src="/icon-192x192.png" alt="Logo" className="h-7 w-7 object-contain opacity-80" />
                                </div>
                            </div>
                        )
                ))}
            </div>
        </div>
    );
}

function ArgentinaCard({ r, onToggle, onDelete, onEdit }: { r: any; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (r: any) => void }) {
    return (
        <div className={`relative rounded-2xl shadow-xl overflow-visible border-2 border-[#74ACDF] ${!r.activo ? "opacity-60" : ""}`}>
            <div
                className="relative rounded-2xl p-5 h-44 flex flex-col justify-between overflow-hidden"
                style={{ background: "repeating-linear-gradient(90deg,#74ACDF 0px,#74ACDF 26px,white 26px,white 52px)" }}
            >
                {/* Overlay blanco para legibilidad */}
                <div className="absolute inset-0 bg-white/55 rounded-2xl" />

                {/* Muescas laterales */}
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-[#74ACDF] rounded-full shadow" />

                {/* Acciones */}
                <div className="relative z-10 flex justify-between items-start">
                    <div className="flex gap-0.5 text-yellow-400 text-base leading-none">★★★</div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onToggle(r._id)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${r.activo ? "bg-white/80 text-emerald-700" : "bg-white/60 text-gray-500"}`}>
                            {r.activo ? "Activo" : "Inactivo"}
                        </button>
                        <button onClick={() => onEdit(r)}
                            className="p-1.5 rounded-lg bg-white/70 text-blue-600 hover:bg-white transition">
                            <Pencil size={14} />
                        </button>
                        <button onClick={() => onDelete(r._id)}
                            className="p-1.5 rounded-lg bg-white/70 text-red-600 hover:bg-white transition">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="relative z-10 flex-1 flex flex-col justify-end gap-1">
                    <p className="text-[10px] font-black text-[#003DA5] uppercase tracking-widest">Mundial 2026</p>
                    <h3 className="text-base font-extrabold text-[#003DA5] leading-tight">{r.titulo}</h3>
                    {r.descripcion && <p className="text-xs text-[#003DA5]/70 line-clamp-1">{r.descripcion}</p>}
                    <span className="text-xs font-bold text-[#003DA5] bg-[#74ACDF]/30 px-2 py-0.5 rounded-full w-fit mt-0.5">
                        {r.puntos} pts
                    </span>
                </div>

                {/* Pelota */}
                <span className="absolute bottom-3 right-4 text-2xl z-10">⚽</span>
            </div>
        </div>
    );
}
