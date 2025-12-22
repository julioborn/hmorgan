"use client";

import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Send, ChevronDown, ChevronUp, ArrowDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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
    const router = useRouter();

    /* =========================
       Cargar pedido y mensajes
    ========================= */
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

    /* =========================
       Bloquear envío 1h después
    ========================= */
    useEffect(() => {
        if (pedido?.estado?.toLowerCase() === "entregado" && pedido.updatedAt) {
            const fechaEntrega = new Date(pedido.updatedAt).getTime();

            const check = () => {
                const horas = (Date.now() - fechaEntrega) / (1000 * 60 * 60);
                if (horas > 1) setBloquearEnvio(true);
            };

            check();
            const interval = setInterval(check, 60000);
            return () => clearInterval(interval);
        }
    }, [pedido]);

    /* =========================
       Pusher
    ========================= */
    useEffect(() => {
        const canal = pusherClient.subscribe(`pedido-${pedidoId}`);

        canal.bind("mensaje-creado", (msg: Mensaje) => {
            setMensajes((prev) => {
                const existe = prev.some(
                    (m) =>
                        m.texto === msg.texto &&
                        m.remitente === msg.remitente &&
                        Math.abs(
                            new Date(m.createdAt || "").getTime() -
                            new Date(msg.createdAt || "").getTime()
                        ) < 2000
                );
                return existe ? prev : [...prev, msg];
            });
        });

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`pedido-${pedidoId}`);
        };
    }, [pedidoId]);

    /* =========================
       Scroll helpers
    ========================= */
    const scrollToBottom = (smooth = true) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({
            top: el.scrollHeight,
            behavior: smooth ? "smooth" : "auto",
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [mensajes]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        setMostrarBotonScroll(!isBottom);
    };

    /* =========================
       Enviar mensaje
    ========================= */
    async function enviarMensaje() {
        if (!nuevo.trim() || bloquearEnvio) return;

        const texto = nuevo.trim();
        setBloquearEnvio(true);

        const tempMsg: Mensaje = {
            pedidoId,
            remitente,
            texto,
            createdAt: new Date().toISOString(),
        };

        setMensajes((prev) => [...prev, tempMsg]);
        setNuevo("");
        scrollToBottom(false);

        try {
            const res = await fetch(`/api/mensajes/${pedidoId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remitente, texto }),
            });

            if (!res.ok) throw new Error("Error al enviar");
        } catch (err) {
            setMensajes((prev) => prev.filter((m) => m !== tempMsg));
            alert("Error al enviar el mensaje");
        } finally {
            setTimeout(() => setBloquearEnvio(false), 600);
        }
    }

    /* =========================
       Render
    ========================= */
    return (
        <div className="grid grid-rows-[auto_1fr_auto] h-screen bg-white text-black overflow-hidden">
            {/* ================= HEADER ================= */}
            <div className="flex-shrink-0 z-30 bg-white border-b border-gray-300">

                {/* Safe area / Dynamic Island (IGUAL que el header principal) */}
                <div style={{ height: "calc(env(safe-area-inset-top) + 12px)" }} />

                {/* Header visible */}
                <div className="px-4 py-3 flex items-center justify-center relative">

                    {/* Botón volver */}
                    <button
                        onClick={() => router.back()}
                        className="absolute left-4 flex items-center justify-center w-9 h-9 rounded-full bg-red-500 text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <h1 className="text-lg font-semibold">Chat del Pedido</h1>
                </div>

                {pedido && (
                    <>
                        <div
                            className="border-t border-gray-200 bg-gray-100 px-4 py-3 cursor-pointer"
                            onClick={() => setMostrarPedido(!mostrarPedido)}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium">
                                        Pedido #{pedido._id.slice(-6)}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {pedido.estado} • {pedido.tipoEntrega}
                                    </p>
                                </div>
                                {mostrarPedido ? <ChevronUp /> : <ChevronDown />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {mostrarPedido && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="bg-gray-100 px-4 pb-3 space-y-1 overflow-hidden"
                                >
                                    {pedido.items.map((it) => (
                                        <div
                                            key={it._id}
                                            className="flex justify-between text-xs bg-white rounded-lg px-3 py-1"
                                        >
                                            <span>{it.menuItemId?.nombre}</span>
                                            <span className="text-red-600 font-semibold">
                                                ×{it.cantidad}
                                            </span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* ================= MENSAJES ================= */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
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
                            className={`flex flex-col ${esPropio ? "items-end" : "items-start"
                                }`}
                        >
                            <div
                                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${esPropio
                                    ? "bg-red-500 text-white rounded-br-none"
                                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                                    }`}
                            >
                                {m.texto}
                            </div>
                            <span className="text-[11px] text-gray-500 mt-1">{hora}</span>
                        </motion.div>
                    );
                })}

                <AnimatePresence>
                    {mostrarBotonScroll && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            onClick={() => scrollToBottom()}
                            className="fixed bottom-24 right-4 bg-black text-white p-2 rounded-full shadow-lg"
                        >
                            <ArrowDown className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* ================= INPUT ================= */}
            <div className="flex-shrink-0 border-t border-gray-300 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                    <input
                        value={nuevo}
                        onChange={(e) => setNuevo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                        placeholder="Escribí un mensaje..."
                        disabled={bloquearEnvio}
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 border outline-none"
                    />
                    <button
                        onClick={enviarMensaje}
                        disabled={!nuevo.trim() || bloquearEnvio}
                        className={`p-2 rounded-full ${nuevo.trim() && !bloquearEnvio
                            ? "bg-red-500 text-white"
                            : "bg-gray-200 text-gray-400"
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
