"use client";
import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SendHorizonal } from "lucide-react";

type Mensaje = {
    _id?: string;
    pedidoId: string;
    remitente: "cliente" | "admin";
    texto: string;
    createdAt?: string;
};

type Props = {
    pedidoId: string;
    remitente: "cliente" | "admin";
};

export default function ChatPedido({ pedidoId, remitente }: Props) {
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [nuevo, setNuevo] = useState("");
    const [escribiendo, setEscribiendo] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 📡 Suscribirse a Pusher
    useEffect(() => {
        const canal = pusherClient.subscribe(`pedido-${pedidoId}`);

        canal.bind("mensaje-creado", (msg: Mensaje) => {
            setMensajes((prev) => [...prev, msg]);
        });

        canal.bind("usuario-escribiendo", (data: { remitente: string }) => {
            if (data.remitente !== remitente) {
                setEscribiendo(
                    data.remitente === "admin"
                        ? "Escribiendo..."
                        : "Escribiendo..."
                );
                // borrar mensaje a los 3s
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

    // 📜 Auto scroll al último mensaje
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
        if (!nuevo.trim()) return;
        await fetch(`/api/mensajes/${pedidoId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remitente, texto: nuevo }),
        });
        setNuevo("");
    }

    // ✍️ Notificar que está escribiendo
    async function notificarEscribiendo() {
        await fetch(`/api/mensajes/${pedidoId}/escribiendo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remitente }),
        });
    }

    // ⌨️ Manejador de input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNuevo(e.target.value);
        if (e.target.value.trim()) notificarEscribiendo();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") enviarMensaje();
    };

    return (
        <div className="fixed bottom-0 left-0 w-full bg-zinc-950 text-white border-t border-red-600 p-4">
            {/* Mensajes */}
            <div
                ref={scrollRef}
                className="h-80 overflow-y-auto mb-3 space-y-3 px-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            >
                <AnimatePresence>
                    {mensajes.map((m) => {
                        const esPropio = m.remitente === remitente;
                        const hora = m.createdAt
                            ? format(new Date(m.createdAt), "HH:mm", { locale: es })
                            : "";

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
                                <span className="text-[11px] text-gray-400 mt-1">{hora}</span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* 🖋️ Indicador de escritura */}
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

            {/* Input */}
            <div className="flex gap-2">
                <input
                    value={nuevo}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí un mensaje..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 outline-none"
                />
                <button
                    onClick={enviarMensaje}
                    disabled={!nuevo.trim()}
                    className={`flex items-center gap-1 px-4 py-2 rounded-xl font-semibold transition ${nuevo.trim()
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : "bg-zinc-800 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    <SendHorizonal className="w-4 h-4" />
                    <span>Enviar</span>
                </button>
            </div>
        </div>
    );
}
