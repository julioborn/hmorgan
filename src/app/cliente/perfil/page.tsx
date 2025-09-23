// src/app/cliente/perfil/page.tsx
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
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    // cargar datos al montar
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
                const data = await res.json();
                if (res.ok) setPerfil(data);
                else setError(data.error || "Error al cargar perfil");
            } catch {
                setError("Error de red");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!perfil) return;
        setSaving(true);
        setError(null);
        setOk(false);
        try {
            const res = await fetch("/api/cliente/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(perfil),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al guardar");
            setOk(true);
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
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleRequestReset() {
        if (!perfil?.email) {
            Swal.fire({
                icon: "warning",
                title: "Email requerido",
                text: "Debes ingresar tu email en el perfil para poder cambiar la contraseña.",
                confirmButtonColor: "#f59e0b",
            });
            return;
        }

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
                text: `Se ha enviado un correo a ${perfil.email} con instrucciones para cambiar tu contraseña.`,
                confirmButtonColor: "#10b981",
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "❌ Error",
                text: err.message,
                confirmButtonColor: "#ef4444",
            });
        }
    }

    if (loading) {
        return (
            <div className="py-10 flex justify-center">
                <Loader size={48} />
            </div>
        );
    }

    if (!perfil) {
        return (
            <p className="p-6 text-center text-rose-400">
                {error || "No se pudo cargar el perfil."}
            </p>
        );
    }

    return (
        <div className="max-w-md mx-auto py-10 px-4">
            <h1 className="text-2xl font-extrabold text-center mb-6">Mi Perfil</h1>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1">DNI</label>
                    <input
                        value={perfil.dni}
                        disabled
                        className="w-full p-3 rounded bg-white/10 text-gray-400 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Nombre</label>
                    <input
                        value={perfil.nombre}
                        onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Apellido</label>
                    <input
                        value={perfil.apellido}
                        onChange={(e) => setPerfil({ ...perfil, apellido: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Teléfono</label>
                    <input
                        value={perfil.telefono}
                        onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Email (opcional)</label>
                    <input
                        type="email"
                        value={perfil.email || ""}
                        onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                        placeholder="ejemplo@correo.com"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Fecha de Nacimiento (opcional)</label>
                    <input
                        type="date"
                        value={perfil.fechaNacimiento ? perfil.fechaNacimiento.slice(0, 10) : ""}
                        onChange={(e) =>
                            setPerfil({ ...perfil, fechaNacimiento: e.target.value })
                        }
                        className="w-full p-3 rounded bg-white/10 focus:outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60"
                >
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>

                <button
                    type="button"
                    onClick={handleRequestReset}
                    className="w-full py-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                    Cambiar contraseña
                </button>
            </form>
        </div>
    );
}
