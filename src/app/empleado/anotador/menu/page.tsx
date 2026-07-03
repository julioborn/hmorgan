"use client";
import { Suspense } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import {
    UtensilsCrossed, Pizza, Beef, Sandwich, Salad, Beer,
    CupSoda, Martini, BottleWine, GlassWater, Beaker,
    CakeSlice, Hamburger, Milk, Plus, Minus, ShoppingCart,
    Send, ChevronLeft, CheckCircle, Printer, X, MapPin, ChevronDown, Star, QrCode, User,
} from "lucide-react";
import Loader from "@/components/Loader";
import MenuImg from "@/components/MenuImg";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";
import { swalBase } from "@/lib/swalConfig";

type MenuItem = { _id: string; nombre: string; descripcion?: string; precio: number; categoria: string; imagen?: string; activo: boolean; order?: number };
type CartItem  = { menuItemId: string; nombre: string; precio: number; cantidad: number; nota?: string };
type ActiveOrder = {
    _id: string;
    items: { menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number }[];
    total: number;
    mesa: string;
    comensales?: number;
    nombreComanda?: string;
    notaEmpleado?: string;
};
type MesaPlano   = { _id: string; nombre: string; activa: boolean; x: number; y: number; forma: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string };
type SalonElPlano = { _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string };

