"use client";
import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Send, ChevronDown, ChevronUp, ArrowDown } from "lucide-react";

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
    const [bloquearEnvio, setBloquearEnvio] = useState(false);
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [mostrarPedido, setMostrarPedido] = useState(false);
    const [mostrarBotonScroll, setMostrarBotonScroll] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🧾 Cargar pedido y mensajes
    useEffect(() => {
        fetch(`/api/pedidos?id=${pedidoId}`)
            .then((r) => r.json())
            .then((data) => {
                const pedidoData = Array.isArray(data) ? data[0] : data;
                setPedido(pedidoData);
            })
            .catch(console.error);

        fetch(`/api/mensajes/${pedidoId}`)
            .then((r) => r.json())
            .then(setMensajes)
            .catch(console.error);
    }, [pedidoId]);

    // 📡 Pusher
    useEffect(() => {
        const canal = pusherClient.subscribe(`pedido-${pedidoId}`);
        canal.bind("mensaje-creado", (msg: Mensaje) => {
            setMensajes((prev) => [...prev, msg]);
        });

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`pedido-${pedidoId}`);
        };
    }, [pedidoId]);

    // 📜 Scroll automático al final
    const scrollToBottom = (smooth = true) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({
            top: el.scrollHeight,
            behavior: smooth ? "smooth" : "auto",
        });
    };

    // Cuando llegan mensajes nuevos → bajar
    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    // Mostrar / ocultar botón de bajar
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        setMostrarBotonScroll(!isBottom);
    };

    // 📨 Enviar mensaje
    async function enviarMensaje() {
        if (!nuevo.trim() || bloquearEnvio) return;
        await fetch(`/api/mensajes/${pedidoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remitente, texto: nuevo }),
        });
        setNuevo("");
        setTimeout(() => scrollToBottom(), 100);
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-white text-black w-full h-[100dvh] overflow-hidden">
            {/* 🔝 Encabezado fijo */}
            <div className="flex-shrink-0 z-30 relative">
                <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-center">
                    <h1 className="text-lg font-semibold tracking-wide">Chat del Pedido</h1>
                </div>

                {/* 📦 Card del pedido */}
                {pedido && (
                    <div className="relative border-b border-gray-300 bg-gray-100 px-4 py-3 mt-7">
                        <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => setMostrarPedido(!mostrarPedido)}
                        >
                            <div>
                                <h2 className="font-medium text-sm text-gray-700">
                                    Pedido #{pedido._id.slice(-6)}
                                </h2>
                                <p className="text-xs text-gray-500 capitalize">
                                    {pedido.estado} • {pedido.tipoEntrega}
                                </p>
                            </div>
                            {mostrarPedido ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                        </div>

                        <AnimatePresence>
                            {mostrarPedido && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 z-40 p-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300"
                                >
                                    {pedido.items.map((it) => (
                                        <div
                                            key={it._id}
                                            className="flex justify-between text-xs bg-gray-100 rounded-lg px-3 py-1 mb-1"
                                        >
                                            <span>{it.menuItemId?.nombre}</span>
                                            <span className="text-red-600 font-semibold">×{it.cantidad}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* 💬 Lista de mensajes */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 pt-4 pb-[90px] space-y-3 scrollbar-thin scrollbar-thumb-gray-300 relative z-10"
            >
                {mensajes.map((m, i) => {
                    const esPropio = m.remitente === remitente;
                    const hora = m.createdAt
                        ? format(new Date(m.createdAt), "HH:mm", { locale: es })
                        : "";
                    return (
                        <motion.div
                            key={m._id || i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col ${esPropio ? "items-end" : "items-start"}`}
                        >
                            <div
                                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${esPropio
                                        ? "bg-red-500 text-white rounded-br-none"
                                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                                    }`}
                                style={{ wordBreak: "break-word" }}
                            >
                                {m.texto}
                            </div>
                            <span
                                className={`text-[11px] mt-1 text-gray-500 ${esPropio ? "text-right pr-1" : "text-left pl-1"
                                    }`}
                            >
                                {hora}
                            </span>
                        </motion.div>
                    );
                })}

                {/* 📍Botón para bajar */}
                <AnimatePresence>
                    {mostrarBotonScroll && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => scrollToBottom()}
                            className="fixed bottom-20 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                        >
                            <ArrowDown className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* 📨 Input fijo */}
            <div
                id="chat-input-container"
                className="flex-shrink-0 bg-white border-t border-gray-300 px-3 py-2 z-30 fixed bottom-0 left-0 right-0"
            >
                <div className="flex items-center gap-2">
                    <input
                        value={nuevo}
                        onChange={(e) => setNuevo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                        placeholder="Escribí un mensaje..."
                        disabled={bloquearEnvio}
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-base text-gray-800 outline-none border border-gray-300 focus:ring-1 focus:ring-red-400"
                    />
                    <button
                        onClick={enviarMensaje}
                        disabled={!nuevo.trim() || bloquearEnvio}
                        className={`p-2 rounded-full transition ${bloquearEnvio
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : nuevo.trim()
                                    ? "bg-red-500 text-white hover:bg-red-400"
                                    : "bg-gray-200 text-gray-500"
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
