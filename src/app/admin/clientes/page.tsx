"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { QrCode, Pencil, Trash2, X, Save } from "lucide-react";

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
    const [sort, setSort] = useState<"nombre" | "apellido" | "dni" | "puntos">("apellido");
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
            <div className={`${container} py-8`}>
                <h1 className="text-2xl font-extrabold">Clientes</h1>
                <p className="opacity-80">Cargando…</p>
            </div>
        );
    }
    if (!isAdmin) {
        return (
            <div className={`${container} py-8`}>
                <h1 className="text-2xl font-extrabold">Acceso restringido</h1>
                <p className="opacity-80">Solo administradores.</p>
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

    return (
        <div className={`${container} py-8 space-y-6`}>
            {/* Header */}
            <header className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl font-extrabold bg-white bg-clip-text text-transparent">
                    Clientes
                </h1>
                {/* <p className="opacity-80 max-w-2xl mx-auto md:mx-0">
                    Ver, editar y administrar clientes. {total ? `(${total} en total)` : ""}
                </p> */}
            </header>

            {/* Barra de acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <input
                        className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none ring-1 ring-inset ring-white/10 
                       focus:ring-2 focus:ring-emerald-500/70 placeholder-white/50"
                        placeholder="🔍 Buscar por nombre o DNI…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <label className="opacity-70">Ordenar</label>
                    <select
                        value={`${sort}:${dir}`}
                        onChange={(e) => {
                            const [s, d] = e.target.value.split(":") as any;
                            setSort(s);
                            setDir(d);
                        }}
                        className="rounded-lg px-3 py-2 ring-1 ring-inset ring-white/10
                       focus:ring-2 focus:ring-emerald-500/70 bg-white text-zinc-900
                       font-medium shadow-sm"
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
                <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_0.8fr_140px] items-center gap-3 px-4 py-2 bg-white/[0.04] text-sm font-semibold">
                    <button onClick={() => toggleSort("apellido")} className="text-left">
                        Cliente
                    </button>
                    <button onClick={() => toggleSort("dni")} className="text-left">
                        DNI
                    </button>
                    <div>Teléfono</div>
                    <button onClick={() => toggleSort("puntos")} className="text-left">
                        Puntos
                    </button>
                    <div className="text-right pr-1">Acciones</div>
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
                            <li
                                key={c.id}
                                className="px-4 py-3 transition hover:bg-white/5 rounded-xl flex flex-col md:grid md:grid-cols-[1.6fr_1fr_1fr_0.8fr_140px] md:items-center gap-3"
                            >
                                <div className="min-w-0">
                                    <div className="font-semibold truncate">
                                        {c.apellido}, {c.nombre}
                                    </div>
                                    <div className="text-xs opacity-70 truncate flex items-center gap-1">
                                        {c.qrToken ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                                <QrCode className="h-3.5 w-3.5" /> QR activo
                                            </span>
                                        ) : (
                                            <span className="opacity-60">Sin QR</span>
                                        )}
                                    </div>
                                </div>
                                <div className="tabular-nums">{c.dni}</div>
                                <div className="truncate">{c.telefono || <span className="opacity-60">—</span>}</div>
                                <div className="font-bold tabular-nums text-emerald-400">{c.puntos ?? 0}</div>

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                        onClick={() => setEditing(c)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                        </svg>
                                    </button>
                                    <button
                                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500"
                                        onClick={() => setToDelete(c)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
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
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 
                      bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-bold text-lg text-emerald-400">Editar cliente</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Nombre">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none 
                           ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            />
                        </Field>
                        <Field label="Apellido">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none 
                           ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.apellido}
                                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                            />
                        </Field>
                        <Field label="DNI">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none 
                           ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 tabular-nums"
                                value={form.dni}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/[^\d]/g, "") })}
                            />
                        </Field>
                        <Field label="Teléfono">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none 
                           ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70"
                                value={form.telefono || ""}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            />
                        </Field>
                        <Field label="Puntos">
                            <input
                                className="w-full rounded-xl bg-white/10 px-3 py-2.5 outline-none 
                           ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-500/70 tabular-nums"
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
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 
                         text-white font-semibold disabled:opacity-60 hover:bg-emerald-500 transition"
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
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 
                      bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
                <div className="px-4 py-3 border-b border-white/10 font-bold text-rose-400">
                    Eliminar cliente
                </div>
                <div className="p-6 space-y-4">
                    <p>
                        ¿Eliminar a <b>{client.apellido}, {client.nombre}</b> (DNI {client.dni})?
                    </p>
                    {err && <div className="text-sm text-rose-300">{err}</div>}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handle}
                            disabled={busy}
                            className="px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white 
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

// ————————————————————————————————————————————————————————
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-xs opacity-70">{label}</span>
            {children}
        </label>
    );
}
