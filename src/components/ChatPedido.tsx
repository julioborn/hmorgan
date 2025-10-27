"use client";
import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, SendHorizonal } from "lucide-react";

type Mensaje = {
    _id?: string;
    pedidoId: string;
    remitente: "cliente" | "admin";
    texto: string;
    createdAt?: string;
};

type Pedido = {
    _id: string;
    estado: string;
    tipoEntrega: string;
    direccion?: string;
    createdAt: string;
    updatedAt?: string;
    items: { _id: string; menuItemId?: { nombre: string }; cantidad: number }[];
};

type Props = {
    pedidoId: string;
    remitente: "cliente" | "admin";
};

export default function ChatPedido({ pedidoId, remitente }: Props) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [nuevo, setNuevo] = useState("");
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [mostrarPedido, setMostrarPedido] = useState(false);
    const [escribiendo, setEscribiendo] = useState<string | null>(null);
    const [bloquearEnvio, setBloquearEnvio] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 📦 Cargar pedido
    useEffect(() => {
        fetch(`/api/pedidos?id=${pedidoId}`)
            .then((r) => r.json())
            .then((data) => {
                const pedidoData = Array.isArray(data) ? data[0] : data;
                setPedido(pedidoData);

                if (pedidoData.estado === "entregado") {
                    const diff =
                        Date.now() -
                        new Date(pedidoData.updatedAt || pedidoData.createdAt).getTime();
                    const diezMin = 10 * 60 * 1000;
                    if (diff > diezMin) setBloquearEnvio(true);
                }
            })
            .catch(console.error);
    }, [pedidoId]);

    // 📡 Pusher
    useEffect(() => {
        const canal = pusherClient.subscribe(`pedido-${pedidoId}`);

        canal.bind("mensaje-creado", (msg: Mensaje) => {
            setMensajes((prev) => [...prev, msg]);
        });

        canal.bind("usuario-escribiendo", (data: { remitente: string }) => {
            if (data.remitente !== remitente) {
                setEscribiendo(
                    data.remitente === "admin"
                        ? "El administrador está escribiendo..."
                        : "El cliente está escribiendo..."
                );
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setEscribiendo(null), 3000);
            }
        });

        fetch(`/api/mensajes/${pedidoId}`)
            .then((r) => r.json())
            .then(setMensajes)
            .catch(console.error);

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`pedido-${pedidoId}`);
        };
    }, [pedidoId, remitente]);

    // 🧭 Scroll automático
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [mensajes]);

    // 🚀 Enviar mensaje
    async function enviarMensaje() {
        if (!nuevo.trim() || bloquearEnvio) return;
        await fetch(`/api/mensajes/${pedidoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remitente, texto: nuevo }),
        });
        setNuevo("");
    }

    // ✍️ Notificar escritura
    async function notificarEscribiendo() {
        if (bloquearEnvio) return;
        await fetch(`/api/mensajes/${pedidoId}/escribiendo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remitente }),
        });
    }

    return (
        <div className="bg-zinc-950 text-white min-h-screen flex flex-col">
            {/* 🔹 Cabecera */}
            <div className="border-b border-red-600 py-4 px-6 text-center">
                <h1 className="text-xl font-semibold">
                    Chat
                </h1>
            </div>

            {/* 🔸 Card del pedido arriba */}
            {pedido && (
                <div className="border-b border-zinc-800 p-4 bg-zinc-900">
                    <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => setMostrarPedido(!mostrarPedido)}
                    >
                        <div>
                            <h2 className="font-semibold text-lg">
                                Pedido #{pedido._id.slice(-6)}
                            </h2>
                            <p className="text-sm text-gray-400 capitalize">
                                Estado: {pedido.estado} | {pedido.tipoEntrega}
                            </p>
                        </div>
                        {mostrarPedido ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </div>

                    <AnimatePresence>
                        {mostrarPedido && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-3 border-t border-zinc-800 pt-2 space-y-2"
                            >
                                {pedido.items.map((it) => (
                                    <div
                                        key={it._id}
                                        className="flex justify-between text-sm bg-zinc-800 rounded-lg px-3 py-1"
                                    >
                                        <span>{it.menuItemId?.nombre}</span>
                                        <span className="text-red-400 font-semibold">
                                            ×{it.cantidad}
                                        </span>
                                    </div>
                                ))}
                                {pedido.direccion && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        📍 Dirección: {pedido.direccion}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">
                                    {format(new Date(pedido.createdAt), "dd/MM/yyyy HH:mm", {
                                        locale: es,
                                    })}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* 💬 Chat */}
            <div className="flex-1 flex flex-col justify-end p-4 bg-zinc-950">
                <div
                    ref={scrollRef}
                    className="h-72 overflow-y-auto mb-3 space-y-3 px-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                >
                    {mensajes.map((m, i) => {
                        const esPropio = m.remitente === remitente;
                        const hora = m.createdAt
                            ? format(new Date(m.createdAt), "HH:mm", { locale: es })
                            : "";

                        const proximo = mensajes[i + 1];
                        const mostrarHora =
                            !proximo ||
                            format(new Date(proximo?.createdAt || ""), "HH:mm") !== hora;

                        return (
                            <motion.div
                                key={m._id || Math.random()}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex flex-col ${esPropio ? "items-end" : "items-start"
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${esPropio
                                            ? "bg-red-600 text-white rounded-br-none"
                                            : "bg-zinc-800 text-gray-100 rounded-bl-none"
                                        }`}
                                >
                                    {m.texto}
                                </div>

                                {mostrarHora && (
                                    <span className="text-[11px] text-gray-400 mt-1">{hora}</span>
                                )}
                            </motion.div>
                        );
                    })}

                    {escribiendo && (
                        <motion.div
                            key="escribiendo"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-400 text-xs mt-2 italic"
                        >
                            {escribiendo}
                        </motion.div>
                    )}
                </div>

                {/* 📨 Input */}
                <div className="flex gap-2">
                    <input
                        value={nuevo}
                        onChange={(e) => {
                            setNuevo(e.target.value);
                            if (e.target.value.trim()) notificarEscribiendo();
                        }}
                        onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                        placeholder={
                            bloquearEnvio
                                ? "⏳ El chat se cerró 10 minutos después de la entrega."
                                : "Escribí un mensaje..."
                        }
                        disabled={bloquearEnvio}
                        className={`flex-1 bg-zinc-900 border rounded-xl px-3 py-2 text-white outline-none ${bloquearEnvio
                                ? "border-zinc-700 text-gray-500 cursor-not-allowed"
                                : "border-zinc-700 focus:ring-2 focus:ring-red-500"
                            }`}
                    />
                    <button
                        onClick={enviarMensaje}
                        disabled={!nuevo.trim() || bloquearEnvio}
                        className={`flex items-center gap-1 px-4 py-2 rounded-xl font-semibold transition ${bloquearEnvio
                                ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                                : nuevo.trim()
                                    ? "bg-red-600 hover:bg-red-500 text-white"
                                    : "bg-zinc-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        <SendHorizonal className="w-4 h-4" />
                        <span>Enviar</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
