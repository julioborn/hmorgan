"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Item {
    nombre: string;
    cantidad: number;
    precio: number;
}

interface PedidoData {
    numero: number;
    items: Item[];
    subtotal: number;
    costoEnvio: number;
    tipoEntrega: string;
}

function formatPrice(n: number) {
    return n.toLocaleString("es-AR");
}

function RechazadoContent() {
    const params = useSearchParams();
    const pedidoId = params.get("external_reference");
    const [pedido, setPedido] = useState<PedidoData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pedidoId) { setLoading(false); return; }
        fetch(`/api/pagos/mp/pedido-publico?id=${pedidoId}`)
            .then(r => r.json())
            .then(data => { setPedido(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [pedidoId]);

    const total = pedido ? pedido.subtotal + pedido.costoEnvio : 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-md overflow-hidden">

                {/* Header */}
                <div className="bg-red-500 px-6 py-8 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                    <h1 className="text-white text-2xl font-black text-center">Pago rechazado</h1>
                    <p className="text-red-100 text-sm text-center">No se pudo procesar tu pago. Podés intentarlo nuevamente.</p>
                </div>

                {/* Logo MP */}
                <div className="flex justify-center py-4 border-b border-gray-100">
                    <img src="/MP_RGB_HANDSHAKE_color_horizontal.svg" width="120" alt="Mercado Pago" />
                </div>

                {loading && (
                    <div className="px-6 py-8 text-center text-gray-400 text-sm">Cargando detalle...</div>
                )}

                {!loading && pedido && (
                    <div className="px-6 py-5">
                        {pedido.numero && (
                            <p className="text-xs text-gray-400 mb-4 text-center">
                                Pedido <span className="font-black text-gray-700">#{pedido.numero}</span>
                            </p>
                        )}

                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tu pedido era:</p>

                        {/* Items */}
                        <div className="divide-y divide-gray-100 mb-4">
                            {pedido.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2.5">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
                                        <p className="text-xs text-gray-400">x{item.cantidad} · ${formatPrice(item.precio)} c/u</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800">${formatPrice(item.precio * item.cantidad)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Totales */}
                        <div className="border-t border-gray-200 pt-3 space-y-1.5">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>${formatPrice(pedido.subtotal)}</span>
                            </div>
                            {pedido.costoEnvio > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Envío a domicilio</span>
                                    <span>${formatPrice(pedido.costoEnvio)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-200">
                                <span>Total</span>
                                <span>${formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !pedido && (
                    <div className="px-6 py-8 text-center text-gray-400 text-sm">
                        No se pudo cargar el detalle del pedido.
                    </div>
                )}

                <div className="px-6 pb-6 pt-2 text-center">
                    <button
                        onClick={() => window.close()}
                        className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold text-sm mb-3">
                        Cerrar y volver a la app
                    </button>
                    <p className="text-xs text-gray-400">Si el botón no funciona, cerrá esta ventana manualmente y volvé a la app para intentar de nuevo.</p>
                </div>
            </div>
        </div>
    );
}

export default function PagoRechazado() {
    return (
        <Suspense>
            <RechazadoContent />
        </Suspense>
    );
}
