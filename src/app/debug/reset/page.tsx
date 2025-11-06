"use client";

import { useState } from "react";

export default function DebugResetPage() {
    const [log, setLog] = useState<string>("");

    async function hardResetPWA() {
        setLog("🧹 Limpiando instalación...");

        try {
            // 1️⃣ Desregistrar todos los Service Workers
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                setLog((p) => p + "\n✅ Service Workers eliminados.");
            }

            // 2️⃣ Borrar caches
            const keys = await caches.keys();
            for (const key of keys) await caches.delete(key);
            setLog((p) => p + "\n✅ Caches borrados.");

            // 3️⃣ Limpiar almacenamiento local
            localStorage.clear();
            sessionStorage.clear();
            setLog((p) => p + "\n✅ Storage limpio.");

            // 4️⃣ (Opcional) Limpiar IndexedDB
            const dbs = await indexedDB.databases?.();
            if (dbs) {
                for (const db of dbs) {
                    if (db.name) indexedDB.deleteDatabase(db.name);
                }
                setLog((p) => p + "\n✅ IndexedDB eliminado.");
            }

            // 5️⃣ Forzar recarga total
            setLog((p) => p + "\n🔁 Recargando...");
            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } catch (err) {
            console.error("Error durante limpieza:", err);
            setLog((p) => p + `\n❌ Error: ${err}`);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100 text-center space-y-6">
            <h1 className="text-2xl font-bold text-red-600">Modo Técnico / Reset PWA</h1>
            <p className="text-gray-700 max-w-md">
                Esta herramienta elimina todos los datos locales, cache y Service Workers de esta instalación.
            </p>

            <button
                onClick={hardResetPWA}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-md transition-all"
            >
                🔧 Limpiar instalación y recargar
            </button>

            {log && (
                <pre className="mt-4 text-left bg-black text-green-400 p-4 rounded-lg w-full max-w-md overflow-auto text-sm whitespace-pre-wrap">
                    {log}
                </pre>
            )}
        </div>
    );
}