const formatPrice = (v: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const PICAR_CATS   = ["PICADAS", "FRITURAS"];
const MAIN_ORDER   = ["PARRILLA","PIZZAS","HAMBURGUESAS","SANDWICHES","PICADAS Y FRITURAS","ENSALADAS","BEBIDAS","POSTRE Y CAFE"];
const categoryImages: Record<string, string> = { PARRILLA:"/parrilla.jpg", PIZZAS:"/pizzas.jpg", HAMBURGUESAS:"/hamburguesas.jpg", SANDWICHES:"/sandwiches.jpg", "PICADAS Y FRITURAS":"/picada.jpg", ENSALADAS:"/ensaladas.jpg", BEBIDAS:"/bebidas.jpeg","POSTRE Y CAFE":"/postreycafe.jpeg", CERVEZAS:"/subcategoria-bebidas/cervezas.png", VINOS:"/subcategoria-bebidas/vinos.png", GASEOSAS:"/subcategoria-bebidas/gaseosas.png", JARROS:"/subcategoria-bebidas/jarros.png", COCKTAILS:"/subcategoria-bebidas/cocktails.png", WHISKY:"/subcategoria-bebidas/whisky.png", MEDIDAS:"/subcategoria-bebidas/medidas.png" };
const categoryIcons: Record<string, React.ElementType> = { PARRILLA:Beef, PIZZAS:Pizza, HAMBURGUESAS:Hamburger, SANDWICHES:Sandwich, PICADAS:UtensilsCrossed, ENSALADAS:Salad, FRITURAS:UtensilsCrossed, BEBIDAS:Beer, CERVEZAS:Beer, VINOS:BottleWine, GASEOSAS:Milk, JARROS:CupSoda, COCKTAILS:Martini, WHISKY:GlassWater, MEDIDAS:Beaker, "POSTRE Y CAFE":CakeSlice };

type Comensal = { _id: string; nombre: string; apellido: string; username: string };

function ComensalesSelector({
    clienteSearch, setClienteSearch, clienteResults, setClienteResults,
    comensalesSeleccionados, setComensalesSeleccionados, onScanQr,
}: {
    clienteSearch: string;
    setClienteSearch: (v: string) => void;
    clienteResults: Comensal[];
    setClienteResults: (v: Comensal[]) => void;
    comensalesSeleccionados: Comensal[];
    setComensalesSeleccionados: (fn: (prev: Comensal[]) => Comensal[]) => void;
    onScanQr: () => void;
}) {
    const remaining = clienteResults.filter(c => !comensalesSeleccionados.some(s => s._id === c._id));
    return (
        <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Comensales <span className="font-normal normal-case text-gray-300">(suman puntos al cobrar)</span>
            </p>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o usuario..."
                        value={clienteSearch}
                        onChange={e => setClienteSearch(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-red-400"
                    />
                    {remaining.length > 0 && clienteSearch.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-2xl shadow-lg mt-1 overflow-hidden">
                            {remaining.map(c => (
                                <button key={c._id} onMouseDown={e => e.preventDefault()} onClick={() => {
                                    setComensalesSeleccionados(prev => [...prev, c]);
                                    setClienteSearch("");
                                    setClienteResults([]);
                                }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm transition border-b border-gray-50 last:border-0">
                                    <span className="font-semibold text-gray-900">{c.nombre} {c.apellido}</span>
                                    <span className="text-gray-400 ml-2 text-xs">@{c.username}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={onScanQr} title="Escanear QR del cliente"
                    className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0 hover:bg-gray-700 transition active:scale-95">
                    <QrCode size={20} />
                </button>
            </div>
            {comensalesSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {comensalesSeleccionados.map(c => (
                        <div key={c._id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1.5 text-xs font-semibold">
                            <CheckCircle size={11} className="shrink-0 text-emerald-600" />
                            <span>{c.nombre} {c.apellido}</span>
                            {c.username && <span className="text-emerald-500 text-[10px]">@{c.username}</span>}
                            <button onClick={() => setComensalesSeleccionados(prev => prev.filter(s => s._id !== c._id))}
                                className="ml-0.5 text-emerald-500 hover:text-red-500 transition font-bold leading-none">×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AnotadorMenuContent() {
    const categoryConfigMap = useCategoryConfigs();
    const { user, loading }   = useAuth();
    const router              = useRouter();
    const searchParams        = useSearchParams();
    const comandaId           = searchParams.get("id");      // null = nueva comanda
    const eventoIdParam       = searchParams.get("eventoId"); // null = comanda normal
    const [step, setStep]    = useState<"info"|"menu">(comandaId ? "menu" : "info");

    const [menuItems, setMenuItems]     = useState<MenuItem[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [cart, setCart]               = useState<CartItem[]>([]);
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [enviando, setEnviando]       = useState(false);
    const [error, setError]             = useState("");
    const [lastOrder, setLastOrder]     = useState<{ items: CartItem[]; mesa: string; timestamp: Date } | null>(null);

    // Comanda activa (si viene con id)
    const [comanda, setComanda]         = useState<ActiveOrder | null>(null);
    const [loadingComanda, setLoadingComanda] = useState(!!comandaId);

    // Campos del panel
    const [mesas, setMesas]             = useState<string[]>([]);
    const [comensales, setComensales]   = useState(2);
    const [clienteNombre, setClienteNombre] = useState("");
    const [clienteSearch, setClienteSearch] = useState("");
    const [clienteResults, setClienteResults] = useState<{_id:string;nombre:string;apellido:string;username:string}[]>([]);
    const [comensalesSeleccionados, setComensalesSeleccionados] = useState<{_id:string;nombre:string;apellido:string;username:string}[]>([]);
    const clienteInputRef               = useRef<HTMLInputElement>(null);

    // QR scan
    const [qrScanOpen, setQrScanOpen]   = useState(false);
    const [qrScanError, setQrScanError] = useState("");
    const [qrTokenManual, setQrTokenManual] = useState("");
    const [qrLookingUp, setQrLookingUp] = useState(false);
    const videoRef  = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Evento activo
    const [eventoActivo, setEventoActivo] = useState<{_id:string;nombre:string} | null>(null);

    // Mesa picker
    const [mesaPickerOpen, setMesaPickerOpen] = useState(false);
    const [mesasPlano, setMesasPlano]         = useState<MesaPlano[]>([]);
    const [elementsPlano, setElementsPlano]   = useState<SalonElPlano[]>([]);
    const [ocupadasPlano, setOcupadasPlano]     = useState<Set<string>>(new Set());
    const [reservadasPlano, setReservadasPlano] = useState<Set<string>>(new Set());
    const [eventosPlano, setEventosPlano]       = useState<string[]>([]); // nombres de mesas con evento
    // Zoom del plano
    const [mapScale, setMapScale]   = useState(1);
    const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
    const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
    const panRef   = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!loading && user && !["empleado", "cajero", "admin", "superadmin"].includes(user.role)) router.replace("/");
    }, [user, loading, router]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [categoriaActiva]);

    useEffect(() => {
        fetch("/api/menu?bar=true").then(r => r.json()).then(d => {
            setMenuItems(Array.isArray(d) ? d : []);
        }).catch(() => {}).finally(() => setLoadingMenu(false));
    }, []);

    useEffect(() => {
        if (!eventoIdParam) { setEventoActivo(null); return; }
        fetch(`/api/eventos/${eventoIdParam}`, { credentials: "include" })
            .then(r => r.json())
            .then(d => d._id ? setEventoActivo({ _id: d._id, nombre: d.nombre }) : setEventoActivo(null))
            .catch(() => setEventoActivo(null));
    }, [eventoIdParam]);

    // Cargar comanda existente si hay id
    useEffect(() => {
        if (!comandaId) return;
        fetch(`/api/pedidos/${comandaId}`, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                setComanda(d);
                if (d.mesa) setMesas(d.mesa.split(", ").filter(Boolean));
                if (d.comensales) setComensales(d.comensales);
                if (d.nombreComanda) setClienteNombre(d.nombreComanda);
            })
            .catch(() => {})
            .finally(() => setLoadingComanda(false));
    }, [comandaId]);

    // ── SessionStorage: persistir cart si se navega/recarga ──────
    const CART_KEY = `anotador_cart_${comandaId || "new"}`;
    // Restaurar al montar
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(CART_KEY);
            if (!saved) return;
            const { cart: sc, mesas: sm, comensales: scm, clienteNombre: sn, comensalesSeleccionados: scs } = JSON.parse(saved);
            if (Array.isArray(sc) && sc.length > 0) {
                setCart(sc);
                if (!comandaId) setStep("menu"); // borrador existente → saltar info
            }
            if (Array.isArray(sm) && sm.length > 0 && !comandaId) setMesas(sm);
            if (scm && !comandaId) setComensales(scm);
            if (sn) setClienteNombre(sn);
            if (Array.isArray(scs) && scs.length > 0) setComensalesSeleccionados(scs);
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Guardar cuando cambia el cart
    useEffect(() => {
        if (cart.length > 0) {
            sessionStorage.setItem(CART_KEY, JSON.stringify({ cart, mesas, comensales, clienteNombre, comensalesSeleccionados }));
        } else {
            sessionStorage.removeItem(CART_KEY);
        }
    }, [cart, mesas, comensales, clienteNombre, comensalesSeleccionados, CART_KEY]);

    // Reset zoom al abrir el picker
    useEffect(() => {
        if (mesaPickerOpen) { setMapScale(1); setMapOffset({ x: 0, y: 0 }); }
    }, [mesaPickerOpen]);

    // Búsqueda cliente con debounce
    useEffect(() => {
        if (clienteSearch.length < 2) { setClienteResults([]); return; }
        const t = setTimeout(async () => {
            const r = await fetch(`/api/empleado/buscar-cliente?q=${encodeURIComponent(clienteSearch)}`, { credentials: "include" });
            const d = await r.json().catch(() => []);
            setClienteResults(Array.isArray(d) ? d : []);
        }, 400);
        return () => clearTimeout(t);
    }, [clienteSearch]);

    // QR scan: abrir cámara y escanear con BarcodeDetector
    useEffect(() => {
        if (!qrScanOpen) {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            setQrScanError("");
            setQrTokenManual("");
            return;
        }
        let active = true;
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;

                const detector = typeof (window as any).BarcodeDetector !== "undefined"
                    ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
                    : null;
                if (!detector) { setQrScanError("Usá el campo manual o Chrome/Edge en Android para escanear"); return; }

                const scan = async () => {
                    if (!active || !videoRef.current) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            const raw = barcodes[0].rawValue as string;
                            await lookupQrRaw(raw);
                            return;
                        }
                    } catch { /* ignorar frames inválidos */ }
                    if (active) requestAnimationFrame(scan);
                };
                videoRef.current?.addEventListener("loadeddata", () => { if (active) requestAnimationFrame(scan); }, { once: true });
            } catch {
                setQrScanError("No se pudo acceder a la cámara");
            }
        })();
        return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrScanOpen]);

    async function lookupQrRaw(raw: string) {
        try {
            const parsed = JSON.parse(raw);
            const token = parsed.qrToken as string;
            if (!token) { setQrScanError("QR inválido"); return; }
            await lookupByQrToken(token);
        } catch {
            setQrScanError("QR inválido — no es un código de H. Morgan");
        }
    }

    async function lookupByQrToken(token: string) {
        setQrLookingUp(true);
        setQrScanError("");
        try {
            const r = await fetch(`/api/usuarios/qr/${encodeURIComponent(token)}`, { credentials: "include" });
            if (!r.ok) { setQrScanError("Usuario no encontrado"); return; }
            const u = await r.json();
            const nuevo = { _id: u._id, nombre: u.nombre, apellido: u.apellido ?? "", username: u.username ?? "" };
            setComensalesSeleccionados(prev => prev.some(c => c._id === u._id) ? prev : [...prev, nuevo]);
            setQrScanOpen(false);
        } catch {
            setQrScanError("Error al buscar usuario");
        } finally { setQrLookingUp(false); }
    }

    function onMapTouchStart(e: React.TouchEvent) {
        if (e.touches.length === 2) {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            pinchRef.current = {
                dist: Math.sqrt(dx*dx + dy*dy),
                midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
            panRef.current = null;
        } else if (e.touches.length === 1) {
            panRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            pinchRef.current = null;
        }
    }
    function onMapTouchMove(e: React.TouchEvent) {
        e.preventDefault();
        if (e.touches.length === 2 && pinchRef.current) {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const factor = dist / pinchRef.current.dist;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const prevMidX = pinchRef.current.midX;
            const prevMidY = pinchRef.current.midY;
            setMapScale(s => Math.max(1, Math.min(5, s * factor)));
            // Zoom hacia donde están los dedos + pan simultáneo
            setMapOffset(o => ({
                x: midX - (prevMidX - o.x) * factor,
                y: midY - (prevMidY - o.y) * factor,
            }));
            pinchRef.current = { dist, midX, midY };
        } else if (e.touches.length === 1 && panRef.current) {
            const dx = e.touches[0].clientX - panRef.current.x;
            const dy = e.touches[0].clientY - panRef.current.y;
            setMapOffset(o => ({ x: o.x + dx, y: o.y + dy }));
            panRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }
    function onMapTouchEnd(e: React.TouchEvent) {
        if (e.touches.length < 2) pinchRef.current = null;
        if (e.touches.length === 0) panRef.current = null;
    }

    async function openMesaPicker() {
        setMesaPickerOpen(true);
        const [mRes, elRes, pRes, evRes, resRes] = await Promise.all([
            fetch("/api/admin/mesas?all=true", { credentials: "include" }),
            fetch("/api/superadmin/salon", { credentials: "include" }),
            fetch("/api/pedidos?activos=true", { credentials: "include" }),
            fetch("/api/eventos?activo=true", { credentials: "include" }),
            fetch("/api/reservas", { credentials: "include" }),
        ]);
        const [mData, elData, pData, evData, resData] = await Promise.all([
            mRes.json(), elRes.json(), pRes.json(), evRes.json(), resRes.json(),
        ]);
        setMesasPlano(Array.isArray(mData) ? mData : []);
        setElementsPlano(Array.isArray(elData) ? elData : []);
        if (Array.isArray(pData)) {
            const ocupadas = new Set<string>();
            pData
                .filter((p: any) => p.mesa && !["pendiente", "cancelado", "cerrado"].includes(p.estado))
                .forEach((p: any) => String(p.mesa).split(",").forEach(n => ocupadas.add(n.trim())));
            setOcupadasPlano(ocupadas);
        }
        if (Array.isArray(evData))
            setEventosPlano(evData.flatMap((e: any) => e.mesas ?? []));
        if (Array.isArray(resData)) {
            const hoy = new Date().toLocaleDateString("sv-SE");
            setReservadasPlano(new Set(
                resData
                    .filter((r: any) => r.mesaId && r.estado !== "cancelada" && String(r.fecha).slice(0, 10) === hoy)
                    .map((r: any) => typeof r.mesaId === "object" ? r.mesaId.nombre : "")
                    .filter(Boolean)
            ));
        }
    }

    function addToCart(item: MenuItem) {
        setCart(prev => {
            const ex = prev.find(c => c.menuItemId === item._id);
            if (ex) return prev.map(c => c.menuItemId === item._id ? { ...c, cantidad: c.cantidad + 1 } : c);
            return [...prev, { menuItemId: item._id, nombre: item.nombre, precio: item.precio, cantidad: 1 }];
        });
    }
    function removeFromCart(id: string) {
        setCart(prev => {
            const ex = prev.find(c => c.menuItemId === id);
            if (!ex) return prev;
            if (ex.cantidad === 1) return prev.filter(c => c.menuItemId !== id);
            return prev.map(c => c.menuItemId === id ? { ...c, cantidad: c.cantidad - 1 } : c);
        });
    }
    function getQty(id: string) { return cart.find(c => c.menuItemId === id)?.cantidad || 0; }

    const total      = cart.reduce((a, i) => a + i.precio * i.cantidad, 0);
    const totalItems = cart.reduce((a, i) => a + i.cantidad, 0);

    async function enviarPedido() {
        if (cart.length === 0) return;
        const esAgregado = !!(comandaId && comanda);
        const confirm = await swalBase.fire({
            title: esAgregado ? "¿Agregar a la comanda?" : "¿Enviar pedido a la caja?",
            text: esAgregado
                ? "Se va a agregar directo a la comanda en preparación."
                : "Se va a enviar directo a la caja y a la cocina/barra. Revisá los ítems antes de confirmar.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: esAgregado ? "Sí, agregar" : "Sí, enviar",
            cancelButtonText: "Revisar de nuevo",
        });
        if (!confirm.isConfirmed) return;

        setEnviando(true); setError("");
        try {
            let res: Response;
            if (comandaId && comanda) {
                res = await fetch(`/api/pedidos/${comandaId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        items: cart.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad, nota: c.nota?.trim() || undefined })),
                    }),
                });
            } else {
                res = await fetch("/api/pedidos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        items: cart.map(c => ({ menuItemId: c.menuItemId, cantidad: c.cantidad, nota: c.nota?.trim() || undefined })),
                        tipoEntrega: "retira",
                        fuente: "empleado",
                        mesa:          eventoActivo ? undefined : (mesas.join(", ") || undefined),
                        comensales:    eventoActivo ? undefined : (totalComensales || undefined),
                        nombreComanda: clienteNombre.trim() || undefined,
                        eventoId:      eventoActivo?._id || undefined,
                        comensalesIds: comensalesSeleccionados.length > 0 ? comensalesSeleccionados.map(c => c._id) : undefined,
                    }),
                });
            }
            if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.message || e.error || "Error"); return; }
            sessionStorage.removeItem(CART_KEY);
            setLastOrder({ items: [...cart], mesa: mesas.join(", ") || comanda?.mesa || "", timestamp: new Date() });
            setCart([]);
            // Volver a comandas después de un momento
            const destino = user?.role === "cajero" ? "/caja" : "/empleado/anotador";
            setTimeout(() => router.replace(destino), 1800);
        } catch { setError("Error de conexión"); }
        finally { setEnviando(false); }
    }

    function printComanda(order: { items: CartItem[]; mesa: string; timestamp: Date }) {
        const hora = order.timestamp.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const rows = order.items.map(i => `<div class="item"><span class="qty">${i.cantidad}x</span><span>${i.nombre}</span></div>`).join("");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:16px;letter-spacing:3px;margin-bottom:2px}.sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            .mesa{text-align:center;font-size:15px;font-weight:bold;padding:4px 0}hr{border:none;border-top:1px dashed #000;margin:6px 0}
            .item{display:flex;gap:8px;padding:3px 0}.qty{font-weight:bold;min-width:26px}
        </style></head><body>
        <h2>★ COMANDA ★</h2><div class="sub">H. Morgan Bar</div>
        <div class="mesa">${order.mesa ? `MESA ${order.mesa}` : "SIN MESA"}</div>
        <div class="sub">${hora}</div><hr/>${rows}<hr/>
        </body></html>`;
        const w = window.open("", "_blank", "width=320,height=400,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    // Interceptar botón atrás del dispositivo para navegar dentro del menú
    const isPopNav = useRef(false);
    useEffect(() => {
        if (categoriaActiva !== null && !isPopNav.current) {
            window.history.pushState(null, '');
        }
        isPopNav.current = false;
    }, [categoriaActiva]);
    useEffect(() => {
        const onPop = () => {
            if (categoriaActiva !== null) {
                isPopNav.current = true;
                const esBeb = BEBIDAS_CATS.includes(categoriaActiva);
                setCategoriaActiva(categoriaActiva === "BEBIDAS" ? null : esBeb ? "BEBIDAS" : null);
            }
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [categoriaActiva]);

    if (loading || loadingMenu || loadingComanda) return <div className="flex justify-center py-20"><Loader size={64} /></div>;
    if (!user) return null;

    const getImage    = (cat: string) => { const cfg = categoryConfigMap[cat]; return cfg?.imageUrl || categoryImages[cat] || null; };
    const getPosition = (cat: string) => categoryConfigMap[cat]?.imagePosition || "50% 50%";
    const todasCats = Array.from(new Set(menuItems.map(i => i.categoria)));
    const categoriasNav = [
        ...(menuItems.some(i => i.categoria === "MENÚ DEL DÍA") ? ["MENÚ DEL DÍA"] : []),
        ...MAIN_ORDER.filter(cat =>
            cat === "BEBIDAS"    ? BEBIDAS_CATS.some(bc => menuItems.some(i => i.categoria === bc)) :
            cat === "PICADAS Y FRITURAS" ? PICAR_CATS.some(pc => menuItems.some(i => i.categoria === pc)) :
            menuItems.some(i => i.categoria === cat)),
        ...todasCats.filter(cat => !MAIN_ORDER.includes(cat) && !BEBIDAS_CATS.includes(cat) && !PICAR_CATS.includes(cat) && cat !== "MENÚ DEL DÍA"),
    ];

    const mesaActual = comanda?.mesa || mesas.join(", ");

    // Helpers banqueta / multi-mesa
    const isBanqueta    = (nombre: string) => mesasPlano.find(m => m.nombre === nombre)?.tipo === "banqueta";
    const displayNombre = (nombre: string) => isBanqueta(nombre) ? `Banqueta ${nombre}` : `Mesa ${nombre}`;
    const banquetasSelec  = mesas.filter(isBanqueta);
    const mesasRegulares  = mesas.filter(n => !isBanqueta(n));
    const solobanquetas   = banquetasSelec.length > 0 && mesasRegulares.length === 0;
    const totalComensales = banquetasSelec.length + (mesasRegulares.length > 0 || mesas.length === 0 ? comensales : 0);

    // ── CartPanel como JSX (NO como función-componente anidada)
    // Si fuera function CartPanel() {}, React la recrearía en cada render →
    // desmonta/remonta el DOM → los inputs pierden el foco → teclado baja.
    const cartPanelJSX = (cart.length === 0 && !comanda) ? null : (
        <div className="bg-white border-b border-gray-200 shadow-sm px-4 pt-3 pb-3">
            <div className="max-w-2xl mx-auto space-y-2">

                {/* Resumen mesa/comensales/nombre (solo nueva comanda en step menú) */}
                {!comandaId && (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs">
                        {eventoActivo ? (
                            <>
                                <Star className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="font-bold text-amber-700 truncate">Evento: {eventoActivo.nombre}</span>
                                {clienteNombre && <span className="text-gray-500 truncate">· {clienteNombre}</span>}
                                {comensalesSeleccionados.length > 0 && <span className="text-emerald-600 text-[10px] font-bold shrink-0">· {comensalesSeleccionados.length}p puntos</span>}
                            </>
                        ) : (
                            <>
                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="font-bold text-gray-800 truncate">{mesas.length > 0 ? mesas.map(displayNombre).join(", ") : "Sin mesa"}</span>
                                <span className="text-gray-400 shrink-0">· {totalComensales}p</span>
                                {clienteNombre && <span className="text-gray-500 truncate">· {clienteNombre}</span>}
                                {comensalesSeleccionados.length > 0 && <span className="text-emerald-600 text-[10px] font-bold shrink-0">· {comensalesSeleccionados.length} reg.</span>}
                            </>
                        )}
                        <button onClick={() => setStep("info")} className="ml-auto text-red-500 font-semibold shrink-0 hover:text-red-700 transition">Cambiar</button>
                    </div>
                )}

                {/* Comanda context */}
                {comandaId && comanda && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                        <span className="font-bold text-amber-800">
                            {comanda.mesa ? `Mesa ${comanda.mesa} -` : "Sin mesa -"}
                            {comanda.comensales ? <span className="inline-flex items-center gap-0.5 ml-1">{comanda.comensales}<User size={11} /></span> : ""}
                        </span>
                        <span className="text-amber-600">· comanda activa · ${formatPrice(comanda.total)}</span>
                    </div>
                )}

                {/* Items del carrito — ticket style */}
                {cart.length > 0 && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-3 py-1.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {comandaId ? "Agregar a comanda" : "Nuevo pedido"}
                            </p>
                        </div>
                        <div className="bg-white px-3 py-2 space-y-1.5">
                            {cart.map(c => (
                                <div key={c.menuItemId} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => removeFromCart(c.menuItemId)} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs transition">−</button>
                                                <span className="text-sm font-bold text-gray-900 w-5 text-center">{c.cantidad}</span>
                                                <button onClick={() => setCart(prev => prev.map(x => x.menuItemId === c.menuItemId ? { ...x, cantidad: x.cantidad + 1 } : x))} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs transition">+</button>
                                            </div>
                                            <span className="text-sm text-gray-800 truncate">{c.nombre}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 shrink-0 ml-2">${formatPrice(c.precio * c.cantidad)}</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nota"
                                        value={c.nota || ""}
                                        onChange={e => setCart(prev => prev.map(x => x.menuItemId === c.menuItemId ? { ...x, nota: e.target.value } : x))}
                                        className="w-full text-xs px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400 text-gray-700 placeholder:text-gray-300"
                                    />
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 mt-1">
                                <span className="text-xs font-black text-gray-900">SUBTOTAL ${formatPrice(total)}</span>
                                <button onClick={() => { setCart([]); sessionStorage.removeItem(CART_KEY); if (!comandaId) router.push("/empleado/anotador"); }}
                                    className="text-xs text-red-600 font-bold border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition active:scale-95">
                                    Vaciar todo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && <p className="text-red-600 text-xs text-center">{error}</p>}

                {cart.length > 0 && (
                    <button onClick={enviarPedido} disabled={enviando}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                        <Send className="w-4 h-4" />
                        {enviando ? "Enviando..."
                            : comandaId ? `Agregar a comanda · $${formatPrice(total)}`
                            : `Enviar al bar · $${formatPrice(total)}`
                        }
                    </button>
                )}
            </div>
        </div>
    );

    // ── StickyHeader como JSX ────────────────────────────────────
    // Mismo motivo que CartPanel: evitar función anidada
    function makeStickyHeader(title: string, onBack: () => void, Icon: React.ElementType = UtensilsCrossed) {
        return (
            <div className="bg-black text-white px-4 py-3 flex items-center gap-3">
                <button onClick={onBack} className="p-1 -ml-1"><ChevronLeft className="w-6 h-6" /></button>
                <Icon size={18} className="text-white/80 shrink-0" />
                <h1 className="text-xl font-bold flex-1">{title}</h1>
                {totalItems > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-bold">{totalItems}</span>
                    </div>
                )}
            </div>
        );
    }

    // ── CategoryCard ─────────────────────────────────────────────
    function CategoryCard({ cat, idx, onClick }: { cat: string; idx: number; onClick: () => void }) {
        const bg = getImage(cat); const pos = getPosition(cat);
        const isSpecial = cat === "MENÚ DEL DÍA";
        const count = cat === "BEBIDAS"    ? menuItems.filter(i => BEBIDAS_CATS.includes(i.categoria)).length
            : cat === "PICADAS Y FRITURAS" ? menuItems.filter(i => PICAR_CATS.includes(i.categoria)).length
            : menuItems.filter(i => i.categoria === cat).length;
        return (
            <motion.button onClick={onClick} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`relative w-full h-36 rounded-2xl overflow-hidden shadow-md active:scale-[0.97] transition-transform ${isSpecial ? "col-span-2" : ""}`}>
                {bg ? <MenuImg src={bg} alt={cat} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} /> : <div className={`absolute inset-0 ${isSpecial ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-gray-800 to-gray-600"}`} />}
                <div className={`absolute inset-0 bg-gradient-to-t ${isSpecial ? "from-amber-900/85 via-amber-800/30 to-transparent" : "from-black/85 via-black/30 to-black/10"}`} />
                {isSpecial && <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Hoy</span>}
                <div className="absolute bottom-3 left-0 right-0 px-2 text-center">
                    <p className="text-white font-black text-sm tracking-tight leading-tight">{cat}</p>
                    <p className="text-white/60 text-[11px] font-medium mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
                </div>
            </motion.button>
        );
    }

    // ── Success banner ───────────────────────────────────────────
    const successBanner = lastOrder && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-2xl">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">¡Enviado! Volviendo a comandas...</p>
                <p className="text-xs text-gray-400">{lastOrder.items.length} ítem{lastOrder.items.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => printComanda(lastOrder)} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0">
                <Printer className="w-4 h-4" /> Comanda
            </button>
        </div>
    );

    // ── Computed values ───────────────────────────────────────────
    const esBebida  = categoriaActiva ? BEBIDAS_CATS.includes(categoriaActiva) : false;
    const CatIcon   = categoriaActiva ? (categoryIcons[categoriaActiva] || UtensilsCrossed) : UtensilsCrossed;
    const subCats   = BEBIDAS_CATS.filter(bc => menuItems.some(i => i.categoria === bc));
    const itemsCat  = (categoriaActiva && categoriaActiva !== "BEBIDAS")
        ? menuItems.filter(i => categoriaActiva === "PICADAS Y FRITURAS" ? PICAR_CATS.includes(i.categoria) : i.categoria === categoriaActiva).sort((a, b) => {
            const d = ((a as any).order ?? 0) - ((b as any).order ?? 0);
            if (d !== 0) return d;
            if (categoriaActiva === "PIZZAS") { const aH = a.nombre.trim().startsWith("1/2"); const bH = b.nombre.trim().startsWith("1/2"); return aH === bH ? 0 : aH ? 1 : -1; }
            return 0;
        })
        : [];

    const stickyTitle  = !categoriaActiva ? (comandaId ? `Agregar a ${mesaActual ? `Mesa ${mesaActual}` : "comanda"}` : "Nueva comanda") : categoriaActiva === "BEBIDAS" ? "Bebidas" : categoriaActiva;
    const stickyIcon   = !categoriaActiva ? UtensilsCrossed : categoriaActiva === "BEBIDAS" ? Beer : CatIcon;
    const stickyBack   = !categoriaActiva ? () => router.back() : categoriaActiva === "BEBIDAS" ? () => setCategoriaActiva(null) : () => setCategoriaActiva(esBebida ? "BEBIDAS" : null);

    // ── Single return ─────────────────────────────────────────────
    return (
        <div className="bg-white min-h-screen pb-6">

            {/* ── STEP 1: Info de la comanda ── */}
            {step === "info" && (
                <>
                    <div className="bg-black text-white px-4 py-3 flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-1 -ml-1"><ChevronLeft className="w-6 h-6" /></button>
                        <h1 className="text-xl font-bold flex-1">Nueva comanda</h1>
                    </div>

                    <div className="max-w-md mx-auto px-5 pt-4 space-y-7 pb-10">

                        {/* ── Modo evento: nombre libre + comensales ── */}
                        {eventoActivo ? (
                            <>
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                    <Star size={14} className="text-amber-500 shrink-0" />
                                    <p className="text-sm font-bold text-amber-700">Evento: {eventoActivo.nombre}</p>
                                </div>

                                {/* Nombre libre */}
                                {/* <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Nombre <span className="font-normal normal-case text-gray-300">(opcional)</span>
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Ej: Juan, Mesa 3, Cumpleaños..."
                                        value={clienteNombre}
                                        onChange={e => setClienteNombre(e.target.value)}
                                        className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-red-400"
                                    />
                                </div> */}

                                {/* Comensales registrados */}
                                <ComensalesSelector
                                    clienteSearch={clienteSearch}
                                    setClienteSearch={setClienteSearch}
                                    clienteResults={clienteResults}
                                    setClienteResults={setClienteResults}
                                    comensalesSeleccionados={comensalesSeleccionados}
                                    setComensalesSeleccionados={setComensalesSeleccionados}
                                    onScanQr={() => setQrScanOpen(true)}
                                />

                                <button onClick={() => setStep("menu")}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] text-base shadow-lg shadow-red-600/20 mt-2">
                                    Continuar al menú →
                                </button>
                            </>
                        ) : (
                            <>
                                {/* ── Modo normal: mesa + personas + nombre + comensales ── */}

                                {/* Mesa(s) */}
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mesa(s)</p>
                                    <button onClick={openMesaPicker}
                                        className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 font-bold transition text-sm ${mesas.length > 0 ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <MapPin className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{mesas.length > 0 ? mesas.map(displayNombre).join(" · ") : "Seleccionar mesa(s)"}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 opacity-60 shrink-0 ml-2" />
                                    </button>
                                </div>

                                {/* Personas */}
                                {solobanquetas ? (
                                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Personas</p>
                                        <p className="text-4xl font-black text-gray-900">{banquetasSelec.length}</p>
                                        <p className="text-xs text-gray-400 mt-1">{banquetasSelec.length} banqueta{banquetasSelec.length !== 1 ? "s" : ""} · 1 persona c/u</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Personas</p>
                                        <div className="flex items-center gap-5">
                                            <button onClick={() => setComensales(c => Math.max(1, c - 1))}
                                                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold transition active:scale-95">−</button>
                                            <span className="text-4xl font-black text-gray-900 w-12 text-center">{comensales}</span>
                                            <button onClick={() => setComensales(c => Math.min(20, c + 1))}
                                                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl font-bold transition active:scale-95">+</button>
                                        </div>
                                        {banquetasSelec.length > 0 && (
                                            <p className="text-xs text-gray-400 mt-2">+ {banquetasSelec.length} banqueta{banquetasSelec.length !== 1 ? "s" : ""} (1p c/u) = {totalComensales}p total</p>
                                        )}
                                    </div>
                                )}

                                {/* Comensales registrados */}
                                <ComensalesSelector
                                    clienteSearch={clienteSearch}
                                    setClienteSearch={setClienteSearch}
                                    clienteResults={clienteResults}
                                    setClienteResults={setClienteResults}
                                    comensalesSeleccionados={comensalesSeleccionados}
                                    setComensalesSeleccionados={setComensalesSeleccionados}
                                    onScanQr={() => setQrScanOpen(true)}
                                />

                                {/* Continuar */}
                                <button onClick={() => setStep("menu")}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] text-base shadow-lg shadow-red-600/20 mt-2">
                                    Continuar al menú →
                                </button>
                                {mesas.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 -mt-4">Podés continuar sin elegir mesa</p>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* ── STEP 2: Menú ── */}
            {step === "menu" && (
                <>
                    {/* Sticky header + strip de categorías + CartPanel */}
                    <div className="sticky z-20" style={{ top: "calc(env(safe-area-inset-top) + 98px)" }}>
                        {makeStickyHeader(stickyTitle, stickyBack, stickyIcon)}
                        {categoriaActiva && categoriaActiva !== "BEBIDAS" && (
                            <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                                {(esBebida ? subCats : categoriasNav).map(cat => (
                                    <button key={cat} onClick={() => setCategoriaActiva(cat)}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${cat === categoriaActiva ? "bg-black text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                        {cartPanelJSX}
                    </div>

                    {/* Vista: categorías principales */}
                    {!categoriaActiva && (
                        <>
                            <div className="px-5 pt-5 pb-3"><p className="text-sm text-gray-400">Elegí una categoría</p></div>
                            <div className="px-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {categoriasNav.map((cat, idx) => <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />)}
                            </div>
                        </>
                    )}

                    {/* Vista: subcategorías BEBIDAS */}
                    {categoriaActiva === "BEBIDAS" && (
                        <div className="px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {subCats.map((cat, idx) => <CategoryCard key={cat} cat={cat} idx={idx} onClick={() => setCategoriaActiva(cat)} />)}
                        </div>
                    )}

                    {/* Vista: ítems de categoría */}
                    {categoriaActiva && categoriaActiva !== "BEBIDAS" && (
                        <AnimatePresence mode="wait">
                            <motion.div key={categoriaActiva} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="px-4 py-3 grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                                {itemsCat.map(item => {
                                    const qty = getQty(item._id);
                                    return (
                                        <div key={item._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 flex flex-col gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 text-sm leading-tight">{item.nombre}</p>
                                                {item.descripcion && <p className="text-xs text-gray-500 truncate mt-0.5">{item.descripcion}</p>}
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">${formatPrice(item.precio)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5 shrink-0">
                                                {qty > 0 ? (
                                                    <>
                                                        <button onClick={() => removeFromCart(item._id)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"><Minus className="w-3.5 h-3.5 text-gray-700" /></button>
                                                        <span className="w-5 text-center font-bold text-gray-900 text-sm">{qty}</span>
                                                        <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"><Plus className="w-3.5 h-3.5 text-white" /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"><Plus className="w-3.5 h-3.5 text-white" /></button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </>
            )}

            {/* Success banner */}
            {successBanner}

            {/* Mesa picker modal — SIEMPRE disponible sin importar la vista actual */}
            {mesaPickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[calc(env(safe-area-inset-top)+100px)] px-3 sm:items-center sm:pt-0 sm:p-4"
                     onClick={e => { if (e.target === e.currentTarget) setMesaPickerOpen(false); }}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }}>
                        <div className="hidden" />
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
                            <MapPin size={16} className="text-gray-500" />
                            <h2 className="font-black text-gray-900 flex-1">Elegir mesa</h2>
                            <button onClick={() => setMesaPickerOpen(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 min-h-0">
                            {/* Hint zoom */}
                            <p className="text-[10px] text-gray-400 text-center mb-1.5">
                                Pellizco para hacer zoom · arrastrá para mover
                            </p>
                            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: "clamp(220px, 65vw, 400px)" }}
                                onTouchStart={onMapTouchStart}
                                onTouchMove={onMapTouchMove}
                                onTouchEnd={onMapTouchEnd}>
                                <div style={{ width:"100%", height:"100%", overflow:"hidden", touchAction:"none" }}>
                                <div style={{ width:"100%", height:"100%", transform:`translate(${mapOffset.x}px,${mapOffset.y}px) scale(${mapScale})`, transformOrigin:"0 0", willChange:"transform" }}>
                                <div className="absolute inset-0" style={{ backgroundColor:"#f9f5ef", backgroundImage:"linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize:"30px 30px" }}>
                                    {elementsPlano.map(el => {
                                        const isLine=el.tipo==="linea_h"||el.tipo==="linea_v"; const isBarra=el.tipo==="barra";
                                        if (isLine) return <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, width:el.tipo==="linea_h"?`${el.ancho}%`:"3px", height:el.tipo==="linea_v"?`${el.alto}%`:"3px", backgroundColor:el.color, borderRadius:"2px", transform:el.tipo==="linea_h"?"translateY(-50%)":"translateX(-50%)" }} />;
                                        return <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, transform:"translate(-50%,-50%)", width:`${el.ancho}%`, height:`${el.alto}%`, minWidth:"32px", minHeight:"14px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"6px", backgroundColor:isBarra?"#b45309":el.color, border:isBarra?"2px solid #92400e":`1px solid ${el.color==="#fef3c7"?"#d97706":"#9ca3af"}60` }}>{el.label&&<span style={{ fontSize:"clamp(6px,0.9vw,9px)", fontWeight:700, color:isBarra?"#fef3c7":"#374151", whiteSpace:"nowrap" }}>{el.label}</span>}</div>;
                                    })}
                                    {mesasPlano.filter(m => m.activa).map(m => {
                                        const isOcupada  = ocupadasPlano.has(m.nombre);
                                        const isReservada = !isOcupada && reservadasPlano.has(m.nombre);
                                        const isEvento   = !isOcupada && !isReservada && eventosPlano.includes(m.nombre);
                                        const isBanq     = m.tipo === "banqueta";
                                        const isSel      = mesas.includes(m.nombre);
                                        const bloqueada  = isOcupada || isReservada || isEvento;
                                        const isRound    = m.forma === "round" || m.forma === "oval";
                                        const rot=m.rotacion??0; const w=m.ancho||(m.forma==="oval"?11:m.forma==="round"?5.5:7); const h=m.alto||(m.forma==="oval"?5:m.forma==="round"?5.5:5);
                                        const bg = isSel        ? "bg-gray-900 border-gray-700 text-white ring-2 ring-white"
                                            : isOcupada         ? "bg-red-500 border-red-600 text-white opacity-70"
                                            : isReservada       ? "bg-yellow-400 border-yellow-500 text-gray-900 opacity-80"
                                            : isEvento          ? "bg-blue-500 border-blue-600 text-white opacity-80"
                                            :                     "bg-emerald-500 border-emerald-600 text-white";
                                        const label = isBanq ? `B${m.nombre}` : m.nombre;
                                        return <div key={m._id} onClick={() => { if (!bloqueada) { setMesas(prev => prev.includes(m.nombre) ? prev.filter(n => n !== m.nombre) : [...prev, m.nombre]); } }} style={{ position:"absolute", left:`${m.x??10}%`, top:`${m.y??10}%`, transform:`translate(-50%,-50%) rotate(${rot}deg)`, width:`min(${w}%,${w*7}px)`, height:`min(${h}%,${h*7.5}px)`, minWidth:"24px", minHeight:"18px", borderRadius:isRound?"50%":"8px", cursor:bloqueada?"not-allowed":"pointer", userSelect:"none", zIndex:2 }} className={`flex items-center justify-center border-2 ${bg} ${!bloqueada?"active:scale-95 transition-all":""}`}><div style={{ transform:`rotate(${-rot}deg)`, fontSize:"clamp(6px,0.8vw,9px)", fontWeight:900 }}>{label}</div></div>;
                                    })}
                                </div>
                                </div>{/* end scale wrapper */}
                                </div>{/* end touch-action wrapper */}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/>Libre</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"/>Ocupada</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"/>Reservada</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block"/>Evento</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-900 inline-block"/>Seleccionada</span>
                                {mapScale > 1 && (
                                    <button onClick={() => { setMapScale(1); setMapOffset({ x:0, y:0 }); }}
                                        className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition">
                                        ↺ Reset zoom
                                    </button>
                                )}
                            </div>
                            {mesas.length > 0 && (
                                <p className="text-xs font-semibold text-gray-700 mt-1.5 truncate">
                                    {mesas.map(displayNombre).join(", ")}
                                </p>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => { setMesas([]); setMesaPickerOpen(false); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Sin mesa</button>
                            <button onClick={() => setMesaPickerOpen(false)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">
                                {mesas.length > 0 ? `Confirmar (${mesas.length})` : "Cerrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scan modal */}
            {qrScanOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex items-center gap-3 px-4 py-3 text-white shrink-0">
                        <button onClick={() => setQrScanOpen(false)} className="p-1 -ml-1"><X className="w-6 h-6" /></button>
                        <h2 className="font-bold text-base flex-1">Escanear QR del cliente</h2>
                        {qrLookingUp && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        {/* Visor */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-56 h-56 border-4 border-white/60 rounded-2xl relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg -translate-x-1 -translate-y-1" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg translate-x-1 -translate-y-1" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg -translate-x-1 translate-y-1" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg translate-x-1 translate-y-1" />
                            </div>
                        </div>
                    </div>
                    <div className="px-5 pb-8 pt-4 space-y-3 shrink-0 bg-black/90">
                        {qrScanError && <p className="text-red-400 text-sm text-center font-semibold">{qrScanError}</p>}
                        <p className="text-white/60 text-xs text-center">O ingresá el token manualmente</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Token del QR..."
                                value={qrTokenManual}
                                onChange={e => setQrTokenManual(e.target.value)}
                                className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:bg-white/20"
                            />
                            <button onClick={() => { if (qrTokenManual.trim()) lookupByQrToken(qrTokenManual.trim()); }}
                                disabled={!qrTokenManual.trim() || qrLookingUp}
                                className="bg-red-600 text-white px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 transition">
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnotadorMenuPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>}>
            <AnotadorMenuContent />
        </Suspense>
    );
}
