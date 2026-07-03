"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, X, Trash2, ShoppingCart, ChevronLeft,
} from "lucide-react";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";
import Portal from "@/components/Portal";
import { useRouter } from "next/navigation";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";
import MenuImg from "@/components/MenuImg";

type MenuItem = {
    _id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    categoria: string;
    imagen?: string;
    activo: boolean;
};

const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

const categoryImages: Record<string, string> = {
    PARRILLA: "/parrilla.jpg",
    PIZZAS: "/pizzas.jpg",
    HAMBURGUESAS: "/hamburguesas.jpg",
    SANDWICHES: "/sandwiches.jpg",
    PICADAS: "/picada.jpg",
    ENSALADAS: "/ensaladas.jpg",
    FRITURAS: "/frituras.jpeg",
    BEBIDAS: "/bebidas.jpeg",
    "POSTRE Y CAFE": "/postreycafe.jpeg",
    CERVEZAS: "/subcategoria-bebidas/cervezas.png",
    VINOS: "/subcategoria-bebidas/vinos.png",
    GASEOSAS: "/subcategoria-bebidas/gaseosas.png",
    JARROS: "/subcategoria-bebidas/jarros.png",
    COCKTAILS: "/subcategoria-bebidas/cocktails.png",
    WHISKY: "/subcategoria-bebidas/whisky.png",
    MEDIDAS: "/subcategoria-bebidas/medidas.png",
    "MENÚ DEL DÍA": "/menu-del-dia.jpeg",
};

const categoryIcons: Record<string, React.ElementType> = {
    PARRILLA: Beef, PIZZAS: Pizza, HAMBURGUESAS: Hamburger, SANDWICHES: Sandwich,
    PICADAS: UtensilsCrossed, ENSALADAS: Salad, FRITURAS: UtensilsCrossed,
    BEBIDAS: Beer,
    CERVEZAS: Beer, VINOS: BottleWine, GASEOSAS: Milk, JARROS: CupSoda,
    COCKTAILS: Martini, WHISKY: GlassWater, MEDIDAS: Beaker,
    "POSTRE Y CAFE": CakeSlice,
};

/* ─── Autocomplete de dirección con Nominatim (OpenStreetMap, sin API key) ─── */
type NominatimResult = { place_id: number; display_name: string; lat: string; lon: string };

function AddressAutocomplete({
    value, onChange, onSelectCoords,
}: {
    value: string;
    onChange: (v: string) => void;
    onSelectCoords: (lat: number, lng: number) => void;
}) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function buscar(q: string) {
        if (q.trim().length < 3) { setResults([]); return; }
        setSearching(true);
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", Calchaquí, Santa Fe, Argentina")}&format=json&limit=5&countrycodes=ar&addressdetails=1`,
                { headers: { "Accept-Language": "es" } }
            );
            const data = await r.json();
            setResults(Array.isArray(data) ? data : []);
        } catch { }
        setSearching(false);
    }

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setMapCoords(null);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => buscar(v), 600);
    }

    function handleSelect(r: NominatimResult) {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        const clean = r.display_name.split(",").slice(0, 3).join(",").trim();
        setQuery(clean);
        onChange(clean);
        setResults([]);
        setMapCoords({ lat, lng });
        onSelectCoords(lat, lng);
    }

    return (
        <div className="relative">
            <input
                type="text"
                placeholder="Ingresá tu calle y número"
                value={query}
                onChange={handleInput}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350)}
                style={{ fontSize: "16px" }}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {searching && <p className="text-xs text-gray-400 mt-1 pl-1">Buscando...</p>}
            {results.length > 0 && !searching && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {results.map((r) => (
                        <li key={r.place_id} onClick={() => handleSelect(r)}
                            className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}
            {mapCoords && (
                <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                        title="Ubicación de entrega"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.003}%2C${mapCoords.lat - 0.002}%2C${mapCoords.lng + 0.003}%2C${mapCoords.lat + 0.002}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lng}`}
                        style={{ width: "100%", height: "140px", border: 0 }}
                        loading="lazy"
                    />
                </div>
            )}
        </div>
    );
}

