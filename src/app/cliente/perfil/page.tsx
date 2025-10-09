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
                    confirmButtonColor: "#dc2626",
                });
            } finally {
                setLoading(false);
            }
        })();

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
                text: "Tus datos se guardaron correctamente.",
                confirmButtonColor: "#dc2626",
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#dc2626",
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
                confirmButtonColor: "#dc2626",
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setResetting(false);
        }
    }

    const handleUpdateApp = async () => {
        try {
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                await caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
            }
            window.location.reload();
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
            <p className="p-6 text-center text-red-600 font-semibold">
                No se pudo cargar el perfil.
            </p>
        );
    }

    return (
        <div className="max-w-lg mx-auto py-10 px-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
                <h1 className="text-3xl font-extrabold text-center text-black mb-6">
                    Mi Perfil
                </h1>

                <form onSubmit={handleSave} className="space-y-5">
                    {/* DNI */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            DNI
                        </label>
                        <input
                            value={perfil.dni}
                            disabled
                            className="w-full h-12 px-3 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200"
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre
                        </label>
                        <input
                            value={perfil.nombre}
                            onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Apellido */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apellido
                        </label>
                        <input
                            value={perfil.apellido}
                            onChange={(e) => setPerfil({ ...perfil, apellido: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <input
                            value={perfil.telefono}
                            onChange={(e) =>
                                setPerfil({ ...perfil, telefono: e.target.value })
                            }
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email (opcional)
                        </label>
                        <input
                            type="email"
                            value={perfil.email || ""}
                            onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            placeholder="ejemplo@correo.com"
                        />
                    </div>

                    {/* Fecha de nacimiento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Nacimiento (opcional)
                        </label>
                        <input
                            type="date"
                            value={
                                perfil.fechaNacimiento
                                    ? perfil.fechaNacimiento.slice(0, 10)
                                    : ""
                            }
                            onChange={(e) =>
                                setPerfil({ ...perfil, fechaNacimiento: e.target.value })
                            }
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Botones */}
                    <div className="space-y-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white shadow-sm transition disabled:opacity-60"
                        >
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </button>

                        <button
                            type="button"
                            onClick={handleRequestReset}
                            disabled={resetting}
                            className="w-full h-12 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
                        >
                            {resetting ? "Enviando..." : "Cambiar contraseña"}
                        </button>

                        {showUpdateBtn && (
                            <button
                                type="button"
                                onClick={handleUpdateApp}
                                className="w-full h-12 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold shadow-sm transition"
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
