"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import Swal from "sweetalert2";

type Perfil = {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email?: string;
    fechaNacimiento?: string;
};

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showUpdateBtn, setShowUpdateBtn] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
                const data = await res.json();
                if (res.ok) setPerfil(data);
                else throw new Error(data.error || "Error al cargar perfil");
            } catch (err: any) {
                Swal.fire({
                    icon: "error",
                    title: "❌ Error",
                    text: err.message || "Error de red",
                    confirmButtonColor: "#ef4444",
                });
            } finally {
                setLoading(false);
            }
        })();

        // 🔄 Detectar nueva versión del Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                if (!reg) return;
                reg.addEventListener("updatefound", () => {
                    setShowUpdateBtn(true);
                });
            });
        }
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!perfil) return;

        setSaving(true);
        try {
            const res = await fetch("/api/cliente/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(perfil),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al guardar");

            Swal.fire({
                icon: "success",
                title: "✅ Perfil actualizado",
                text: "Tus datos se guardaron correctamente",
                confirmButtonColor: "#10b981",
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#ef4444",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleRequestReset() {
        if (!perfil?.email) {
            Swal.fire({
                icon: "warning",
                title: "⚠️ Email requerido",
                text: "Debes ingresar tu email en el perfil para cambiar la contraseña.",
                confirmButtonColor: "#f59e0b",
            });
            return;
        }

        setResetting(true);
        try {
            const res = await fetch("/api/auth/request-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: perfil.email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al solicitar cambio");

            Swal.fire({
                icon: "success",
                title: "📧 Correo enviado",
                text: `Revisa ${perfil.email} para cambiar tu contraseña.`,
                confirmButtonColor: "#10b981",
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#ef4444",
            });
        } finally {
            setResetting(false);
        }
    }

    // 🔁 Botón para actualizar la app manualmente
    const handleUpdateApp = async () => {
        try {
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                await caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
            }
            window.location.reload(); // ✅ sin argumentos
        } catch (err) {
            console.error("Error al actualizar:", err);
            window.location.reload();
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader size={48} />
            </div>
        );
    }

    if (!perfil) {
        return (
            <p className="p-6 text-center text-rose-400">
                No se pudo cargar el perfil.
            </p>
        );
    }

    return (
        <div className="max-w-lg mx-auto py-10 px-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur shadow-xl p-6">
                <h1 className="text-3xl font-extrabold text-center mb-6">
                    Mi Perfil
                </h1>

                <form onSubmit={handleSave} className="space-y-5">
                    {/* DNI */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">DNI</label>
                        <input
                            value={perfil.dni}
                            disabled
                            className="w-full h-12 px-3 rounded-xl bg-white/10 text-gray-400 cursor-not-allowed"
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Nombre</label>
                        <input
                            value={perfil.nombre}
                            onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-white/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Apellido */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Apellido</label>
                        <input
                            value={perfil.apellido}
                            onChange={(e) => setPerfil({ ...perfil, apellido: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-white/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
                        <input
                            value={perfil.telefono}
                            onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-white/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Email (opcional)
                        </label>
                        <input
                            type="email"
                            value={perfil.email || ""}
                            onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-white/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="ejemplo@correo.com"
                        />
                    </div>

                    {/* Fecha de nacimiento */}
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Fecha de Nacimiento (opcional)
                        </label>
                        <input
                            type="date"
                            value={perfil.fechaNacimiento ? perfil.fechaNacimiento.slice(0, 10) : ""}
                            onChange={(e) => setPerfil({ ...perfil, fechaNacimiento: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-white/10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Botones */}
                    <div className="space-y-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white disabled:opacity-60"
                        >
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </button>

                        <button
                            type="button"
                            onClick={handleRequestReset}
                            disabled={resetting}
                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white disabled:opacity-60"
                        >
                            {resetting ? "Enviando..." : "Cambiar contraseña"}
                        </button>

                        {showUpdateBtn && (
                            <button
                                type="button"
                                onClick={handleUpdateApp}
                                className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white"
                            >
                                🔄 Actualizar aplicación
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