/* ─── CartDrawer — componente de nivel superior para evitar remount al tipear ─── */
interface CartDrawerProps {
    items: Record<string, number>;
    menu: MenuItem[];
    tipoEntrega: string;
    setTipoEntrega: (v: string) => void;
    direccionPrincipal: string;
    direccionEnvio: string;
    setDireccionEnvio: (v: string) => void;
    usarOtraDireccion: boolean;
    setUsarOtraDireccion: (v: boolean) => void;
    horarioPreferido: string;
    setHorarioPreferido: (v: string) => void;
    notasProducto: Record<string, string>;
    onSetNotaProducto: (id: string, nota: string) => void;
    onSelectCoords: (lat: number, lng: number) => void;
    enviando: boolean;
    total: number;
    costoEnvio: number;
    onClose: () => void;
    onVaciar: () => void;
    onEliminar: (id: string) => void;
    onEnviar: () => void;
}

function CartDrawer({
    items, menu, tipoEntrega, setTipoEntrega,
    direccionPrincipal, direccionEnvio, setDireccionEnvio,
    usarOtraDireccion, setUsarOtraDireccion,
    horarioPreferido, setHorarioPreferido,
    notasProducto, onSetNotaProducto, onSelectCoords,
    enviando, total, costoEnvio, onClose, onVaciar, onEliminar, onEnviar,
}: CartDrawerProps) {
    const totalFinal = total + (tipoEntrega === "envio" ? costoEnvio : 0);
    return (
        <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-t-3xl max-h-[85dvh] overflow-y-auto p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            >
                <h3 className="text-2xl font-extrabold mb-4 text-black">Tu pedido</h3>
                <div className="space-y-3">
                    {Object.entries(items).map(([id, cant]) => {
                        const producto = menu.find((m) => m._id === id);
                        if (!producto || cant === 0) return null;
                        return (
                            <div key={id} className="border-b pb-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-black">{producto.nombre}</p>
                                        <p className="text-sm text-gray-500">×{cant} — ${formatPrice(producto.precio * cant)}</p>
                                    </div>
                                    <button onClick={() => onEliminar(id)} className="text-red-500 hover:text-red-700 p-1">
                                        <X size={18} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Observación para este producto"
                                    value={notasProducto[id] || ""}
                                    onChange={(e) => onSetNotaProducto(id, e.target.value)}
                                    style={{ fontSize: "16px" }}
                                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 space-y-3">
                    <div className="flex gap-3">
                        {["retira", "envio"].map((tipo) => (
                            <button key={tipo} onClick={() => setTipoEntrega(tipo)}
                                className={`flex-1 py-2 rounded-xl font-semibold text-sm border transition ${tipoEntrega === tipo ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-300"}`}>
                                {tipo === "retira" ? "Retira en el bar" : "Envío a domicilio"}
                            </button>
                        ))}
                    </div>

                    {tipoEntrega === "envio" && (
                        <div className="space-y-2">
                            {direccionPrincipal && (
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="radio" checked={!usarOtraDireccion} onChange={() => { setUsarOtraDireccion(false); setDireccionEnvio(direccionPrincipal); }} />
                                    {direccionPrincipal}
                                </label>
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" checked={usarOtraDireccion} onChange={() => setUsarOtraDireccion(true)} />
                                Otra dirección
                            </label>
                            {(usarOtraDireccion || !direccionPrincipal) && (
                                <AddressAutocomplete
                                    value={direccionEnvio}
                                    onChange={setDireccionEnvio}
                                    onSelectCoords={onSelectCoords}
                                />
                            )}
                        </div>
                    )}
                </div>


                <div className="mt-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                        Horario preferido <span className="font-normal normal-case text-gray-400">(opcional)</span>
                    </label>
                    <select
                        value={horarioPreferido}
                        onChange={(e) => setHorarioPreferido(e.target.value)}
                        style={{ fontSize: "16px" }}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                    >
                        <option value="">Seleccionar...</option>
                        <option value="20:30">20:30</option>
                        <option value="21:00">21:00</option>
                        <option value="21:30">21:30</option>
                        <option value="22:00">22:00</option>
                        <option value="22:30">22:30</option>
                        <option value="Apenas esté listo">Apenas esté listo</option>
                    </select>
                </div>

                {tipoEntrega === "envio" && costoEnvio > 0 && (
                    <div className="mt-4 space-y-1 border-t border-gray-100 pt-3">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Costo de envío</span>
                            <span>${formatPrice(costoEnvio)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-black">
                            <span>Total</span>
                            <span>${formatPrice(totalFinal)}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onVaciar}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={onEnviar}
                        disabled={enviando}
                        className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-base disabled:opacity-50 hover:bg-red-700 transition"
                    >
                        {enviando ? "Enviando..." : `Confirmar pedido · $${formatPrice(totalFinal)}`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

const CART_DRAFT_KEY = "cliente_cart_draft";

/* ─── Página principal ─────────────────────────────────────────── */
export default function PedidosClientePage() {
    const categoryConfigMap = useCategoryConfigs();
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [activo, setActivo] = useState(false);
    const [items, setItems] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(CART_DRAFT_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [tipoEntrega, setTipoEntrega] = useState("retira");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [cargandoConfig, setCargandoConfig] = useState(true);
    const [direccionPrincipal, setDireccionPrincipal] = useState<string>("");
    const [direccionEnvio, setDireccionEnvio] = useState<string>("");
    const [usarOtraDireccion, setUsarOtraDireccion] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [horarioPreferido, setHorarioPreferido] = useState("");
    const [notasProducto, setNotasProducto] = useState<Record<string, string>>({});
    const [mapLat, setMapLat] = useState<number | null>(null);
    const [mapLng, setMapLng] = useState<number | null>(null);
    const [telefono, setTelefono] = useState<string>("");
    const [costoEnvio, setCostoEnvio] = useState<number>(0);
    const router = useRouter();

    // Manejo de regreso desde Mercado Pago
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pago = params.get("pago");
        if (!pago) return;
        window.history.replaceState({}, "", "/cliente/pedidos");
        if (pago === "ok") {
            setItems({});
            try { localStorage.removeItem(CART_DRAFT_KEY); } catch {}
            swalBase.fire({ icon: "success", title: "¡Pago exitoso!", text: "Tu pedido fue pagado con Mercado Pago.", timer: 3000, showConfirmButton: false });
        } else if (pago === "error") {
            swalBase.fire({ icon: "error", title: "Pago rechazado", text: "Hubo un problema con el pago. Podés intentar de nuevo." });
        } else if (pago === "pendiente") {
            swalBase.fire({ icon: "warning", title: "Pago pendiente", text: "Tu pago está siendo procesado. Te avisaremos cuando esté confirmado." });
        }
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaSeleccionada]);

    useEffect(() => {
        try {
            if (Object.keys(items).length > 0) {
                localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(items));
            } else {
                localStorage.removeItem(CART_DRAFT_KEY);
            }
        } catch {}
    }, [items]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/cliente/perfil", { cache: "no-store" });
                const data = await res.json();
                if (res.ok) {
                    if (data?.direccion) {
                        setDireccionPrincipal(data.direccion);
                        setDireccionEnvio(data.direccion);
                    }
                    if (data?.telefono) setTelefono(data.telefono);
                }
            } catch (err) {
                console.error("Error cargando perfil del usuario:", err);
            }
        })();
    }, []);

    useEffect(() => {
        fetch("/api/config/envio", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => setCostoEnvio(d.costoEnvio ?? 0))
            .catch(() => {});
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const cfg = await fetch("/api/config/pedidos", { cache: "no-store" }).then((r) => r.json());
                setActivo(cfg.activo);
                if (cfg.activo) {
                    const data = await fetch("/api/menu?cliente=true").then(r => r.json());
                    setMenu(data);
                }
            } catch (error) {
                console.error("Error cargando configuración de pedidos:", error);
            } finally {
                setCargandoConfig(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!cargandoConfig && !activo) router.replace("/");
    }, [activo, cargandoConfig, router]);

    async function pedirTelefono(): Promise<boolean> {
        const { value, isConfirmed } = await swalBase.fire({
            title: "📱 Número de WhatsApp",
            html: '<p class="text-sm text-gray-500 mb-1">Lo necesitamos para confirmarte el pedido.</p>',
            input: "text",
            inputPlaceholder: "Ej: 3492123456",
            inputAttributes: { inputmode: "numeric", pattern: "[0-9]*", autocomplete: "tel" },
            showCancelButton: true,
            confirmButtonText: "Guardar y continuar",
            cancelButtonText: "Cancelar",
            inputValidator: (v) => {
                if (!v) return "Ingresá tu número";
                if (!/^\d+$/.test(v)) return "Solo se permiten números";
                if (v.length < 8) return "El número es muy corto";
                if (v.length > 10) return "El número no puede tener más de 10 dígitos";
            },
        });

        if (!isConfirmed || !value) return false;

        await fetch("/api/cliente/telefono", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefono: value }),
        });
        setTelefono(value);
        return true;
    }

    async function enviarPedido() {
        const seleccion = Object.entries(items)
            .filter(([_, cant]) => cant > 0)
            .map(([id, cant]) => ({ menuItemId: id, cantidad: cant, nota: notasProducto[id]?.trim() || undefined }));

        if (seleccion.length === 0)
            return swalBase.fire("⚠️", "Seleccioná al menos un ítem", "warning");
        if (tipoEntrega === "envio" && !(direccionEnvio || direccionPrincipal))
            return swalBase.fire("⚠️", "Ingresá una dirección de envío", "warning");

        // Doble confirmación
        const totalFinalConfirm = total + (tipoEntrega === "envio" ? costoEnvio : 0);
        const { isConfirmed } = await swalBase.fire({
            title: "¿Confirmás el pedido?",
            html: `<p class="text-gray-600 text-sm">Total: <strong>$${formatPrice(totalFinalConfirm)}</strong>${tipoEntrega === "envio" ? " · Con envío a domicilio" : " · Retirás en el bar"}</p>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, confirmar",
            cancelButtonText: "Revisar",
        });
        if (!isConfirmed) return;

        // Verificar teléfono
        const telLimpio = telefono.replace(/\D/g, "");
        if (!telLimpio || telLimpio.length < 8) {
            const ok = await pedirTelefono();
            if (!ok) return;
        }

        try {
            setEnviando(true);
            const res = await fetch("/api/pedidos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: seleccion,
                    tipoEntrega,
                    direccion: tipoEntrega === "envio" ? direccionEnvio || direccionPrincipal || "" : undefined,
                    lat: tipoEntrega === "envio" && mapLat ? mapLat : undefined,
                    lng: tipoEntrega === "envio" && mapLng ? mapLng : undefined,
                    horarioPreferido: horarioPreferido.trim() || undefined,
                }),
            });

            if (res.ok) {
                setDrawerOpen(false);
                await swalBase.fire({ icon: "success", title: "Pedido enviado correctamente", timer: 2000, showConfirmButton: false });
                setItems({});
                setHorarioPreferido("");
                setNotasProducto({});
                setMapLat(null);
                setMapLng(null);
            } else {
                swalBase.fire("❌", "Error al enviar el pedido", "error");
            }
        } catch {
            swalBase.fire("❌", "Error de conexión", "error");
        } finally {
            setEnviando(false);
        }
    }

    const vaciarCarrito = () => {
        setItems({});
        setDrawerOpen(false);
    };

    const eliminarProducto = (id: string) => {
        setItems((prev) => { const u = { ...prev }; delete u[id]; return u; });
    };

    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);
    const total = menu.reduce((acc, item) => acc + item.precio * (items[item._id] || 0), 0);
    const totalFinal = total + (tipoEntrega === "envio" ? costoEnvio : 0);

    if (cargandoConfig) return <div className="flex justify-center items-center py-12"><Loader size={40} /></div>;

    if (!activo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <UtensilsCrossed size={50} className="mb-4 text-red-600" />
                <h2 className="text-xl font-semibold mb-2 text-black">Pedidos no disponibles</h2>
                <p className="text-gray-500">En este momento no se están tomando pedidos.</p>
            </div>
        );
    }

    const catDbImage = (cat: string) => menu.find((i) => i.categoria === cat && i.imagen)?.imagen ?? null;
    const getImage = (cat: string) => {
        const cfg = categoryConfigMap[cat];
        return cfg?.imageUrl || categoryImages[cat] || catDbImage(cat);
    };
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";

    const categoriasNavegacion = [
        ...(menu.some(i => i.categoria === "MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...MAIN_ORDER.filter(cat => {
            if (cat === "BEBIDAS") return BEBIDAS_CATS.some(bc => menu.some(i => i.categoria === bc));
            return menu.some(i => i.categoria === cat);
        }),
    ];

    const cartDrawerProps: CartDrawerProps = {
        items, menu, tipoEntrega, setTipoEntrega,
        direccionPrincipal, direccionEnvio, setDireccionEnvio,
        usarOtraDireccion, setUsarOtraDireccion,
        horarioPreferido, setHorarioPreferido,
        notasProducto,
        onSetNotaProducto: (id, nota) => setNotasProducto(prev => ({ ...prev, [id]: nota })),
        onSelectCoords: (lat, lng) => { setMapLat(lat); setMapLng(lng); },
        enviando, total, costoEnvio,
        onClose: () => setDrawerOpen(false),
        onVaciar: vaciarCarrito,
        onEliminar: eliminarProducto,
        onEnviar: enviarPedido,
    };

    function CartButton() {
        return (
            <AnimatePresence>
                {totalItems > 0 && (
                    <div className="fixed bottom-32 right-5 z-[9999]">
                        <motion.button
                            layout
                            initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            onClick={() => setDrawerOpen(true)}
                            className="relative px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-3 font-bold text-lg active:scale-95 border border-white/10"
                        >
                            <div className="relative flex items-center justify-center">
                                <ShoppingCart size={28} strokeWidth={2.4} />
                                <motion.span key={totalItems} initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                                    {totalItems}
                                </motion.span>
                            </div>
                            <span className="font-extrabold">${formatPrice(totalFinal)}</span>
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const bg = getImage(cat);
        const pos = getPosition(cat);
        const isSpecial = cat === "MENÚ DEL DÍA";
        const count = cat === "BEBIDAS"
            ? menu.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : menu.filter(i => i.categoria === cat).length;
        return (
            <motion.button onClick={onClick} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`relative w-full rounded-2xl overflow-hidden shadow-md active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2 h-56" : "h-36"}`}>
                {bg ? <MenuImg src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} /> : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />}
                <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-black/75 via-black/10 to-transparent" : "from-black/85 via-black/30 to-black/10"}`} />
                {isSpecial && <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>}
                <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                    <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-[11px] font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    /* ── Vista de categorías principales ── */
    if (!categoriaSeleccionada) {
        return (
            <div className="bg-white min-h-screen pb-10">
                <div className="px-5 pt-6 pb-4">
                    <h1 className="text-3xl font-black text-black tracking-tight mb-1">Realizar Pedido</h1>
                    <p className="text-sm text-gray-400">Elegí una categoría</p>
                </div>
                <div className="px-5 grid grid-cols-2 gap-3">
                    {categoriasNavegacion.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaSeleccionada(cat)} />
                    ))}
                </div>
                <Portal>
                    <CartButton />
                    <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
                </Portal>
            </div>
        );
    }

    /* ── Vista de subcategorías de Bebidas ── */
    if (categoriaSeleccionada === "BEBIDAS") {
        const subCats = BEBIDAS_CATS.filter(bc => menu.some(i => i.categoria === bc));
        return (
            <div className="bg-white min-h-screen pb-10">
                <div className="sticky top-0 z-10 bg-white shadow-sm">
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                        <button onClick={() => setCategoriaSeleccionada(null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                            <ChevronLeft size={22} className="text-gray-800" />
                        </button>
                        <Beer size={18} className="text-red-600 shrink-0" />
                        <h1 className="font-black text-xl text-black tracking-tight flex-1">Bebidas</h1>
                        {totalItems > 0 && (
                            <button onClick={() => setDrawerOpen(true)} className="relative p-2">
                                <ShoppingCart size={24} className="text-gray-800" />
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalItems}</span>
                            </button>
                        )}
                    </div>
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
                        {categoriasNavegacion.map(cat => (
                            <button key={cat} onClick={() => setCategoriaSeleccionada(cat)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${cat === "BEBIDAS" ? "bg-black text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-5 py-5 grid grid-cols-2 gap-3">
                    {subCats.map((cat, idx) => (
                        <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaSeleccionada(cat)} />
                    ))}
                </div>
                <Portal>
                    <CartButton />
                    <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
                </Portal>
            </div>
        );
    }

    /* ── Vista de ítems de categoría ── */
    const esBebida = BEBIDAS_CATS.includes(categoriaSeleccionada);
    const CatIcon = categoryIcons[categoriaSeleccionada] || UtensilsCrossed;
    let productos = menu
        .filter((i) => i.categoria === categoriaSeleccionada)
        .sort((a, b) => {
            const diff = ((a as any).order ?? 0) - ((b as any).order ?? 0);
            if (diff !== 0) return diff;
            if (categoriaSeleccionada === "PIZZAS") {
                const aH = a.nombre.trim().startsWith("1/2");
                const bH = b.nombre.trim().startsWith("1/2");
                return aH === bH ? 0 : aH ? 1 : -1;
            }
            return 0;
        });

    const subCatsBebidas = BEBIDAS_CATS.filter(bc => menu.some(i => i.categoria === bc));
    const stripCats = esBebida ? subCatsBebidas : categoriasNavegacion;

    return (
        <div className="bg-white min-h-screen">
            <div className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                    <button onClick={() => setCategoriaSeleccionada(esBebida ? "BEBIDAS" : null)} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ChevronLeft size={22} className="text-gray-800" />
                    </button>
                    <CatIcon size={18} className="text-red-600 shrink-0" />
                    <h1 className="font-black text-xl text-black tracking-tight flex-1">{categoriaSeleccionada}</h1>
                    {totalItems > 0 && (
                        <button onClick={() => setDrawerOpen(true)} className="relative p-2">
                            <ShoppingCart size={24} className="text-gray-800" />
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalItems}</span>
                        </button>
                    )}
                </div>
                <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: "none" }}>
                    {stripCats.map(cat => (
                        <button key={cat} onClick={() => setCategoriaSeleccionada(cat)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${cat === categoriaSeleccionada ? "bg-black text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={categoriaSeleccionada} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
                    className="px-5 py-5 pb-32">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {productos.map((item) => (
                            <div key={item._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
                                {item.imagen && (
                                    <div className="relative h-40 w-full overflow-hidden">
                                        <img src={item.imagen} alt={item.nombre} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-1 justify-between">
                                    <div>
                                        <p className="font-semibold text-base text-black leading-tight mb-1">{item.nombre}</p>
                                        {item.descripcion && <p className="text-xs text-gray-500 mb-2 leading-snug">{item.descripcion}</p>}
                                        <span className="inline-block bg-red-50 text-red-600 font-extrabold text-sm px-3 py-1 rounded-full">
                                            ${formatPrice(item.precio)}
                                        </span>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <button onClick={() => setItems((p) => ({ ...p, [item._id]: Math.max((p[item._id] || 0) - 1, 0) }))}
                                                className="w-11 h-11 text-red-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition">−</button>
                                            <span className="w-10 text-center text-lg font-semibold text-black">{items[item._id] || 0}</span>
                                            <button onClick={() => setItems((p) => ({ ...p, [item._id]: (p[item._id] || 0) + 1 }))}
                                                className="w-11 h-11 text-red-500 text-xl font-bold flex items-center justify-center hover:bg-gray-100 transition">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            <Portal>
                <CartButton />
                <AnimatePresence>{drawerOpen && <CartDrawer {...cartDrawerProps} />}</AnimatePresence>
            </Portal>
        </div>
    );
}
