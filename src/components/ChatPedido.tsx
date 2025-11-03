"use client";
import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Send, ChevronDown, ChevronUp } from "lucide-react";

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
    const [escribiendo, setEscribiendo] = useState<string | null>(null);
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [mostrarPedido, setMostrarPedido] = useState(false);
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

        canal.bind("usuario-escribiendo", (data: { remitente: string }) => {
            if (data.remitente !== remitente) {
                setEscribiendo(
                    data.remitente === "admin"
                        ? "El administrador está escribiendo..."
                        : "El cliente está escribiendo..."
                );
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setEscribiendo(null), 2000);
            }
        });

        return () => {
            canal.unbind_all();
            pusherClient.unsubscribe(`pedido-${pedidoId}`);
        };
    }, [pedidoId, remitente]);

    // 📜 Scroll automático
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [mensajes]);

    // 📨 Enviar mensaje
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

    useEffect(() => {
        const inputContainer = document.getElementById("chat-input-container");

        function ajustarAltura() {
            if (!inputContainer) return;
            const viewport = window.visualViewport;
            if (!viewport) return;
            const offset = viewport.height < window.innerHeight ? viewport.height - 80 : 0;
            inputContainer.style.bottom = `${window.innerHeight - viewport.height + 8}px`;
        }

        window.visualViewport?.addEventListener("resize", ajustarAltura);
        window.visualViewport?.addEventListener("scroll", ajustarAltura);

        return () => {
            window.visualViewport?.removeEventListener("resize", ajustarAltura);
            window.visualViewport?.removeEventListener("scroll", ajustarAltura);
        };
    }, []);

    return (
        <div className="fixed inset-0 flex flex-col bg-black text-white w-full h-[100dvh] overflow-hidden">
            {/* 🔝 Encabezado fijo */}
            <div className="flex-shrink-0 z-30 relative">
                <div className="bg-black border-b border-zinc-800 px-4 py-3 flex items-center justify-center">
                    <h1 className="text-lg font-semibold tracking-wide">Chat del Pedido</h1>
                </div>

                {/* 📦 Card del pedido */}
                {pedido && (
                    <div className="relative border-b border-zinc-800 bg-zinc-900/70 px-4 py-3 mt-7">
                        <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => setMostrarPedido(!mostrarPedido)}
                        >
                            <div>
                                <h2 className="font-medium text-sm text-gray-200">
                                    Pedido #{pedido._id.slice(-6)}
                                </h2>
                                <p className="text-xs text-gray-400 capitalize">
                                    {pedido.estado} • {pedido.tipoEntrega}
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
                                    className="absolute left-0 right-0 top-full bg-zinc-900/95 border-t border-zinc-800 z-40 p-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700"
                                >
                                    {pedido.items.map((it) => (
                                        <div
                                            key={it._id}
                                            className="flex justify-between text-xs bg-zinc-800/70 rounded-lg px-3 py-1 mb-1"
                                        >
                                            <span>{it.menuItemId?.nombre}</span>
                                            <span className="text-red-400 font-semibold">×{it.cantidad}</span>
                                        </div>
                                    ))}
                                    {pedido.direccion && (
                                        <p className="text-xs text-gray-400 mt-2">📍 {pedido.direccion}</p>
                                    )}
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        {format(new Date(pedido.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* 💬 Lista de mensajes scrollable */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent relative z-10"
                style={{
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                }}
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
                                    ? "bg-red-600 text-white rounded-br-none"
                                    : "bg-zinc-800 text-gray-100 rounded-bl-none"
                                    }`}
                                style={{ wordBreak: "break-word" }}
                            >
                                {m.texto}
                            </div>
                            <span
                                className={`text-[11px] mt-1 text-gray-400 ${esPropio ? "text-right pr-1" : "text-left pl-1"
                                    }`}
                            >
                                {hora}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* 📨 Input fijo */}
            <div
                id="chat-input-container"
                className="flex-shrink-0 bg-black border-t border-zinc-800 px-3 py-2 z-30 fixed bottom-0 left-0 right-0"
            >
                <div className="flex items-center gap-2">
                    <input
                        value={nuevo}
                        onChange={(e) => {
                            setNuevo(e.target.value);
                            if (e.target.value.trim()) notificarEscribiendo();
                        }}
                        onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                        placeholder={
                            bloquearEnvio ? "⏳ El chat está cerrado." : "Escribí un mensaje..."
                        }
                        disabled={bloquearEnvio}
                        className="flex-1 bg-zinc-900 rounded-full px-4 py-2 text-base text-white outline-none border border-zinc-800 focus:ring-1 focus:ring-red-600"
                    />
                    <button
                        onClick={enviarMensaje}
                        disabled={!nuevo.trim() || bloquearEnvio}
                        className={`p-2 rounded-full transition ${bloquearEnvio
                                ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                                : nuevo.trim()
                                    ? "bg-red-600 text-white hover:bg-red-500"
                                    : "bg-zinc-800 text-gray-500"
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

}
