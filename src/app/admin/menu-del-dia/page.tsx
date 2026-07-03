"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, Eye, EyeOff, Save, Loader2, ImageIcon } from "lucide-react";

type MenuDia = {
    _id?: string;
    titulo: string;
    descripcion: string;
    imagen: string | null;
    precio: number | null;
    activo: boolean;
};

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

export default function MenuDelDiaPage() {
    const [doc, setDoc] = useState<MenuDia>({ titulo: "Menú del Día", descripcion: "", imagen: null, precio: null, activo: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/superadmin/menu-del-dia", { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d) setDoc(d); })
            .finally(() => setLoading(false));
    }, []);

    async function save() {
        setSaving(true);
        try {
            const res = await fetch("/api/superadmin/menu-del-dia", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    titulo: doc.titulo,
                    descripcion: doc.descripcion,
                    precio: doc.precio,
                    activo: doc.activo,
                }),
            });
            const updated = await res.json();
            setDoc(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally { setSaving(false); }
    }

    async function toggleActivo() {
        const nuevo = !doc.activo;
        setDoc(d => ({ ...d, activo: nuevo }));
        await fetch("/api/superadmin/menu-del-dia", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ activo: nuevo }),
        });
    }

    async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/superadmin/menu-del-dia/imagen", {
                method: "POST",
                credentials: "include",
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.error || `Error ${res.status}`);
                return;
            }
            if (data.url) setDoc(d => ({ ...d, imagen: data.url }));
        } catch (err: any) {
            setUploadError(err?.message || "Error al subir la imagen");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    if (loading) return (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
    );

    return (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>

            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin" className="p-2 rounded-full hover:bg-gray-100 transition">
                    <ChevronLeft size={22} className="text-gray-700" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-black tracking-tight">Menú del Día</h1>
                    <p className="text-sm text-gray-400">Visible en el menú público</p>
                </div>
                {/* Toggle rápido */}
                <button
                    onClick={toggleActivo}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${doc.activo ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {doc.activo ? <><Eye size={15} /> Visible</> : <><EyeOff size={15} /> Oculto</>}
                </button>
            </div>

            {/* Imagen */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {doc.imagen ? (
                    <div className="relative">
                        <img src={doc.imagen} alt="Menú del día" className="w-full h-56 object-cover" />
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-black transition">
                            <Upload size={13} /> Cambiar foto
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full h-48 flex flex-col items-center justify-center gap-3 text-gray-400 hover:bg-gray-50 transition">
                        <ImageIcon size={40} className="opacity-30" />
                        <span className="text-sm font-semibold">{uploading ? "Subiendo..." : "Subir foto"}</span>
                    </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
                {uploadError && (
                    <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs text-red-600 font-semibold bg-red-50">
                        Error: {uploadError}
                    </div>
                )}
                {uploading && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
                        <Loader2 size={14} className="animate-spin" /> Subiendo imagen...
                    </div>
                )}
            </div>

            {/* Formulario */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Título</label>
                    <input
                        value={doc.titulo}
                        onChange={e => setDoc(d => ({ ...d, titulo: e.target.value }))}
                        placeholder="Menú del Día"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Descripción</label>
                    <textarea
                        value={doc.descripcion}
                        onChange={e => setDoc(d => ({ ...d, descripcion: e.target.value }))}
                        placeholder="Ej: Milanesa de pollo con papas fritas y ensalada mixta..."
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Precio (opcional)</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <span className="px-3 text-gray-400 font-bold text-sm">$</span>
                        <input
                            type="number" min="0"
                            value={doc.precio ?? ""}
                            onChange={e => setDoc(d => ({ ...d, precio: e.target.value === "" ? null : Number(e.target.value) }))}
                            placeholder="0"
                            className="flex-1 py-2.5 text-sm focus:outline-none pr-3" />
                    </div>
                    {doc.precio && <p className="text-xs text-gray-400 mt-1">{fmt(doc.precio)}</p>}
                </div>
            </div>

            {/* Preview */}
            {(doc.titulo || doc.descripcion || doc.imagen) && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">Vista previa</p>
                    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                        {doc.imagen && <img src={doc.imagen} alt="preview" className="w-full h-40 object-cover" />}
                        <div className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-black text-gray-900">{doc.titulo || "Menú del Día"}</p>
                                    {doc.descripcion && <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{doc.descripcion}</p>}
                                </div>
                                {doc.precio && (
                                    <p className="text-base font-black text-black shrink-0">{fmt(doc.precio)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Guardar */}
            <button
                onClick={save}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-black py-4 rounded-2xl transition hover:bg-gray-800 disabled:opacity-60 active:scale-[0.98]">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar cambios"}
            </button>
        </div>
    );
}
