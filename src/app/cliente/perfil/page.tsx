"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";

type Perfil = {
    username: string;           // 👈 IDENTIDAD (readonly)
    nombre: string;
    apellido: string;
    dni?: string;               // 👈 EDITABLE
    telefono?: string;
    email?: string;
    fechaNacimiento?: string;
    direccion?: string;
};

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Error al cargar perfil");
                setPerfil(data);
            } catch (err: any) {
                swalBase.fire({
                    icon: "error",
                    title: "Error",
                    text: err.message,
                    confirmButtonColor: "#dc2626",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!perfil) return;

        setSaving(true);
        try {
            const res = await fetch("/api/cliente/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: perfil.nombre,
                    apellido: perfil.apellido,
                    dni: perfil.dni,
                    telefono: perfil.telefono,
                    email: perfil.email,
                    fechaNacimiento: perfil.fechaNacimiento,
                    direccion: perfil.direccion,
                }),
            });

            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};

            if (!res.ok) {
                // si el backend manda status 409, lo mostramos claro
                if (res.status === 409) {
                    throw new Error(data.error || "Ese email ya está en uso");
                }
                throw new Error(data.error || "Error al guardar");
            }

            swalBase.fire({
                icon: "success",
                title: "Perfil actualizado",
                text: "Tus datos se guardaron correctamente.",
                confirmButtonColor: "#dc2626",
            });
        } catch (err: any) {
            swalBase.fire({
                icon: "error",
                title: "Error",
                text: err.message,
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleRequestReset() {
        if (!perfil?.email) {
            swalBase.fire({
                icon: "warning",
                title: "Email requerido",
                text: "Agregá tu email para poder cambiar la contraseña.",
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

            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok) throw new Error(data.error || "Error al solicitar cambio");

            swalBase.fire({
                icon: "success",
                title: "Correo enviado",
                text: `Revisá ${perfil.email} para cambiar tu contraseña.`,
                confirmButtonColor: "#dc2626",
            });
        } catch (err: any) {
            swalBase.fire({
                icon: "error",
                title: "Error",
                text: err.message,
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setResetting(false);
        }
    }

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
        <div className="max-w-lg mx-auto py-10 px-6 bg-white min-h-screen">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
                <h1 className="text-4xl font-extrabold mb-6 text-center text-black">
                    Mi Perfil
                </h1>

                <form onSubmit={handleSave} className="space-y-5">

                    {/* Username (readonly) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Usuario
                        </label>
                        <input
                            value={`@${perfil.username}`}
                            disabled
                            className="w-full h-12 px-3 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed border border-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Este es tu identificador único y no se puede cambiar.
                        </p>
                    </div>

                    {/* DNI (editable) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            DNI (opcional)
                        </label>
                        <input
                            value={perfil.dni || ""}
                            inputMode="numeric"
                            onChange={(e) =>
                                setPerfil({
                                    ...perfil,
                                    dni: e.target.value.replace(/\D/g, ""),
                                })
                            }
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                            placeholder="Solo números"
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre
                        </label>
                        <input
                            value={perfil.nombre}
                            onChange={(e) =>
                                setPerfil({ ...perfil, nombre: e.target.value })
                            }
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
                            onChange={(e) =>
                                setPerfil({ ...perfil, apellido: e.target.value })
                            }
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <input
                            value={perfil.telefono || ""}
                            onChange={(e) =>
                                setPerfil({ ...perfil, telefono: e.target.value })
                            }
                            className="w-full h-12 px-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email (para recuperar contraseña)
                        </label>
                        <input
                            type="email"
                            value={perfil.email || ""}
                            onChange={(e) =>
                                setPerfil({ ...perfil, email: e.target.value })
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
                            className="w-full h-12 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
                        >
                            {resetting ? "Enviando..." : "Cambiar contraseña"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
