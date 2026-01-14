"use client";

import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function EliminarCuenta() {
    const router = useRouter();

    const eliminarCuenta = async () => {
        const result = await Swal.fire({
            title: "¿Eliminar cuenta?",
            text: "Esta acción es permanente y no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626",
        });

        if (!result.isConfirmed) return;

        const res = await fetch("/api/account", {
            method: "DELETE",
        });

        if (res.ok) {
            await Swal.fire({
                title: "Cuenta eliminada",
                text: "Tu cuenta fue eliminada correctamente.",
                icon: "success",
            });

            router.push("/login");
        } else {
            Swal.fire({
                title: "Error",
                text: "No se pudo eliminar la cuenta.",
                icon: "error",
            });
        }
    };

    return (
        <main className="max-w-xl mx-auto px-6 py-16 text-gray-900">
            <h1 className="text-3xl font-semibold mb-6">
                Eliminación de cuenta – HMorgan
            </h1>

            <p className="mb-6">
                Podés eliminar tu cuenta y todos los datos asociados en cualquier
                momento. Esta acción es <strong>irreversible</strong>.
            </p>

            <button
                onClick={eliminarCuenta}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition"
            >
                Eliminar mi cuenta definitivamente
            </button>

            <p className="mt-6 text-sm text-gray-500">
                Si necesitás ayuda adicional, podés contactarnos en
                <br />
                <strong>julio@estudioborn.com.ar</strong>
            </p>
        </main>
    );
}
