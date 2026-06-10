"use client";
import { useEffect, useState } from "react";
import ReservasManager from "@/components/ReservasManager";

export default function SuperAdminReservasPage() {
    const [activo, setActivo] = useState(true);

    useEffect(() => {
        fetch("/api/config/reservas").then(r => r.json()).then(d => setActivo(d.activo ?? true));
    }, []);

    async function toggleActivo() {
        const next = !activo;
        setActivo(next);
        await fetch("/api/config/reservas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: next }) });
    }

    return (
        <div className="min-h-screen pb-16">
            <div className="max-w-3xl mx-auto px-4">
                <h1 className="text-3xl font-extrabold mb-3 text-center text-black">Reservas</h1>

                <div className="flex justify-center items-center gap-3 mb-6">
                    <span className={`text-sm font-semibold ${activo ? "text-gray-900" : "text-gray-400"}`}>
                        Reservas {activo ? "activas" : "desactivadas"}
                    </span>
                    <button
                        onClick={toggleActivo}
                        className={`relative flex h-6 w-10 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${activo ? "bg-red-500" : "bg-gray-300"}`}
                    >
                        <span className={`absolute h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${activo ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>

                <ReservasManager />
            </div>
        </div>
    );
}
