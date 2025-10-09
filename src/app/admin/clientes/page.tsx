"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { QrCode, Pencil, Trash2, X, Save } from "lucide-react";
import Loader from "@/components/Loader";

type Client = {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string;
    puntos?: number;
    qrToken?: string;
};

const container =
    "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

const PAGE_SIZE = 20;

export default function AdminClientsPage() {
    const { user, loading: authLoading } = useAuth();
    const isAdmin = user?.role === "admin";

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<"nombre" | "apellido" | "dni" | "puntos">(
        "apellido"
    );
    const [dir, setDir] = useState<"asc" | "desc">("asc");

    const [items, setItems] = useState<Client[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    const [editing, setEditing] = useState<Client | null>(null);
    const [toDelete, setToDelete] = useState<Client | null>(null);

    useEffect(() => {
        if (authLoading || !isAdmin) return;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const url = new URL("/api/admin/clientes", window.location.origin);
                url.searchParams.set("q", q);
                url.searchParams.set("page", String(page));
                url.searchParams.set("limit", String(PAGE_SIZE));
                url.searchParams.set("sort", `${sort}:${dir}`);

                const res = await fetch(url.toString(), {
                    cache: "no-store",
                    credentials: "include",
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

                if (!cancelled) {
                    setItems(data.items || []);
                    setTotal(data.total || 0);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Error de red");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isAdmin, q, page, sort, dir]);

    if (authLoading) {
        return (
            <div className={`${container} py-12 flex justify-center`}>
                <Loader size={40} />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className={`${container} py-8`}>
                <h1 className="text-2xl font-extrabold text-black">Acceso restringido</h1>
                <p className="text-gray-600">Solo administradores.</p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    function toggleSort(key: typeof sort) {
        if (sort === key) {
            setDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSort(key);
            setDir("asc");
        }
    }

    if (authLoading || loading) {
        return (
            <div className={`${container} py-20 flex justify-center items-center`}>
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100`}>
            <div className={`${container} py-8 space-y-6`}>
                {/* Header */}
                <header className="space-y-2 text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-black">Clientes</h1>
                </header>

                {/* Barra de acciones */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:w-80">
                        <input
                            className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Buscar por nombre o DNI…"
                            value={q}
                            onChange={(e) => {
                                setPage(1);
                                setQ(e.target.value);
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-700">Ordenar</label>
                        <select
                            value={`${sort}:${dir}`}
                            onChange={(e) => {
                                const [s, d] = e.target.value.split(":") as any;
                                setSort(s);
                                setDir(d);
                            }}
                            className="rounded-lg h-11 px-3 border border-gray-300 bg-white text-black
                         focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="apellido:asc">Apellido ↑</option>
                            <option value="apellido:desc">Apellido ↓</option>
                            <option value="nombre:asc">Nombre ↑</option>
                            <option value="nombre:desc">Nombre ↓</option>
                            <option value="dni:asc">DNI ↑</option>
                            <option value="dni:desc">DNI ↓</option>
                            <option value="puntos:desc">Puntos ↓</option>
                            <option value="puntos:asc">Puntos ↑</option>
                        </select>
                    </div>
                </div>

                {/* Tabla / lista */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    {/* head (desktop) */}
                    <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_0.8fr_160px] items-center gap-3 px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 border-b border-gray-200">
                        <button onClick={() => toggleSort("apellido")} className="text-left hover:text-red-600">
                            Cliente
                        </button>
                        <button onClick={() => toggleSort("dni")} className="text-left hover:text-red-600">
                            DNI
                        </button>
                        <div>Teléfono</div>
                        <button onClick={() => toggleSort("puntos")} className="text-left hover:text-red-600">
                            Puntos
                        </button>
                        <div className="text-right pr-1">Acciones</div>
                    </div>

                    {/* body */}
                    {error ? (
                        <div className="p-4 text-red-600">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="p-6 text-gray-600">Sin resultados.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {items.map((c) => (
                                <li
                                    key={c.id}
                                    className="px-4 py-4 transition flex flex-col md:grid md:grid-cols-[1.6fr_1fr_1fr_0.8fr_160px] md:items-center gap-3 hover:bg-red-50/40"
                                >
                                    {/* Col 1: Cliente */}
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate text-black">
                                            {c.apellido}, {c.nombre}
                                        </div>
                                        <div className="text-xs text-gray-600 truncate flex items-center gap-1 mt-0.5">
                                            {c.qrToken ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                    <QrCode className="h-3.5 w-3.5" /> QR activo
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Sin QR</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Col 2: DNI */}
                                    <div className="tabular-nums text-black">{c.dni}</div>

                                    {/* Col 3: Teléfono */}
                                    <div className="truncate text-black">
                                        {c.telefono || <span className="text-gray-500">—</span>}
                                    </div>

                                    {/* Col 4: Puntos */}
                                    <div className="font-extrabold tabular-nums text-red-600">{c.puntos ?? 0} pts.</div>

                                    {/* Col 5: Acciones */}
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-black
                                 hover:border-red-300 hover:bg-red-50 transition"
                                            onClick={() => setEditing(c)}
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="text-sm font-medium">Editar</span>
                                        </button>
                                        <button
                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition"
                                            onClick={() => setToDelete(c)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="text-sm font-semibold">Eliminar</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Página {page} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-red-50 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                        >
                            Anterior
                        </button>
                        <button
                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-red-50 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>

                {/* MODAL: editar */}
                {editing && (
                    <EditClientModal
                        client={editing}
                        onClose={() => setEditing(null)}
                        onSaved={(updated) => {
                            setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                            setEditing(null);
                        }}
                    />
                )}

                {/* MODAL: eliminar */}
                {toDelete && (
                    <ConfirmDelete
                        client={toDelete}
                        onCancel={() => setToDelete(null)}
                        onConfirm={async () => {
                            try {
                                const res = await fetch(`/api/admin/clientes/${toDelete.id}`, {
                                    method: "DELETE",
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(data?.error || "No se pudo eliminar");
                                setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
                                setToDelete(null);
                            } catch (e: any) {
                                alert(e?.message || "Error eliminando");
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
  Modal de edición (estilo blanco + rojo)
────────────────────────────────────────────── */
function EditClientModal({
    client,
    onClose,
    onSaved,
}: {
    client: Client;
    onClose: () => void;
    onSaved: (updated: Client) => void;
}) {
    const [form, setForm] = useState<Client>({ ...client });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    async function handleSave() {
        setSaving(true);
        setErr("");
        try {
            const res = await fetch(`/api/admin/clientes/${client.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: form.nombre,
                    apellido: form.apellido,
                    dni: form.dni,
                    telefono: form.telefono,
                    puntos: Number(form.puntos ?? 0),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "No se pudo guardar");
            onSaved(data.client || form);
        } catch (e: any) {
            setErr(e?.message || "Error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                    <h3 className="font-bold text-lg text-black">Editar cliente</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nombre">
                            <input
                                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            />
                        </Field>
                        <Field label="Apellido">
                            <input
                                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={form.apellido}
                                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                            />
                        </Field>
                        <Field label="DNI">
                            <input
                                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black tabular-nums
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={form.dni}
                                inputMode="numeric"
                                onChange={(e) =>
                                    setForm({ ...form, dni: e.target.value.replace(/[^\d]/g, "") })
                                }
                            />
                        </Field>
                        <Field label="Teléfono">
                            <input
                                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={form.telefono || ""}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            />
                        </Field>
                        <Field label="Puntos">
                            <input
                                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-black tabular-nums
                           focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={String(form.puntos ?? 0)}
                                inputMode="numeric"
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        puntos: Number(e.target.value.replace(/[^\d-]/g, "")) || 0,
                                    })
                                }
                            />
                        </Field>
                    </div>

                    {err && <div className="text-sm text-red-600">{err}</div>}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 h-11 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 h-11 rounded-lg bg-red-600 
                         text-white font-semibold disabled:opacity-60 hover:bg-red-500 transition"
                        >
                            <Save className="h-4 w-4" />
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
  Modal confirmación de borrado (blanco + rojo)
────────────────────────────────────────────── */
function ConfirmDelete({
    client,
    onCancel,
    onConfirm,
}: {
    client: Client;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const handle = async () => {
        setBusy(true);
        setErr("");
        try {
            await onConfirm();
        } catch (e: any) {
            setErr(e?.message || "Error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="px-5 py-3 border-b border-gray-200 font-bold text-red-600">
                    Eliminar cliente
                </div>
                <div className="p-6 space-y-4 text-black">
                    <p>
                        ¿Eliminar a <b>{client.apellido}, {client.nombre}</b> (DNI {client.dni})?
                    </p>
                    {err && <div className="text-sm text-red-600">{err}</div>}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 h-11 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handle}
                            disabled={busy}
                            className="px-4 h-11 rounded-lg bg-red-600 hover:bg-red-500 text-white 
                         disabled:opacity-60 transition"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">{label}</span>
            {children}
        </label>
    );
}
