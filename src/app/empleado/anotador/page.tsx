"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Plus, Minus, ShoppingCart, Send, ChevronLeft, CheckCircle } from "lucide-react";
import Loader from "@/components/Loader";

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    activo: boolean;
};

type CartItem = {
    menuItemId: string;
    nombre: string;
    precio: number;
    cantidad: number;
};

export default function AnotadorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mesa, setMesa] = useState("");
    const [nota, setNota] = useState("");
    const [mesasRegistradas, setMesasRegistradas] = useState<{ _id: string; nombre: string }[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && user && user.role !== "empleado" && user.role !== "admin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        fetch("/api/menu")
            .then(res => res.json())
            .then(data => {
                const activos: MenuItem[] = Array.isArray(data)
                    ? data.filter((i: MenuItem) => i.activo)
                    : [];
                setMenuItems(activos);
                if (activos.length > 0) setCategoriaActiva(activos[0].categoria);
            })
            .catch(() => setMenuItems([]))
            .finally(() => setLoadingMenu(false));

        fetch("/api/admin/mesas")
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setMesasRegistradas(data); })
            .catch(() => {});
    }, []);

    const categorias = [...new Set(menuItems.map(i => i.categoria))];

    function addToCart(item: MenuItem) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item._id);
            if (existing) {
                return prev.map(c =>
                    c.menuItemId === item._id ? { ...c, cantidad: c.cantidad + 1 } : c
                );
            }
            return [...prev, { menuItemId: item._id, nombre: item.nombre, precio: item.precio, cantidad: 1 }];
        });
    }

    function removeFromCart(id: string) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === id);
            if (!existing) return prev;
            if (existing.cantidad === 1) return prev.filter(c => c.menuItemId !== id);
            return prev.map(c => c.menuItemId === id ? { ...c, cantidad: c.cantidad - 1 } : c);
        });
    }

    function getQuantity(id: string) {
        return cart.find(c => c.menuItemId === id)?.cantidad || 0;
    }

    const total = cart.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    const totalItems = cart.reduce((acc, i) => acc + i.cantidad, 0);

    async function enviarPedido() {
        if (cart.length === 0) return;
        setEnviando(true);
        setError("");
        try {
            const res = await fetch("/api/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    items: cart.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad })),
                    tipoEntrega: "retira",
                    fuente: "empleado",
                    mesa: mesa.trim() || undefined,
                    notaEmpleado: nota.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err.message || "Error al enviar el pedido");
                return;
            }
            setCart([]);
            setMesa("");
            setNota("");
            setEnviado(true);
            setTimeout(() => setEnviado(false), 3500);
        } catch {
            setError("Error de conexión");
        } finally {
            setEnviando(false);
        }
    }

    if (loading || loadingMenu) {
        return (
            <div className="flex justify-center py-20">
                <Loader size={64} />
            </div>
        );
    }

    if (!user) return null;

    const itemsCategoria = menuItems.filter(i => i.categoria === categoriaActiva);

    return (
        <div
            className="min-h-screen bg-gray-50"
            style={{ paddingBottom: cart.length > 0 ? "200px" : "1.5rem" }}
        >
            {/* Header */}
            <div
                className="bg-black text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
                <button onClick={() => router.back()} className="p-1 -ml-1">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold flex-1">Anotador de Pedidos</h1>
                {totalItems > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-bold">{totalItems}</span>
                    </div>
                )}
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide bg-white border-b border-gray-100 sticky top-[56px] z-10">
                {categorias.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoriaActiva(cat)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                            categoriaActiva === cat
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu items */}
            <div className="px-4 py-3 space-y-2 max-w-2xl mx-auto">
                {itemsCategoria.map(item => {
                    const qty = getQuantity(item._id);
                    return (
                        <div
                            key={item._id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between"
                        >
                            <div className="flex-1 min-w-0 mr-3">
                                <p className="font-semibold text-gray-900 text-sm leading-tight">{item.nombre}</p>
                                {item.descripcion && (
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{item.descripcion}</p>
                                )}
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                                    ${item.precio}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {qty > 0 ? (
                                    <>
                                        <button
                                            onClick={() => removeFromCart(item._id)}
                                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                                        >
                                            <Minus className="w-4 h-4 text-gray-700" />
                                        </button>
                                        <span className="w-6 text-center font-bold text-gray-900 text-sm">{qty}</span>
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"
                                    >
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom cart panel */}
            {cart.length > 0 && (
                <div
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl px-4 pt-3"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                    <div className="max-w-2xl mx-auto">
                        {/* Cart summary chips */}
                        <div className="flex flex-wrap gap-1 mb-3 max-h-14 overflow-y-auto">
                            {cart.map(c => (
                                <span
                                    key={c.menuItemId}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                                >
                                    {c.nombre} ×{c.cantidad}
                                </span>
                            ))}
                        </div>

                        {/* Mesa + Nota */}
                        <div className="flex gap-2 mb-3">
                            {mesasRegistradas.length > 0 ? (
                                <select
                                    value={mesa}
                                    onChange={e => setMesa(e.target.value)}
                                    className="w-36 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                                >
                                    <option value="">Sin mesa</option>
                                    {mesasRegistradas.map(m => (
                                        <option key={m._id} value={m.nombre}>Mesa {m.nombre}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Mesa (ej: 5)"
                                    value={mesa}
                                    onChange={e => setMesa(e.target.value)}
                                    className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                            )}
                            <input
                                type="text"
                                placeholder="Nota para el bar..."
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                        </div>

                        {error && (
                            <p className="text-red-600 text-xs mb-2 text-center">{error}</p>
                        )}

                        <button
                            onClick={enviarPedido}
                            disabled={enviando}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                            <Send className="w-5 h-5" />
                            {enviando ? "Enviando..." : `Enviar al bar · $${total.toLocaleString("es-AR")}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Success toast */}
            {enviado && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-5 py-3 rounded-full shadow-lg font-semibold flex items-center gap-2 z-50">
                    <CheckCircle className="w-5 h-5" />
                    ¡Pedido enviado al bar!
                </div>
            )}
        </div>
    );
}
