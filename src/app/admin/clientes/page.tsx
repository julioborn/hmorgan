"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { QrCode, Pencil, Trash2, X, Save } from "lucide-react";

type Client = {
    id: string;         // si en tu API viene _id, cambialo en fetch/PUT/DELETE
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string;
    puntos?: number;
    qrToken?: string;
};

// ————————————————————————————————————————————————————————
// Utilidades
const container =
    "mx-auto w-full max-w-screen-sm md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8";

const PAGE_SIZE = 20;

function classNames(...xs: (string | false | null | undefined)[]) {
    return xs.filter(Boolean).join(" ");
}

function useDebouncedValue<T>(value: T, delay = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

// ————————————————————————————————————————————————————————
// Página
export default function AdminClientsPage() {
    const { user, loading: authLoading } = useAuth();
    const isAdmin = user?.role === "admin";

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<"nombre" | "apellido" | "dni" | "puntos">("apellido");
    const [dir, setDir] = useState<"asc" | "desc">("asc");

    const debouncedQ = useDebouncedValue(q, 350);

    const [items, setItems] = useState<Client[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    const [editing, setEditing] = useState<Client | null>(null);
    const [toDelete, setToDelete] = useState<Client | null>(null);

    // Reset a página 1 al cambiar búsqueda
    useEffect(() => { setPage(1); }, [debouncedQ]);

    // Fetch
    useEffect(() => {
        if (authLoading || !isAdmin) return;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const url = new URL("/api/admin/clientes", window.location.origin);
                url.searchParams.set("q", debouncedQ);
                url.searchParams.set("page", String(page));
                url.searchParams.set("limit", String(PAGE_SIZE));
                url.searchParams.set("sort", `${sort}:${dir}`);

                const res = await fetch(url.toString(), {
                    cache: "no-store",
                    credentials: "include",
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

                if (!cancelled) { setItems(data.items || []); setTotal(data.total || 0); }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Error de red");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [authLoading, isAdmin, debouncedQ, page, sort, dir]);

    // ✅ SOLO UN PAR DE GUARDS
    if (authLoading) {
        return <div className={`${container} py-8`}><h1 className="text-2xl font-extrabold">Clientes</h1><p className="opacity-80">Cargando…</p></div>;
    }
    if (!isAdmin) {
        return <div className={`${container} py-8`}><h1 className="text-2xl font-extrabold">Acceso restringido</h1><p className="opacity-80">Solo administradores.</p></div>;
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

    // ————————————————————————————————————————————————————
    return (
        <div className={`${container} py-8 space-y-6`}>
            {/* Header */}
            <header className="space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                    Clientes
                </h1>
                <p className="opacity-80 max-w-2xl">
                    Ver, editar y administrar clientes. {total ? `(${total} en total)` : ""}
                </p>
            </header>

            {/* Barra de acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            className="w-72 max-w-[90vw] rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                            placeholder="Buscar por nombre o DNI…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <label className="opacity-70">Ordenar por</label>
                    <select
                        value={`${sort}:${dir}`}
                        onChange={(e) => {
                            const [s, d] = e.target.value.split(":") as any;
                            setSort(s);
                            setDir(d);
                        }}
                        className="
    rounded-lg px-2 py-2 ring-1 ring-inset ring-white/10
    focus:ring-2 focus:ring-emerald-500/70
    bg-white text-zinc-900
    [color-scheme:light]   /* fuerza controles claros en Android/Chrome */
  "
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
            <div className="rounded-2xl border border-white/10 overflow-hidden">
                {/* head */}
                <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_0.8fr_120px] items-center gap-3 px-4 py-2 bg-white/[0.04] text-sm">
                    <button onClick={() => toggleSort("apellido")} className="text-left font-semibold">
                        Cliente
                    </button>
                    <button onClick={() => toggleSort("dni")} className="text-left font-semibold">DNI</button>
                    <div className="font-semibold">Teléfono</div>
                    <button onClick={() => toggleSort("puntos")} className="text-left font-semibold">
                        Puntos
                    </button>
                    <div className="text-right font-semibold pr-1">Acciones</div>
                </div>

                {/* body */}
                {loading ? (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-14 rounded-xl bg-white/5 border border-white/10 animate-pulse"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-4 text-rose-300">{error}</div>
                ) : items.length === 0 ? (
                    <div className="p-6 opacity-70">Sin resultados.</div>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {items.map((c) => (
                            <li key={c.id} className="px-4 py-3">
                                {/* fila desktop */}
                                <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_0.8fr_120px] items-center gap-3">
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">
                                            {c.apellido}, {c.nombre}
                                        </div>
                                        <div className="text-xs opacity-70 truncate">
                                            {c.qrToken ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <QrCode className="h-3.5 w-3.5" /> QR activo
                                                </span>
                                            ) : (
                                                <span className="opacity-60">Sin QR</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="tabular-nums">{c.dni}</div>
                                    <div className="truncate">{c.telefono || <span className="opacity-60">—</span>}</div>
                                    <div className="font-bold tabular-nums">{c.puntos ?? 0}</div>

                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
                                            onClick={() => setEditing(c)}
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 text-sm"
                                            onClick={() => setToDelete(c)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                {/* tarjeta mobile */}
                                <div className="md:hidden">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold">
                                                {c.apellido}, {c.nombre}
                                            </div>
                                            <div className="text-xs opacity-70">DNI {c.dni}</div>
                                            <div className="text-xs opacity-70">
                                                {c.telefono ? `Tel. ${c.telefono}` : "Sin teléfono"}
                                            </div>
                                            <div className="mt-1 font-bold tabular-nums">
                                                {c.puntos ?? 0} pts
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col gap-1">
                                            <button
                                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-sm"
                                                onClick={() => setEditing(c)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 text-sm"
                                                onClick={() => setToDelete(c)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between">
                <div className="text-sm opacity-70">
                    Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                    >
                        Anterior
                    </button>
                    <button
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50"
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
                            const res = await fetch(`/api/admin/clientes/${toDelete.id}`, { method: "DELETE" });
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
    );
}

// ————————————————————————————————————————————————————————
// Modal de edición
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-bold">Editar cliente</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Nombre">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            />
                        </Field>
                        <Field label="Apellido">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.apellido}
                                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                            />
                        </Field>
                        <Field label="DNI">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 tabular-nums"
                                value={form.dni}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/[^\d]/g, "") })}
                            />
                        </Field>
                        <Field label="Teléfono">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.telefono || ""}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            />
                        </Field>
                        <Field label="Puntos">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 tabular-nums"
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

                    {err && <div className="text-sm text-rose-300">{err}</div>}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-60"
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

// ————————————————————————————————————————————————————————
// Modal confirmación de borrado
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur" onClick={onCancel} />
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950">
                <div className="px-4 py-3 border-b border-white/10 font-bold">Eliminar cliente</div>
                <div className="p-4 space-y-3">
                    <p>
                        ¿Eliminar a <b>{client.apellido}, {client.nombre}</b> (DNI {client.dni})?
                    </p>
                    {err && <div className="text-sm text-rose-300">{err}</div>}
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">
                            Cancelar
                        </button>
                        <button
                            onClick={handle}
                            disabled={busy}
                            className="px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white disabled:opacity-60"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ————————————————————————————————————————————————————————
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs opacity-70">{label}</span>
            {children}
        </label>
    );
}
