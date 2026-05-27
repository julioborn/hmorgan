"use client";
import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowUp, ArrowDown, Upload, ImageIcon } from "lucide-react";
import { swalBase } from "@/lib/swalConfig";
import Loader from "@/components/Loader";

type CarouselImg = { _id: string; url: string; filename: string; orden: number };

export default function CarrouselAdminPage() {
    const [images, setImages] = useState<CarouselImg[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchImages = async () => {
        const res = await fetch("/api/carousel", { cache: "no-store" });
        const data = await res.json();
        setImages(data);
        setLoading(false);
    };

    useEffect(() => { fetchImages(); }, []);

    const move = async (index: number, dir: -1 | 1) => {
        const newImages = [...images];
        const target = index + dir;
        if (target < 0 || target >= newImages.length) return;
        [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
        const reordered = newImages.map((img, i) => ({ ...img, orden: i }));
        setImages(reordered);

        await fetch("/api/carousel", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orden: reordered.map(({ _id, orden }) => ({ _id, orden })) }),
        });
    };

    const handleDelete = async (img: CarouselImg) => {
        const result = await swalBase.fire({
            icon: "warning",
            title: "¿Eliminar imagen?",
            text: "Esta acción no se puede deshacer.",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed) return;

        const res = await fetch(`/api/carousel/${img._id}`, { method: "DELETE" });
        if (res.ok) {
            setImages((prev) => prev.filter((i) => i._id !== img._id));
        } else {
            swalBase.fire({ icon: "error", title: "Error al eliminar" });
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/carousel", { method: "POST", body: form });
        if (res.ok) {
            await fetchImages();
            swalBase.fire({ icon: "success", title: "Imagen subida", timer: 1500, showConfirmButton: false });
        } else {
            swalBase.fire({ icon: "error", title: "Error al subir la imagen" });
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold">Fotos</h1>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                    {uploading ? <Loader size={18} /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Subiendo..." : "Subir foto"}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                />
            </div>

            {images.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <ImageIcon className="mx-auto mb-3 h-12 w-12 opacity-40" />
                    <p>No hay imágenes en el carrusel.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {images.map((img, i) => (
                        <li
                            key={img._id}
                            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 shadow-sm"
                        >
                            <img
                                src={img.url}
                                alt={img.filename}
                                className="h-20 w-28 object-cover rounded-lg flex-shrink-0"
                            />
                            <p className="flex-1 text-xs text-gray-500 truncate">{img.filename}</p>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => move(i, -1)}
                                    disabled={i === 0}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                                    title="Subir"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => move(i, 1)}
                                    disabled={i === images.length - 1}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                                    title="Bajar"
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => handleDelete(img)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                                title="Eliminar"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
