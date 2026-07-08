"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell, Receipt, Minus, Plus, Users, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/Loader";

const fmt = (n: number) =>
    "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));

type Item = {
    _id: string;
    menuItemId?: { nombre: string; precio: number } | null;
    cantidad: number;
    nota?: string;
};

type Comanda = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    estado: string;
    items: Item[];
    total: number;
};

export default function MiCuentaPage() {
    const [comanda, setComanda] = useState<Comanda | null>(null);
    const [loading, setLoading] = useState(true);
    const [personas, setPersonas] = useState(2);
    const [llamadaEnviada, setLlamadaEnviada] = useState<Set<"mozo" | "cuenta">>(new Set());
    const [llamandoConfirm, setLlamandoConfirm] = useState<"mozo" | "cuenta" | null>(null);

    const cargar = useCallback(async () => {
        try {
            const res = await fetch("/api/llamar-mozo", { credentials: "include", cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            setComanda(data.pedido ?? null);
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        cargar();
        const iv = setInterval(cargar, 5000);
        return () => clearInterval(iv);
    }, [cargar]);

    function llamar(tipo: "mozo" | "cuenta") {
        if (llamadaEnviada.has(tipo) || !comanda) return;
        setLlamandoConfirm(tipo);
    }

    async function confirmarLlamar() {
        if (!llamandoConfirm) return;
        const tipo = llamandoConfirm;
        setLlamandoConfirm(null);
        setLlamadaEnviada(prev => new Set([...prev, tipo]));
        setTimeout(() => setLlamadaEnviada(prev => { const s = new Set(prev); s.delete(tipo); return s; }), 60000);
        await fetch("/api/llamar-mozo", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo }),
        }).catch(() => {});
    }

    if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

    if (!comanda) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Receipt size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-900 font-black text-lg">Sin comanda activa</p>
                <p className="text-gray-500 text-sm">Cuando el mozo te asigne a una mesa, vas a ver tu cuenta acá.</p>
                <Link href="/" className="mt-2 px-5 py-3 bg-black text-white rounded-xl font-bold text-sm">
                    Ir al inicio
                </Link>
            </div>
        );
    }

    const titulo = comanda.mesa ? `Mesa ${comanda.mesa}` : comanda.nombreComanda || "Mi comanda";
    const total = comanda.total ?? comanda.items.reduce((s, it) => s + (it.menuItemId?.precio ?? 0) * it.cantidad, 0);
    const ppp = personas > 0 ? total / personas : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-black px-4 pt-5 pb-6">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <Link href="/" className="p-1.5 rounded-lg bg-white/10 text-white">
                            <ChevronLeft size={18} />
                        </Link>
                        <span className="text-white/60 text-sm font-semibold">Mi cuenta</span>
                    </div>
                    <h1 className="text-3xl font-black text-white">{titulo}</h1>
                    <p className="text-white/50 text-sm mt-1 capitalize">{comanda.estado}</p>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 -mt-3 space-y-3">

                {/* Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Productos</p>
                    </div>
                    {comanda.items.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-gray-400 text-center">Sin items todavía…</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {comanda.items.map((it, i) => (
                                <div key={it._id ?? i} className="flex items-center gap-3 px-4 py-3">
                                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600 shrink-0">
                                        {it.cantidad}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {it.menuItemId?.nombre ?? "Ítem"}
                                        </p>
                                        {it.nota && <p className="text-xs text-gray-400 truncate">{it.nota}</p>}
                                    </div>
                                    <span className="text-sm font-black text-gray-900 shrink-0">
                                        {it.menuItemId ? fmt(it.menuItemId.precio * it.cantidad) : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Total */}
                    <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="text-sm font-black text-gray-600 uppercase tracking-wide">Total</span>
                        <span className="text-2xl font-black text-gray-900">{fmt(total)}</span>
                    </div>
                </div>

                {/* Dividir cuenta */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Dividir cuenta</p>
                    </div>
                    <div className="px-4 py-5">
                        {/* Stepper personas */}
                        <div className="flex items-center justify-between mb-5">
                            <p className="text-sm font-bold text-gray-700">Cantidad de personas</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPersonas(p => Math.max(2, p - 1))}
                                    className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-black hover:text-black transition active:scale-95">
                                    <Minus size={14} />
                                </button>
                                <span className="text-xl font-black text-gray-900 w-8 text-center">{personas}</span>
                                <button
                                    onClick={() => setPersonas(p => Math.min(20, p + 1))}
                                    className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-black hover:text-black transition active:scale-95">
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                        {/* Resultado */}
                        <div className="bg-black rounded-2xl px-5 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-white/60 text-xs font-semibold">Por persona</p>
                                <p className="text-white text-3xl font-black mt-0.5">{fmt(ppp)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/40 text-xs">{fmt(total)}</p>
                                <p className="text-white/40 text-xs">÷ {personas}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Llamar mozo / Pedir cuenta */}
                <div className="flex gap-3 pt-1">
                    <button
                        onClick={() => llamar("mozo")}
                        disabled={llamadaEnviada.has("mozo")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                            ${llamadaEnviada.has("mozo")
                                ? "bg-red-50 border-2 border-red-200 text-red-600 cursor-default"
                                : "bg-red-600 text-white"}`}>
                        <Bell size={20} />
                        {llamadaEnviada.has("mozo") ? "¡En camino!" : "Llamar mozo"}
                    </button>
                    <button
                        onClick={() => llamar("cuenta")}
                        disabled={llamadaEnviada.has("cuenta")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.97] shadow-sm
                            ${llamadaEnviada.has("cuenta")
                                ? "bg-gray-100 border-2 border-gray-200 text-gray-500 cursor-default"
                                : "bg-black text-white"}`}>
                        <Receipt size={20} />
                        {llamadaEnviada.has("cuenta") ? "¡Avisado!" : "Pedir cuenta"}
                    </button>
                </div>
            </div>

            {/* Confirm llamar */}
            {llamandoConfirm && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" onClick={() => setLlamandoConfirm(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <p className="text-lg font-black text-gray-900 mb-1">
                            {llamandoConfirm === "mozo" ? "¿Llamar al mozo?" : "¿Pedir la cuenta?"}
                        </p>
                        <p className="text-sm text-gray-500 mb-5">
                            {llamandoConfirm === "mozo"
                                ? "Se le avisará al mozo que te atendió."
                                : "Se le avisará al mozo para traerte la cuenta."}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setLlamandoConfirm(null)}
                                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">
                                Cancelar
                            </button>
                            <button onClick={confirmarLlamar}
                                className={`flex-1 py-3 rounded-xl text-sm font-black text-white ${llamandoConfirm === "mozo" ? "bg-red-600" : "bg-black"}`}>
                                {llamandoConfirm === "mozo" ? "Llamar" : "Pedir cuenta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
