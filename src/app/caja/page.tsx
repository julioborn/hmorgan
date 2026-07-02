"use client";
// v2
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { swalBase } from "@/lib/swalConfig";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Wallet, X, Printer, CreditCard, Banknote, Send,
    Loader2, CheckCircle, AlertCircle, Clock, Flame,
    Package, Truck, UtensilsCrossed, CalendarDays,
    Phone, MessageCircle, Plus, Pencil, Trash2, MapPin, Users, Star, Gift, XCircle,
} from "lucide-react";
import ReservasManager from "@/components/ReservasManager";
import { hoyArgentina } from "@/lib/argentina-time";

type Pedido = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    comensales?: number;
    fuente: string;
    numeroDia?: number;
    items: { _id?: string; menuItemId: { _id?: string; nombre: string; precio: number; categoria?: string }; cantidad: number; nota?: string; impreso?: boolean }[];
    total: number;
    costoEnvio?: number;
    estado: string;
    metodoPago?: string;
    tipoEntrega?: string;
    direccion?: string;
    createdAt: string;
    notaEmpleado?: string;
    notaCliente?: string;
    horarioPreferido?: string;
    userId?: { _id: string; nombre: string; apellido: string; telefono?: string; role?: string };
    comensalesIds?: { _id: string; nombre: string; apellido: string; username?: string }[];
    eventoId?: string;
};
type CierreResumen = {
    eventoId: string;
    eventoNombre: string;
    ventasEfectivo: number;
    ventasTransferencia: number;
    ventasTarjeta: number;
    entradasCantidad: number;
    entradasPrecio: number;
    entradasTotal: number;
    comandasEfectivo: number;
    comandasTransferencia: number;
    comandasTarjeta: number;
    comandasSinCobrar: number;
    totalEfectivo: number;
    totalTransferencia: number;
    totalTarjeta: number;
    totalGeneral: number;
};
type MenuItemLite = { _id: string; nombre: string; precio: number; categoria: string; activo?: boolean; descripcion?: string };
type CajaSession = { _id: string; estado: "abierta" | "cerrada"; montoInicial: number; fechaApertura: string };
type MesaPlano = { _id: string; nombre: string; activa: boolean; x: number; y: number; forma: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string };
type SalonElPlano = { _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string };
type VentaEvento = { _id: string; items: { nombre: string; precio: number; categoria: string; cantidad: number }[]; total: number; metodoPago: string; createdAt: string };
type Evento = { _id: string; nombre: string; estado: "activo" | "cerrado"; ventas: VentaEvento[]; mesas: string[]; createdAt: string };
type CartItem = { menuItemId: string; nombre: string; precio: number; categoria: string; cantidad: number };
type Comensal = { _id: string; nombre: string; apellido: string; username: string };
type CanjePendiente = {
    _id: string;
    userId: { _id: string; nombre: string; apellido: string; puntos: number };
    rewardId: { _id: string; titulo: string; descripcion?: string; puntos: number };
    puntosGastados: number;
    createdAt: string;
};
type RewardItem = { _id: string; titulo: string; descripcion?: string; puntos: number; activo: boolean; tema?: string };
type ReservaHoy = { _id: string; mesaId: { _id: string; nombre: string }; hora: string; comensales: number; estado: string; userId?: { nombre: string; apellido: string }; notas?: string };

// Categorías que se imprimen en la comandera de la barra; el resto va a cocina
const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;
const METODO_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const METODO_ICON: Record<string, React.ElementType> = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Send };
const formatMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const ESTADOS = [
    { key: "pendiente",  label: "Pendiente",   icon: Clock,         color: "yellow"  },
    { key: "preparando", label: "Preparando",  icon: Flame,         color: "orange"  },
    { key: "listo",      label: "Listo",       icon: CheckCircle,   color: "dark"    },
    { key: "entregado",  label: "Finalizado",  icon: Truck,         color: "emerald" },
    { key: "cerrado",    label: "Cobrado",     icon: CheckCircle,   color: "emerald" },
];
const COLOR_CLASSES: Record<string, string> = {
    yellow:  "border-red-600 bg-red-600 text-white font-semibold",
    orange:  "border-black bg-black text-white font-semibold",
    dark:    "border-black bg-black text-white font-semibold",
    emerald: "border-gray-700 bg-gray-700 text-white font-semibold",
};
const BAR_COLORS: Record<string, string> = {
    yellow: "bg-red-600", orange: "bg-black", dark: "bg-black", emerald: "bg-gray-700",
};
// Badge del estado dentro del header coloreado (rojo/negro/blanco del bar)
const ESTADO_BADGE: Record<string, string> = {
    pendiente:  "bg-red-600 text-white border-2 border-white/50",
    preparando: "bg-black text-white border-2 border-white/30",
    listo:      "bg-white text-black border-2 border-white",
    entregado:  "bg-white/20 text-white border border-white/30",
    cerrado:    "bg-white/15 text-white border border-white/20",
};

type Vista = "pendientes" | "preparando" | "listos" | "finalizados";
const VISTA_MAP: Record<string, Vista> = {
    pendiente: "pendientes", preparando: "preparando", listo: "listos", entregado: "finalizados",
};

export default function CajaPage() {
    const router = useRouter();
    const [tab, setTab]                   = useState<"pedidos" | "caja" | "reservas" | "mesas" | "eventos" | "canjes" | "menu">("pedidos");
    const [canjesPendientes, setCanjesPendientes] = useState<CanjePendiente[]>([]);
    const [canjeProcessing, setCanjeProcessing]   = useState<string | null>(null);
    // Gestión de rewards en tab Canjes
    const [rewards, setRewards]                   = useState<RewardItem[]>([]);
    const [rewardForm, setRewardForm]             = useState({ titulo: "", descripcion: "", puntos: 0, tema: "" });
    const [rewardEditId, setRewardEditId]         = useState<string | null>(null);
    const [rewardFormOpen, setRewardFormOpen]     = useState(false);
    const [rewardSaving, setRewardSaving]         = useState(false);
    const [sesion, setSesion]             = useState<CajaSession | null | undefined>(undefined);
    const [pedidosActivos, setPedidosActivos]   = useState(true);
    const [reservasActivas, setReservasActivas] = useState(true);
    const [reservasPendientes, setReservasPendientes] = useState(0);
    const [pedidos, setPedidos]           = useState<Pedido[]>([]);
    const [loading, setLoading]           = useState(true);
    const [vista, setVista]               = useState<Vista>("pendientes");
    const hoyStr = new Date().toISOString().slice(0, 10);
    const [updatingId, setUpdatingId]     = useState<string | null>(null);
    const [openForm, setOpenForm]         = useState({ montoInicial: "", notas: "" });
    const [openSaving, setOpenSaving]     = useState(false);
    const [cobrarModal, setCobrarModal]   = useState<{ open: boolean; pedido: Pedido | null }>({ open: false, pedido: null });
    const [cobrarForm, setCobrarForm]     = useState<{ descuento: string; propina: string; pagos: { metodo: typeof METODOS[number]; monto: string }[] }>({ descuento: "", propina: "", pagos: [{ metodo: "efectivo", monto: "" }] });
    const [cobrarSaving, setCobrarSaving] = useState(false);
    const [closeModal, setCloseModal]     = useState(false);
    const [closeForm, setCloseForm]       = useState({ montoCierre: "", notas: "" });
    const [closeSaving, setCloseSaving]   = useState(false);
    const [closeError, setCloseError]     = useState("");
    const [closeStep, setCloseStep]       = useState<"form" | "resumen">("form");
    const [cierreResumen, setCierreResumen] = useState<Record<string, { ingreso: number; egreso: number }>>({});
    const [menuItemsAll, setMenuItemsAll] = useState<MenuItemLite[]>([]);
    const [editItemModal, setEditItemModal] = useState<
        { pedido: Pedido; modo: "agregar" } | { pedido: Pedido; modo: "reemplazar"; itemId: string; nombreActual: string } | null
    >(null);
    const [editItemSearch, setEditItemSearch] = useState("");
    const [mesasPlano, setMesasPlano]     = useState<MesaPlano[]>([]);
    const [elementsPlano, setElementsPlano] = useState<SalonElPlano[]>([]);
    const [mesasLoaded, setMesasLoaded]   = useState(false);
    const [mesaDetalle, setMesaDetalle]   = useState<{ mesa: MesaPlano; pedido: Pedido } | null>(null);
    const [reservasHoy, setReservasHoy]   = useState<ReservaHoy[]>([]);
    const [reservaDetalle, setReservaDetalle] = useState<ReservaHoy | null>(null);

    // Eventos
    const [eventosActivos, setEventosActivos]     = useState<Evento[]>([]);
    const [eventosLoaded, setEventosLoaded]       = useState(false);
    const [crearEventoModal, setCrearEventoModal] = useState(false);
    const [nuevoEventoNombre, setNuevoEventoNombre]   = useState("");
    const [nuevoEventoPrecio, setNuevoEventoPrecio]   = useState("");
    const [nuevoEventoMesas, setNuevoEventoMesas]     = useState<string[]>([]);
    const [crearEventoSaving, setCrearEventoSaving]   = useState(false);
    const [editMesasModal, setEditMesasModal]     = useState(false);
    const [editMesasEventoId, setEditMesasEventoId] = useState<string | null>(null);
    const [editMesasList, setEditMesasList]       = useState<string[]>([]);
    const [editMesasSaving, setEditMesasSaving]   = useState(false);
    // Plano compartido para modales de evento (crear + editar mesas)
    const [eventoModalMesasPlano, setEventoModalMesasPlano] = useState<MesaPlano[]>([]);
    const [eventoModalElementos, setEventoModalElementos]   = useState<SalonElPlano[]>([]);
    const [ventaEventoId, setVentaEventoId]       = useState<string | null>(null);
    const [tarjetasModal, setTarjetasModal]       = useState(false);
    const [tarjetasEventoId, setTarjetasEventoId] = useState<string | null>(null);
    const [tarjetasCantidad, setTarjetasCantidad] = useState("1");
    const [tarjetasSaving, setTarjetasSaving]     = useState(false);
    const [cierreEventoData, setCierreEventoData] = useState<CierreResumen | null>(null);
    const [cierreEventoSaving, setCierreEventoSaving] = useState(false);
    const [eventosCerrados, setEventosCerrados]   = useState<any[]>([]);
    const [historialVisible, setHistorialVisible] = useState(false);
    const [historialLoading, setHistorialLoading] = useState(false);
    const [historialExpandidos, setHistorialExpandidos] = useState<Set<string>>(new Set());
    const [ventaModal, setVentaModal]             = useState(false);
    const [ventaCart, setVentaCart]               = useState<CartItem[]>([]);
    const [ventaMetodo, setVentaMetodo]           = useState<typeof METODOS[number]>("efectivo");
    const [ventaSearch, setVentaSearch]           = useState("");
    const [ventaSaving, setVentaSaving]           = useState(false);
    const [ventaComensalesSearch, setVentaComensalesSearch] = useState("");
    const [ventaComensalesResults, setVentaComensalesResults] = useState<Comensal[]>([]);
    const [ventaComensales, setVentaComensales]   = useState<Comensal[]>([]);
    const [ventaQrOpen, setVentaQrOpen]           = useState(false);
    const [ventaQrError, setVentaQrError]         = useState("");
    const [ventaQrToken, setVentaQrToken]         = useState("");
    const [ventaQrLooking, setVentaQrLooking]     = useState(false);
    const ventaVideoRef  = useRef<HTMLVideoElement>(null);
    const ventaStreamRef = useRef<MediaStream | null>(null);

    // ── Gestión de menú (tab Menú) ──────────────────────────────────────────
    const [menuGest, setMenuGest]           = useState<MenuItemLite[]>([]);
    const [menuGestLoading, setMenuGestLoading] = useState(false);
    const [menuGestCat, setMenuGestCat]     = useState<string>("todas");
    const [menuGestSearch, setMenuGestSearch] = useState("");
    const [menuGestForm, setMenuGestForm]   = useState({ nombre: "", precio: "", descripcion: "", categoria: "" });
    const [menuGestSelectCat, setMenuGestSelectCat] = useState("");
    const [menuGestEditId, setMenuGestEditId] = useState<string | null>(null);
    const [menuGestShowForm, setMenuGestShowForm] = useState(false);
    const [menuGestSaving, setMenuGestSaving] = useState(false);

    async function loadMenuGest() {
        setMenuGestLoading(true);
        const data = await fetch("/api/menu", { credentials: "include" }).then(r => r.json()).catch(() => []);
        setMenuGest(Array.isArray(data) ? data : []);
        setMenuGestLoading(false);
    }

    async function saveMenuGestItem() {
        const precio = parseFloat(menuGestForm.precio.replace(/\./g, "").replace(",", ".")) || 0;
        if (!menuGestForm.nombre.trim() || !menuGestForm.categoria.trim() || precio <= 0) {
            await swalBase.fire({ title: "Completá nombre, precio y categoría", icon: "warning" }); return;
        }
        setMenuGestSaving(true);
        try {
            const body = { nombre: menuGestForm.nombre.trim(), precio, descripcion: menuGestForm.descripcion.trim(), categoria: menuGestForm.categoria.trim().toUpperCase(), activo: true };
            if (menuGestEditId) {
                await fetch(`/api/menu/${menuGestEditId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
            } else {
                await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
            }
            setMenuGestForm({ nombre: "", precio: "", descripcion: "", categoria: "" }); setMenuGestSelectCat(""); setMenuGestEditId(null); setMenuGestShowForm(false);
            await loadMenuGest();
        } finally { setMenuGestSaving(false); }
    }

    async function toggleMenuGestActivo(item: MenuItemLite) {
        await fetch(`/api/menu/${item._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...item, activo: !item.activo }) });
        await loadMenuGest();
    }

    async function eliminarMenuGestItem(id: string) {
        const r = await swalBase.fire({ title: "¿Eliminar producto?", text: "Esta acción no se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" });
        if (!r.isConfirmed) return;
        await fetch(`/api/menu/${id}`, { method: "DELETE", credentials: "include" });
        await loadMenuGest();
    }

    function abrirEditarMenuGest(item: MenuItemLite) {
        setMenuGestForm({ nombre: item.nombre, precio: String(item.precio), descripcion: item.descripcion || "", categoria: item.categoria });
        setMenuGestSelectCat(item.categoria);
        setMenuGestEditId(item._id);
        setMenuGestShowForm(true);
    }

    // Ítems cuyo "impreso" ya se está marcando/imprimiendo en este mismo instante,
    // para no dispararlos dos veces si el poll de 5s cae justo en el medio.
    const itemsImprimiendoRef = useRef<Set<string>>(new Set());

    async function marcarItemsImpresos(pedidoId: string, itemIds: string[]) {
        if (itemIds.length === 0) return;
        try {
            await fetch(`/api/pedidos/${pedidoId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ accion: "marcarImpreso", itemIds }),
            });
        } catch { /* si falla, sigue "impreso: false" y se reintenta en el próximo poll */ }
    }

    // Detecta ítems agregados a comandas ya aceptadas (impreso: false en la base, no en
    // memoria del navegador) y los imprime individualmente en BARRA o COCINA. Al venir del
    // servidor, funciona sin importar recargas de página o desde qué dispositivo se agregó.
    function detectarAgregados(lista: Pedido[]) {
        for (const p of lista) {
            if (!["preparando", "listo"].includes(p.estado)) continue;
            const pendientes = p.items.filter(it => it.impreso === false && it._id && !itemsImprimiendoRef.current.has(it._id));
            if (pendientes.length === 0) continue;
            const ids = pendientes.map(it => it._id!);
            ids.forEach(id => itemsImprimiendoRef.current.add(id));
            printItemsAgregados(p, pendientes)
                .then(() => marcarItemsImpresos(p._id, ids))
                .finally(() => ids.forEach(id => itemsImprimiendoRef.current.delete(id)));
        }
    }

    const loadEvento = useCallback(async () => {
        try {
            const res = await fetch("/api/eventos?activo=true", { credentials: "include" });
            const data = await res.json();
            setEventosActivos(Array.isArray(data) ? data : []);
        } catch { setEventosActivos([]); }
        finally { setEventosLoaded(true); }
    }, []);

    const loadCanjes = useCallback(async () => {
        try {
            const res = await fetch("/api/canjes", { credentials: "include" });
            if (!res.ok) return;
            const data = await res.json();
            setCanjesPendientes(Array.isArray(data) ? data : []);
        } catch { /* silencioso */ }
    }, []);

    const loadRewards = useCallback(async () => {
        try {
            const res = await fetch("/api/rewards?all=true", { credentials: "include" });
            if (!res.ok) return;
            const data = await res.json();
            setRewards(Array.isArray(data) ? data : []);
        } catch { /* silencioso */ }
    }, []);

    const loadData = useCallback(async () => {
        try {
            const [cajaRes, pedRes] = await Promise.all([
                fetch("/api/superadmin/caja", { credentials: "include" }),
                fetch("/api/pedidos", { credentials: "include" }),
            ]);
            const [cajaData, pedData] = await Promise.all([cajaRes.json(), pedRes.json()]);
            setSesion(cajaData.sesion || null);
            if (Array.isArray(pedData)) {
                // Solo mostrar "cerrado" si fue cobrado durante la sesión actual de caja
                const sesionApertura = cajaData.sesion?.fechaApertura
                    ? new Date(cajaData.sesion.fechaApertura)
                    : null;
                const filtrados = pedData.filter((p: Pedido) =>
                    p.estado !== "cancelado" &&
                    (p.estado !== "cerrado" || (
                        sesionApertura !== null &&
                        new Date((p as any).updatedAt || (p as any).createdAt) >= sesionApertura
                    ))
                );
                setPedidos(filtrados);
                detectarAgregados(filtrados);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadData();
        loadEvento();
        loadCanjes();
        loadRewards();
        const iv = setInterval(() => { loadData(); loadCanjes(); }, 5000);
        return () => clearInterval(iv);
    }, [loadData, loadEvento, loadCanjes, loadRewards]);

    useEffect(() => {
        fetch("/api/config/pedidos").then(r => r.json()).then(d => setPedidosActivos(d.activo ?? true));
        fetch("/api/config/reservas").then(r => r.json()).then(d => setReservasActivas(d.activo ?? true));
    }, []);

    useEffect(() => {
        if (tab === "menu") loadMenuGest();
    }, [tab]);

    // Búsqueda de comensales en modal de venta de evento
    useEffect(() => {
        if (ventaComensalesSearch.length < 2) { setVentaComensalesResults([]); return; }
        const t = setTimeout(async () => {
            const r = await fetch(`/api/empleado/buscar-cliente?q=${encodeURIComponent(ventaComensalesSearch)}`, { credentials: "include" });
            const d = await r.json().catch(() => []);
            setVentaComensalesResults(Array.isArray(d) ? d : []);
        }, 400);
        return () => clearTimeout(t);
    }, [ventaComensalesSearch]);

    // QR scan para modal de venta de evento
    useEffect(() => {
        if (!ventaQrOpen) {
            ventaStreamRef.current?.getTracks().forEach(t => t.stop());
            ventaStreamRef.current = null;
            setVentaQrError("");
            setVentaQrToken("");
            return;
        }
        let active = true;
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                ventaStreamRef.current = stream;
                if (ventaVideoRef.current) ventaVideoRef.current.srcObject = stream;
                const detector = typeof (window as any).BarcodeDetector !== "undefined"
                    ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
                    : null;
                if (!detector) { setVentaQrError("Usá el campo manual o Chrome/Edge en Android"); return; }
                const scan = async () => {
                    if (!active || !ventaVideoRef.current) return;
                    try {
                        const codes = await detector.detect(ventaVideoRef.current);
                        if (codes.length > 0) { await lookupVentaQrRaw(codes[0].rawValue); return; }
                    } catch { /* ignorar */ }
                    if (active) requestAnimationFrame(scan);
                };
                ventaVideoRef.current?.addEventListener("loadeddata", () => { if (active) requestAnimationFrame(scan); }, { once: true });
            } catch { setVentaQrError("No se pudo acceder a la cámara"); }
        })();
        return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ventaQrOpen]);

    async function lookupVentaQrRaw(raw: string) {
        try {
            const parsed = JSON.parse(raw);
            const token = parsed.qrToken as string;
            if (!token) { setVentaQrError("QR inválido"); return; }
            await lookupVentaQrToken(token);
        } catch { setVentaQrError("QR inválido — no es un código de H. Morgan"); }
    }

    async function lookupVentaQrToken(token: string) {
        setVentaQrLooking(true); setVentaQrError("");
        try {
            const r = await fetch(`/api/usuarios/qr/${encodeURIComponent(token)}`, { credentials: "include" });
            if (!r.ok) { setVentaQrError("Usuario no encontrado"); return; }
            const u = await r.json();
            const nuevo: Comensal = { _id: u._id, nombre: u.nombre, apellido: u.apellido ?? "", username: u.username ?? "" };
            setVentaComensales(prev => prev.some(c => c._id === u._id) ? prev : [...prev, nuevo]);
            setVentaQrOpen(false);
        } catch { setVentaQrError("Error al buscar usuario"); }
        finally { setVentaQrLooking(false); }
    }

    useEffect(() => {
        if (tab === "eventos") loadEvento();
        if (tab === "canjes") { loadCanjes(); loadRewards(); }
    }, [tab, loadEvento, loadCanjes, loadRewards]);

    useEffect(() => {
        if (tab !== "mesas") return;
        // Cargar reservas de hoy cada vez que se entra al tab de mesas
        fetch("/api/reservas", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                const hoy = hoyArgentina();
                setReservasHoy(data.filter((r: any) =>
                    r.mesaId && r.estado !== "cancelada" &&
                    String(r.fecha).slice(0, 10) === hoy
                ));
            })
            .catch(() => {});
    }, [tab]);

    useEffect(() => {
        if (tab !== "mesas" || mesasLoaded) return;
        (async () => {
            const [mRes, elRes] = await Promise.all([
                fetch("/api/admin/mesas?all=true", { credentials: "include" }),
                fetch("/api/superadmin/salon", { credentials: "include" }),
            ]);
            const [mData, elData] = await Promise.all([mRes.json(), elRes.json()]);
            setMesasPlano(Array.isArray(mData) ? mData : []);
            setElementsPlano(Array.isArray(elData) ? elData : []);
            setMesasLoaded(true);
        })();
    }, [tab, mesasLoaded]);

    function pedidoDeMesa(nombreMesa: string): Pedido | undefined {
        return pedidos.find(p => p.mesa === nombreMesa && !["cerrado", "cancelado"].includes(p.estado));
    }

    async function togglePedidosActivos() {
        const next = !pedidosActivos;
        setPedidosActivos(next);
        await fetch("/api/config/pedidos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activos: next }) });
    }

    async function toggleReservasActivas() {
        const next = !reservasActivas;
        setReservasActivas(next);
        await fetch("/api/config/reservas", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: next }) });
    }

    async function abrirCaja() {
        setOpenSaving(true);
        try {
            const res = await fetch("/api/superadmin/caja", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoInicial: Number(openForm.montoInicial) || 0, notas: openForm.notas || undefined }),
            });
            if (res.ok) { setOpenForm({ montoInicial: "", notas: "" }); loadData(); }
        } finally { setOpenSaving(false); }
    }

    async function rechazarPedido(id: string) {
        const r = await swalBase.fire({ title: "¿Rechazar pedido?", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, rechazar", cancelButtonText: "Cancelar" });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos?id=${id}`, { method: "DELETE", credentials: "include" });
        loadData();
    }

    async function eliminarItemPedido(pedidoId: string, itemId: string, nombre: string) {
        const r = await swalBase.fire({
            title: "¿Eliminar producto?",
            text: `Se quitará "${nombre}" de la comanda.`,
            icon: "warning", showCancelButton: true,
            confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos/${pedidoId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ accion: "eliminarItem", itemId, nombreItem: nombre }),
        });
        loadData();
    }

    async function abrirSelectorProducto(
        pedido: Pedido,
        opts: { modo: "agregar" } | { modo: "reemplazar"; itemId: string; nombreActual: string }
    ) {
        if (menuItemsAll.length === 0) {
            const r = await fetch("/api/menu?activo=true", { credentials: "include" });
            const d = await r.json().catch(() => []);
            setMenuItemsAll(Array.isArray(d) ? d : []);
        }
        setEditItemSearch("");
        setEditItemModal({ pedido, ...opts } as typeof editItemModal);
    }

    async function reemplazarItemPedido(nuevoMenuItemId: string, nuevoNombre: string) {
        if (!editItemModal || editItemModal.modo !== "reemplazar") return;
        const r = await swalBase.fire({
            title: "¿Cambiar producto?",
            text: `"${editItemModal.nombreActual}" se reemplazará por "${nuevoNombre}".`,
            icon: "question", showCancelButton: true,
            confirmButtonText: "Sí, cambiar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        await fetch(`/api/pedidos/${editItemModal.pedido._id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ accion: "reemplazarItem", itemId: editItemModal.itemId, nuevoMenuItemId, nombreActual: editItemModal.nombreActual, nuevoNombre }),
        });
        setEditItemModal(null);
        loadData();
    }

    // Agregar un producto nuevo a una comanda ya existente. Si la comanda ya fue aceptada
    // (no está "pendiente"), imprime ese único producto ya mismo en BARRA o COCINA según
    // corresponda, sin esperar al poll de 5s. El ítem queda marcado "impreso" recién
    // cuando la impresión termina; si falla, el poll de detectarAgregados lo reintenta.
    async function agregarProductoAPedido(menuItem: MenuItemLite) {
        if (!editItemModal || editItemModal.modo !== "agregar") return;
        const pedido = editItemModal.pedido;
        const impresora = BEBIDAS_CATS.includes(menuItem.categoria) ? "BARRA" : "COCINA";
        const yaAceptado = pedido.estado !== "pendiente";

        const r = await swalBase.fire({
            title: "¿Agregar producto?",
            text: yaAceptado
                ? `"${menuItem.nombre}" se agrega a la comanda y se imprime directo en ${impresora}.`
                : `"${menuItem.nombre}" se agrega a la comanda.`,
            icon: "question", showCancelButton: true,
            confirmButtonText: "Sí, agregar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;

        setEditItemModal(null);

        const res = await fetch(`/api/pedidos/${pedido._id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ items: [{ menuItemId: menuItem._id, cantidad: 1 }] }),
        });

        if (yaAceptado) {
            const data = await res.json().catch(() => null);
            const nuevoItem = data?.pedido?.items?.[data.pedido.items.length - 1];
            const nuevoItemId = nuevoItem?._id ? String(nuevoItem._id) : undefined;
            if (nuevoItemId) itemsImprimiendoRef.current.add(nuevoItemId);
            try {
                await printItemsAgregados(pedido, [
                    { cantidad: 1, menuItemId: { nombre: menuItem.nombre, categoria: menuItem.categoria } } as Pedido["items"][number],
                ]);
                if (nuevoItemId) await marcarItemsImpresos(pedido._id, [nuevoItemId]);
            } finally {
                if (nuevoItemId) itemsImprimiendoRef.current.delete(nuevoItemId);
            }
        }

        loadData();
    }

    async function cerrarCaja() {
        setCloseSaving(true);
        setCloseError("");
        try {
            const res = await fetch("/api/superadmin/caja/cerrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ montoCierre: Number(closeForm.montoCierre) || 0, notas: closeForm.notas || undefined }),
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                setCierreResumen(data.resumen || {});
                setCloseStep("resumen");
                await loadData();
            } else {
                const err = await res.json().catch(() => ({}));
                setCloseError(err.error || `Error ${res.status}`);
            }
        } catch {
            setCloseError("Error de conexión");
        } finally { setCloseSaving(false); }
    }

    async function avanzarEstado(p: Pedido, estado: string) {
        setUpdatingId(p._id);
        try {
            const res = await fetch("/api/pedidos", {
                method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ id: p._id, estado }),
            });
            if (res.ok) {
                if (estado === "entregado") {
                    // Al finalizar, ir directo a Cobrar
                    setTab("caja");
                } else {
                    setVista(VISTA_MAP[estado] || "pendientes");
                }
                await loadData();
            }
        } finally { setUpdatingId(null); }
    }

    async function cobrar() {
        if (!cobrarModal.pedido) return;
        setCobrarSaving(true);
        const ped = cobrarModal.pedido;
        const descuento = Math.max(0, Number(cobrarForm.descuento) || 0);
        const propina = Math.max(0, Number(cobrarForm.propina) || 0);
        const totalConDescuento = Math.max(0, ped.total - descuento);
        const pagos = cobrarForm.pagos.map(p => ({ metodo: p.metodo, monto: Number(p.monto) || 0 }));
        const totalPagado = pagos.reduce((a, p) => a + p.monto, 0);
        const metodoPago = pagos.length === 1 ? pagos[0].metodo : "mixto";
        const hayEfectivo = pagos.some(p => p.metodo === "efectivo");
        const vuelto = hayEfectivo ? Math.max(0, totalPagado - totalConDescuento) : 0;
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ pedidoId: ped._id, metodoPago, montoPagado: totalConDescuento, descuento, pagos, propina }),
            });
            if (res.ok) {
                setCobrarModal({ open: false, pedido: null });
                setCobrarForm({ descuento: "", propina: "", pagos: [{ metodo: "efectivo", monto: "" }] });
                setPedidos(prev => prev.map(p => p._id === ped._id ? { ...p, estado: "cerrado" } : p));
                printTicket(ped, pagos, descuento, totalConDescuento, vuelto, propina);
                await loadData();
            }
        } finally { setCobrarSaving(false); }
    }

    async function printTicket(pedido: Pedido, pagos: { metodo: string; monto: number }[], descuento: number, totalConDescuento: number, vuelto: number, propina: number = 0) {
        const hora  = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha = new Date().toLocaleDateString("es-AR");

        try {
            const res = await fetch("http://localhost:3001/imprimir/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mesa:      pedido.mesa || "—",
                    fecha,
                    hora,
                    items:     pedido.items.map(i => ({ cantidad: i.cantidad, nombre: i.menuItemId?.nombre || "Ítem", precio: i.menuItemId?.precio || 0 })),
                    total:     pedido.total,
                    costoEnvio: pedido.tipoEntrega === "envio" ? (pedido.costoEnvio ?? 0) : 0,
                    descuento,
                    pagos,
                    vuelto,
                    propina,
                }),
            });
            if (res.ok) return;
        } catch { /* servidor no disponible → fallback */ }

        // Fallback: ventana del navegador
        const rows = pedido.items.map(i =>
            `<tr><td>${i.cantidad}x ${i.menuItemId?.nombre || "ítem"}</td><td style="text-align:right">${formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</td></tr>`
        ).join("") + (pedido.tipoEntrega === "envio" && (pedido.costoEnvio ?? 0) > 0
            ? `<tr><td>Envío a domicilio</td><td style="text-align:right">${formatMoney(pedido.costoEnvio ?? 0)}</td></tr>` : "");
        const descuentoRow = descuento > 0
            ? `<tr><td style="color:#dc2626">Descuento</td><td style="text-align:right;color:#dc2626">−${formatMoney(descuento)}</td></tr>
               <tr><td class="total">A COBRAR</td><td class="total" style="text-align:right">${formatMoney(totalConDescuento)}</td></tr>` : "";
        const pagosRows = pagos.map(p => `<tr><td>${METODO_LABEL[p.metodo] || p.metodo}</td><td style="text-align:right">${formatMoney(p.monto)}</td></tr>`).join("");
        const vueltoRow = vuelto > 0 ? `<tr><td class="vuelto">Vuelto</td><td class="vuelto" style="text-align:right">${formatMoney(vuelto)}</td></tr>` : "";
        const propinaRow = propina > 0 ? `<tr><td class="propina">Propina</td><td class="propina" style="text-align:right">${formatMoney(propina)}</td></tr>` : "";
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:15px;letter-spacing:2px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            hr{border:none;border-top:1px dashed #000;margin:5px 0}
            table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:12px}
            .total{font-size:14px;font-weight:bold}.vuelto{font-weight:bold;color:#16a34a}.propina{font-weight:bold;color:#7c3aed}
            .legal{text-align:center;font-size:9px;color:#aaa;margin-top:10px}
        </style></head><body>
        <h2>TICKET</h2><div class="sub">${fecha} ${hora}</div>
        <hr/><table>${rows}</table><hr/>
        <table>
            <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(pedido.total)}</td></tr>
            ${descuentoRow}${pagosRows}${vueltoRow}${propinaRow}
        </table>
        <div class="legal">Comprobante no válido como factura</div></body></html>`;
        const w = window.open("", "_blank", "width=320,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    function datosComanda(p: Pedido) {
        const esEmpleado = p.fuente === "empleado";
        const base = p.mesa ? `Mesa ${p.mesa}` : p.tipoEntrega === "envio" ? "Envío a domicilio" : "Retira en barra";
        const mesa = !esEmpleado && p.numeroDia ? `Pedido #${p.numeroDia} · ${base}` : base;
        const comensalesStr = p.comensalesIds?.length
            ? p.comensalesIds.map(c => `${c.nombre} ${c.apellido}`.trim()).join(", ")
            : "";
        const cliente = esEmpleado
            ? [p.nombreComanda, comensalesStr].filter(Boolean).join(" / ") || "-"
            : (p.userId?.nombre ? `${p.userId.nombre}${p.userId.apellido ? " " + p.userId.apellido : ""}` : "-");
        const mozo = esEmpleado ? (p.userId?.nombre || "-") : "-";
        const direccion = p.tipoEntrega === "envio" ? (p.direccion || "-") : "";
        return { mesa, cliente, mozo, direccion };
    }

    function comandaHtml(p: Pedido, titulo: string, items: Pedido["items"]) {
        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const { mesa, cliente, mozo, direccion } = datosComanda(p);
        const filas = items.map(it =>
            `<tr>
                <td style="font-size:22px;font-weight:900;padding:4px 10px 4px 0;white-space:nowrap">${it.cantidad}x</td>
                <td style="font-size:20px;font-weight:700;padding:4px 0">${it.menuItemId?.nombre ?? "Ítem"}</td>
            </tr>`
        ).join("");
        const nota = p.notaEmpleado || p.notaCliente;

        return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 8px; }
            .centro { text-align:center; }
            .sep { border-top: 2px dashed #000; margin: 8px 0; }
            .badge { font-size:28px; font-weight:900; text-transform:uppercase; }
            .meta { font-size:14px; margin:4px 0; }
            .meta-grande { font-size:20px; font-weight:700; margin:4px 0; }
            table { width:100%; border-collapse:collapse; }
            .nota { font-size:14px; margin-top:6px; padding:6px; border:2px solid #000; border-radius:4px; }
        </style></head><body>
        <div class="centro"><div class="badge">⬛ ${titulo} ⬛</div></div>
        <div class="sep"></div>
        <div class="meta-grande">${mesa}</div>
        <div class="meta-grande">Cliente: ${cliente}</div>
        ${direccion ? `<div class="meta-grande">Dir: ${direccion}</div>` : ""}
        <div class="meta">Mozo: ${mozo}</div>
        <div class="meta">Hora: ${hora}</div>
        <div class="sep"></div>
        <table>${filas}</table>
        <div class="sep"></div>
        ${nota ? `<div class="nota">📝 ${nota}</div>` : ""}
        </body></html>`;
    }

    function abrirEImprimir(html: string) {
        const w = window.open("", "_blank", "width=340,height=500,toolbar=0,menubar=0");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 200); }
    }

    async function printComanda(p: Pedido) {
        const bebidas = p.items.filter(it => BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
        const comida  = p.items.filter(it => !BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));

        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const { mesa, cliente, mozo, direccion } = datosComanda(p);
        const nota = p.notaEmpleado || p.notaCliente || "";

        // Se imprime todo de nuevo (comanda completa) → todos los ítems quedan "impresos"
        // para que el chequeo de agregados no los vuelva a imprimir sueltos después.
        const itemIds = p.items.map(it => it._id).filter((id): id is string => !!id);
        await marcarItemsImpresos(p._id, itemIds);

        // Intentar servidor local de impresión
        try {
            const promesas: Promise<Response>[] = [];
            if (comida.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Cocina",
                        mesa, cliente, mozo, direccion, hora, nota,
                        items: comida.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota || undefined })),
                    }),
                })
            );
            if (bebidas.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Barra",
                        mesa, cliente, mozo, direccion, hora,
                        items: bebidas.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota || undefined })),
                    }),
                })
            );
            if (promesas.length > 0) {
                await Promise.all(promesas);
                return; // impresión exitosa
            }
        } catch { /* servidor no disponible → fallback */ }

        // Fallback: ventana del navegador
        if (comida.length > 0)  abrirEImprimir(comandaHtml(p, "COCINA", comida));
        if (bebidas.length > 0) setTimeout(() => abrirEImprimir(comandaHtml(p, "BARRA", bebidas)), 600);
    }

    // Reimpresión automática de ítems agregados a una comanda ya aceptada. Si el servidor
    // local no está disponible (ej. probando sin impresora conectada), cae a la ventana de
    // impresión del navegador, igual que printComanda.
    async function printItemsAgregados(p: Pedido, itemsNuevos: Pedido["items"]) {
        const bebidas = itemsNuevos.filter(it => BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
        const comida  = itemsNuevos.filter(it => !BEBIDAS_CATS.includes(it.menuItemId?.categoria || ""));
        if (bebidas.length === 0 && comida.length === 0) return;

        const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const { mesa, cliente, mozo, direccion } = datosComanda(p);
        const nota = p.notaEmpleado || p.notaCliente || "";

        try {
            const promesas: Promise<Response>[] = [];
            if (comida.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Cocina", titulo: "COCINA",
                        mesa, cliente, mozo, direccion, hora, nota,
                        items: comida.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota || undefined })),
                    }),
                })
            );
            if (bebidas.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Barra", titulo: "BARRA",
                        mesa, cliente, mozo, direccion, hora,
                        items: bebidas.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem", nota: it.nota || undefined })),
                    }),
                })
            );
            if (promesas.length > 0) {
                await Promise.all(promesas);
                return; // impresión exitosa
            }
        } catch { /* servidor no disponible → fallback */ }

        // Fallback: ventana del navegador
        if (comida.length > 0)  abrirEImprimir(comandaHtml(p, "COCINA", comida));
        if (bebidas.length > 0) setTimeout(() => abrirEImprimir(comandaHtml(p, "BARRA", bebidas)), 600);
    }

    async function crearEvento() {
        if (!nuevoEventoNombre.trim()) return;
        setCrearEventoSaving(true);
        try {
            const res = await fetch("/api/eventos", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    nombre: nuevoEventoNombre.trim(),
                    mesas: nuevoEventoMesas,
                    precioTarjeta: Number(nuevoEventoPrecio) || 0,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setEventosActivos(prev => [data, ...prev]);
                setCrearEventoModal(false);
            }
        } finally { setCrearEventoSaving(false); }
    }

    function abrirRewardForm(r?: RewardItem) {
        if (r) {
            setRewardForm({ titulo: r.titulo, descripcion: r.descripcion ?? "", puntos: r.puntos, tema: r.tema ?? "" });
            setRewardEditId(r._id);
        } else {
            setRewardForm({ titulo: "", descripcion: "", puntos: 0, tema: "" });
            setRewardEditId(null);
        }
        setRewardFormOpen(true);
    }

    async function guardarReward() {
        if (!rewardForm.titulo.trim() || rewardForm.puntos <= 0) return;
        setRewardSaving(true);
        try {
            const url = rewardEditId ? `/api/rewards/${rewardEditId}` : "/api/rewards";
            const method = rewardEditId ? "PUT" : "POST";
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rewardForm),
            });
            if (res.ok) { await loadRewards(); setRewardFormOpen(false); setRewardEditId(null); }
            else { const d = await res.json(); await swalBase.fire({ title: "Error", text: d.error || "No se pudo guardar", icon: "error" }); }
        } catch { await swalBase.fire({ title: "Error de conexión", icon: "error" }); }
        finally { setRewardSaving(false); }
    }

    async function toggleReward(id: string) {
        await fetch(`/api/rewards/${id}`, { method: "PATCH" });
        await loadRewards();
    }

    async function eliminarReward(id: string) {
        const r = await swalBase.fire({
            title: "¿Eliminar canje?", text: "Esta acción no se puede deshacer.",
            icon: "warning", showCancelButton: true,
            confirmButtonText: "Eliminar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        const res = await fetch(`/api/rewards/${id}`, { method: "DELETE" });
        if (res.ok) await loadRewards();
        else await swalBase.fire({ title: "Error", text: "No se pudo eliminar", icon: "error" });
    }

    async function procesarCanje(canjeId: string, accion: "aceptar" | "rechazar") {
        setCanjeProcessing(canjeId);
        try {
            const res = await fetch(`/api/canjes/${canjeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accion }),
            });
            const data = await res.json();
            if (!res.ok) { await swalBase.fire({ title: "Error", text: data.message || "No se pudo procesar", icon: "error" }); return; }
            setCanjesPendientes(prev => prev.filter(c => c._id !== canjeId));
        } catch { await swalBase.fire({ title: "Error de conexión", icon: "error" }); }
        finally { setCanjeProcessing(null); }
    }

    async function cargarPlanoParaEvento() {
        const [mRes, elRes, resRes] = await Promise.all([
            fetch("/api/admin/mesas?all=true", { credentials: "include" }),
            fetch("/api/superadmin/salon", { credentials: "include" }),
            fetch("/api/reservas", { credentials: "include" }),
        ]);
        const [mData, elData, resData] = await Promise.all([mRes.json().catch(() => []), elRes.json().catch(() => []), resRes.json().catch(() => [])]);
        setEventoModalMesasPlano(Array.isArray(mData) ? mData.filter((m: any) => m.activa) : []);
        setEventoModalElementos(Array.isArray(elData) ? elData : []);
        if (Array.isArray(resData)) {
            const hoy = hoyArgentina();
            setReservasHoy(resData.filter((r: any) => r.mesaId && r.estado !== "cancelada" && String(r.fecha).slice(0, 10) === hoy));
        }
    }

    async function abrirCrearEvento() {
        await cargarPlanoParaEvento();
        setNuevoEventoNombre("");
        setNuevoEventoPrecio("");
        setNuevoEventoMesas([]);
        setCrearEventoModal(true);
    }

    async function abrirEditMesas(eventoId: string) {
        const ev = eventosActivos.find(e => e._id === eventoId);
        if (!ev) return;
        await cargarPlanoParaEvento();
        setEditMesasList(ev.mesas ?? []);
        setEditMesasEventoId(eventoId);
        setEditMesasModal(true);
    }

    async function guardarMesasEvento() {
        if (!editMesasEventoId) return;
        setEditMesasSaving(true);
        try {
            const res = await fetch(`/api/eventos/${editMesasEventoId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ accion: "updateMesas", mesas: editMesasList }),
            });
            if (res.ok) {
                setEventosActivos(prev => prev.map(e => e._id === editMesasEventoId ? { ...e, mesas: editMesasList } : e));
                setEditMesasModal(false);
            }
        } finally { setEditMesasSaving(false); }
    }

    function abrirCierreEvento(eventoId: string) {
        const ev = eventosActivos.find(e => e._id === eventoId);
        if (!ev) return;
        const pedidosEv = pedidos.filter(p => p.eventoId === ev._id);
        const tarjetas = (ev as any).tarjetas ?? [];
        const precioTarjeta = (ev as any).precioTarjeta ?? 0;

        // Ventas directas desglosadas
        const ventasEfectivo      = ev.ventas.filter(v => v.metodoPago === "efectivo").reduce((a, v) => a + v.total, 0);
        const ventasTransferencia = ev.ventas.filter(v => v.metodoPago === "transferencia").reduce((a, v) => a + v.total, 0);
        const ventasTarjeta       = ev.ventas.filter(v => v.metodoPago === "tarjeta").reduce((a, v) => a + v.total, 0);

        // Tarjetas de entrada
        const entradasCantidad = tarjetas.reduce((a: number, t: any) => a + t.cantidad, 0);
        const entradasTotal    = entradasCantidad * precioTarjeta;

        // Comandas cobradas por método
        const cobradas             = pedidosEv.filter(p => p.estado === "cerrado");
        const sinCobrar            = pedidosEv.filter(p => p.estado !== "cerrado" && p.estado !== "cancelado");
        const comandasEfectivo     = cobradas.filter(p => p.metodoPago === "efectivo").reduce((a, p) => a + p.total, 0);
        const comandasTransferencia = cobradas.filter(p => p.metodoPago === "transferencia").reduce((a, p) => a + p.total, 0);
        const comandasTarjeta      = cobradas.filter(p => p.metodoPago === "tarjeta").reduce((a, p) => a + p.total, 0);
        const comandasSinCobrar    = sinCobrar.reduce((a, p) => a + p.total, 0);

        // Totales por método (ventas directas + comandas cobradas; entradas aparte)
        const totalEfectivo      = ventasEfectivo + comandasEfectivo;
        const totalTransferencia = ventasTransferencia + comandasTransferencia;
        const totalTarjeta       = ventasTarjeta + comandasTarjeta;
        const totalGeneral       = totalEfectivo + totalTransferencia + totalTarjeta + entradasTotal + comandasSinCobrar;

        setCierreEventoData({
            eventoId, eventoNombre: ev.nombre,
            ventasEfectivo, ventasTransferencia, ventasTarjeta,
            entradasCantidad, entradasPrecio: precioTarjeta, entradasTotal,
            comandasEfectivo, comandasTransferencia, comandasTarjeta, comandasSinCobrar,
            totalEfectivo, totalTransferencia, totalTarjeta, totalGeneral,
        });
    }

    async function confirmarCierreEvento() {
        if (!cierreEventoData) return;
        setCierreEventoSaving(true);
        try {
            const res = await fetch(`/api/eventos/${cierreEventoData.eventoId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ accion: "cerrar", cierreData: cierreEventoData }),
            });
            if (res.ok) {
                setEventosActivos(prev => prev.filter(e => e._id !== cierreEventoData.eventoId));
                setCierreEventoData(null);
                if (historialVisible) cargarHistorial();
            }
        } finally { setCierreEventoSaving(false); }
    }

    async function cargarHistorial() {
        setHistorialLoading(true);
        try {
            const res = await fetch("/api/eventos?cerrado=true", { credentials: "include" });
            const data = await res.json();
            setEventosCerrados(Array.isArray(data) ? data : []);
        } finally { setHistorialLoading(false); }
    }

    async function abrirTarjetasModal(eventoId: string) {
        setTarjetasEventoId(eventoId);
        setTarjetasCantidad("1");
        setTarjetasModal(true);
    }

    async function guardarTarjetas() {
        if (!tarjetasEventoId || !tarjetasCantidad) return;
        setTarjetasSaving(true);
        try {
            const res = await fetch(`/api/eventos/${tarjetasEventoId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ accion: "agregarTarjetas", cantidad: Number(tarjetasCantidad) }),
            });
            if (res.ok) {
                const { evento } = await res.json();
                setEventosActivos(prev => prev.map(e => e._id === tarjetasEventoId ? evento : e));
                setTarjetasModal(false);
            }
        } finally { setTarjetasSaving(false); }
    }

    function ventaEventoHtml(titulo: string, items: CartItem[], cliente: string, hora: string) {
        const filas = items.map(it =>
            `<tr>
                <td style="font-size:22px;font-weight:900;padding:4px 10px 4px 0;white-space:nowrap">${it.cantidad}x</td>
                <td style="font-size:20px;font-weight:700;padding:4px 0">${it.nombre}</td>
            </tr>`
        ).join("");
        return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 8px; }
            .centro { text-align:center; }
            .sep { border-top: 2px dashed #000; margin: 8px 0; }
            .badge { font-size:26px; font-weight:900; text-transform:uppercase; }
            .meta { font-size:14px; margin:4px 0; }
            .meta-grande { font-size:18px; font-weight:700; margin:4px 0; }
            table { width:100%; border-collapse:collapse; }
        </style></head><body>
        <div class="centro"><div class="badge">⬛ ${titulo} ⬛</div></div>
        <div class="sep"></div>
        <div class="meta-grande">Evento: ${titulo}</div>
        <div class="meta-grande">Pago: ${cliente}</div>
        <div class="meta">Hora: ${hora}</div>
        <div class="sep"></div>
        <table>${filas}</table>
        <div class="sep"></div>
        </body></html>`;
    }

    async function printVentaEvento(evento: Evento, cart: CartItem[], metodoPago: string) {
        const bebidas = cart.filter(it => BEBIDAS_CATS.includes(it.categoria));
        const comida  = cart.filter(it => !BEBIDAS_CATS.includes(it.categoria));
        if (bebidas.length === 0 && comida.length === 0) return;

        const hora   = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const total  = cart.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
        const cliente = `${METODO_LABEL[metodoPago]} · ${formatMoney(total)}`;
        const titulo  = evento.nombre.toUpperCase();

        try {
            const promesas: Promise<Response>[] = [];
            if (comida.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Cocina", titulo,
                        mesa: evento.nombre, cliente, mozo: "-", hora, nota: "",
                        items: comida.map(it => ({ cantidad: it.cantidad, nombre: it.nombre })),
                    }),
                })
            );
            if (bebidas.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Barra", titulo,
                        mesa: evento.nombre, cliente, mozo: "-", hora, nota: "",
                        items: bebidas.map(it => ({ cantidad: it.cantidad, nombre: it.nombre })),
                    }),
                })
            );
            if (promesas.length > 0) { await Promise.all(promesas); return; }
        } catch { /* fallback */ }

        if (comida.length > 0)  abrirEImprimir(ventaEventoHtml(titulo, comida, cliente, hora));
        if (bebidas.length > 0) setTimeout(() => abrirEImprimir(ventaEventoHtml(titulo, bebidas, cliente, hora)), 600);
    }

    async function abrirVentaModal(eventoId: string) {
        if (menuItemsAll.length === 0) {
            const r = await fetch("/api/menu?activo=true", { credentials: "include" });
            const d = await r.json().catch(() => []);
            setMenuItemsAll(Array.isArray(d) ? d : []);
        }
        setVentaEventoId(eventoId);
        setVentaCart([]);
        setVentaMetodo("efectivo");
        setVentaSearch("");
        setVentaComensales([]);
        setVentaComensalesSearch("");
        setVentaComensalesResults([]);
        setVentaModal(true);
    }

    async function registrarVenta() {
        const eventoActivo = eventosActivos.find(e => e._id === ventaEventoId);
        if (!eventoActivo || ventaCart.length === 0) return;
        setVentaSaving(true);
        try {
            const items = ventaCart.map(it => ({
                menuItemId: it.menuItemId, nombre: it.nombre,
                precio: it.precio, categoria: it.categoria, cantidad: it.cantidad,
            }));
            const res = await fetch(`/api/eventos/${eventoActivo._id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    accion: "agregarVenta", items, metodoPago: ventaMetodo,
                    comensalesIds: ventaComensales.length > 0 ? ventaComensales.map(c => c._id) : undefined,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setEventosActivos(prev => prev.map(e => e._id === data.evento._id ? data.evento : e));
                await printVentaEvento(data.evento, ventaCart, ventaMetodo);
                setVentaModal(false);
                setVentaCart([]);
                setVentaMetodo("efectivo");
                setVentaSearch("");
            }
        } finally { setVentaSaving(false); }
    }

    function renderPlanoSelector(seleccionadas: string[], toggle: (nombre: string) => void, eventoActualId?: string | null) {
        return (
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
                <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                    {eventoModalElementos.map(el => {
                        const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                        const isBarra = el.tipo === "barra";
                        if (isLine) return (
                            <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: el.tipo === "linea_h" ? `${el.ancho}%` : "3px", height: el.tipo === "linea_v" ? `${el.alto}%` : "3px", backgroundColor: el.color, borderRadius: "2px", transform: el.tipo === "linea_h" ? "translateY(-50%)" : "translateX(-50%)" }} />
                        );
                        return (
                            <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%,-50%)", width: `${el.ancho}%`, height: `${el.alto}%`, minWidth: "32px", minHeight: "14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", backgroundColor: isBarra ? "#b45309" : el.color, border: isBarra ? "2px solid #92400e" : `1px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}60` }}>
                                {el.label && <span style={{ fontSize: "clamp(6px,0.9vw,9px)", fontWeight: 700, color: isBarra ? "#fef3c7" : "#374151", whiteSpace: "nowrap" }}>{el.label}</span>}
                            </div>
                        );
                    })}
                    {eventoModalMesasPlano.map(m => {
                        const sel       = seleccionadas.includes(m.nombre);
                        const ocupada   = !!pedidos.find(p => p.mesa === m.nombre && !["cerrado","cancelado"].includes(p.estado));
                        const reservada = !ocupada && !!reservasHoy.find(r => r.mesaId?._id === m._id);
                        const otroEvento = !ocupada && !reservada && eventosActivos.some(e =>
                            e._id !== eventoActualId && (e.mesas ?? []).includes(m.nombre)
                        );
                        const isBanq  = m.tipo === "banqueta";
                        const bloqueada = isBanq || ocupada || reservada || otroEvento;
                        const isRound = m.forma === "round" || m.forma === "oval";
                        const rot = m.rotacion ?? 0;
                        const w = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                        const h = m.alto || (m.forma === "oval" ? 5 : m.forma === "round" ? 5.5 : 5);
                        const bg = isBanq      ? "bg-amber-700 border-amber-800 text-amber-100"
                            : ocupada          ? "bg-red-500 border-red-600 text-white opacity-80"
                            : reservada        ? "bg-yellow-400 border-yellow-500 text-gray-900 opacity-80"
                            : otroEvento       ? "bg-purple-500 border-purple-600 text-white opacity-80"
                            : sel              ? "bg-blue-500 border-blue-600 text-white ring-2 ring-blue-300"
                            :                   "bg-emerald-500 border-emerald-600 text-white";
                        return (
                            <div key={m._id}
                                onClick={() => !bloqueada && toggle(m.nombre)}
                                style={{ position: "absolute", left: `${m.x ?? 10}%`, top: `${m.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: bloqueada ? "not-allowed" : "pointer", userSelect: "none", zIndex: 2 }}
                                className={`flex items-center justify-center border-2 ${bg} ${!bloqueada ? "transition-all active:scale-95" : ""}`}>
                                <div style={{ transform: `rotate(${-rot}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "clamp(5px,0.8vw,9px)", fontWeight: 900 }}>{m.nombre}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={36} /></div>;

    // Pedidos listos para cobrar: estado listo O entregado (ambos estados válidos)
    const paraCobrar = pedidos.filter(p => p.estado === "listo" || p.estado === "entregado");

    // Listas por estado
    const pendientes   = pedidos.filter(p => p.estado === "pendiente");
    const preparando   = pedidos.filter(p => p.estado === "preparando");
    const listos       = pedidos.filter(p => p.estado === "listo");
    const finalizados  = pedidos.filter(p => p.estado === "entregado" || p.estado === "cerrado");
    // Pendientes de cobro: la burbuja de Finalizados desaparece apenas se cobra (pasa a "cerrado")
    const entregadosPendientesCobro = pedidos.filter(p => p.estado === "entregado");

    let lista = vista === "pendientes" ? pendientes : vista === "preparando" ? preparando : vista === "listos" ? listos : finalizados;
    // Mozo primero
    lista = [...lista].sort((a, b) => {
        const aEmp = a.fuente === "empleado" || a.userId?.role === "empleado";
        const bEmp = b.fuente === "empleado" || b.userId?.role === "empleado";
        return aEmp && !bEmp ? -1 : !aEmp && bEmp ? 1 : 0;
    });

    const getEstadoIdx = (e: string) => ESTADOS.findIndex(x => x.key === e);

    const renderTabBtn = (key: Vista, label: string, count: number) => (
        <button onClick={() => setVista(key)}
            className={`relative flex-1 py-2.5 text-xs font-black transition rounded-xl ${
                vista === key
                    ? "bg-black text-white shadow-md"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}>
            {label}
            {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.3rem] px-1 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black text-center leading-tight">
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="text-white px-5 py-5" style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #1c1c1c 100%)" }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                    <div className={`rounded-2xl p-2.5 ${sesion ? "bg-emerald-500/20" : "bg-red-500/15"}`}>
                        <Wallet size={20} className={sesion ? "text-emerald-400" : "text-red-400"} />
                    </div>
                    <div>
                        <h1 className="font-black text-xl leading-tight tracking-tight">Caja</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {sesion ? (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    <span className="text-xs text-emerald-400 font-semibold">
                                        Abierta · desde {new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                                    <span className="text-xs text-red-400 font-semibold">Sin sesión activa</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!sesion && (
                        <span className="text-xs text-gray-500">{new Date().toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                    )}
                    {sesion && (
                        <button onClick={() => { setCloseModal(true); setCloseForm({ montoCierre: "", notas: "" }); setCloseStep("form"); }}
                            className="text-xs font-black bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-red-600/30">
                            Cerrar caja
                        </button>
                    )}
                </div>
            </div>

            {/* Switches pedidos / reservas */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Pedidos</span>
                    <button onClick={togglePedidosActivos}
                        className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${pedidosActivos ? "bg-red-500" : "bg-gray-600"}`}>
                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${pedidosActivos ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Reservas</span>
                    <button onClick={toggleReservasActivas}
                        className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${reservasActivas ? "bg-red-500" : "bg-gray-600"}`}>
                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${reservasActivas ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                    </button>
                </div>
            </div>
            </div>

            {/* Abrir caja */}
            {!sesion && (
                <div className="max-w-sm mx-auto px-4 mt-10">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 pt-8 pb-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Wallet size={28} className="text-emerald-600" />
                            </div>
                            <h2 className="font-black text-gray-900 text-xl tracking-tight">Abrir caja</h2>
                            <p className="text-sm text-gray-400 mt-1">Ingresá el monto inicial para comenzar</p>
                        </div>
                        <div className="px-6 pb-8 space-y-3">
                            <input type="number" min="0" value={openForm.montoInicial}
                                onChange={e => setOpenForm(p => ({ ...p, montoInicial: e.target.value }))}
                                placeholder="$0" style={{ fontSize: "16px" }}
                                className="w-full px-4 py-4 border-2 border-gray-100 focus:border-emerald-400 rounded-2xl text-3xl font-black text-center focus:outline-none transition-colors" />
                            <input value={openForm.notas} onChange={e => setOpenForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Notas (opcional)" style={{ fontSize: "16px" }}
                                className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-gray-300 transition-colors" />
                            <button onClick={abrirCaja} disabled={openSaving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/30 text-base">
                                <Wallet size={19} />{openSaving ? "Abriendo..." : "Abrir caja"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sesion && (
                <>
                    {/* Tabs principales */}
                    <div className="flex bg-white sticky top-0 z-10 border-b border-gray-100">
                        <button onClick={() => setTab("pedidos")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "pedidos" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Package size={15} /> Pedidos
                            {(pendientes.length + preparando.length + listos.length) > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "pedidos" ? "bg-black text-white" : "bg-red-100 text-red-600"}`}>
                                    {pendientes.length + preparando.length + listos.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("caja")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "caja" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Wallet size={15} /> Cobrar
                            {paraCobrar.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "caja" ? "bg-black text-white" : "bg-amber-100 text-amber-700"}`}>
                                    {paraCobrar.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("mesas")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "mesas" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <MapPin size={15} /> Mesas
                        </button>
                        <button onClick={() => setTab("reservas")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "reservas" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <CalendarDays size={15} /> Reservas
                            {reservasPendientes > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "reservas" ? "bg-black text-white" : "bg-red-100 text-red-600"}`}>
                                    {reservasPendientes}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("eventos")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "eventos" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Star size={15} /> Eventos
                            {eventosActivos.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "eventos" ? "bg-black text-white" : "bg-amber-100 text-amber-700"}`}>
                                    {eventosActivos.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("canjes")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "canjes" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Gift size={15} /> Canjes
                            {canjesPendientes.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "canjes" ? "bg-black text-white" : "bg-emerald-100 text-emerald-700"}`}>
                                    {canjesPendientes.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("menu")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "menu" ? "text-gray-900 border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <UtensilsCrossed size={15} /> Menú
                        </button>
                    </div>

                    {/* ── TAB PEDIDOS ── */}
                    {tab === "pedidos" && (
                        <div className="max-w-screen-2xl mx-auto px-4 pt-4">
                            {/* Nueva comanda (cajero actuando como mozo) */}
                            <button onClick={() => router.push("/empleado/anotador/menu")}
                                className="w-full mb-4 flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white font-bold py-3 rounded-2xl transition shadow-sm active:scale-[0.98]">
                                <Plus size={18} /> Nueva comanda
                            </button>

                            {/* Sub-tabs estado */}
                            <div className="flex gap-2 mb-5">
                                {renderTabBtn("pendientes",  "Pendientes",  pendientes.length)}
                                {renderTabBtn("preparando", "Preparando",  preparando.length)}
                                {renderTabBtn("listos",     "Listos",      listos.length)}
                                {renderTabBtn("finalizados","Finalizados", entregadosPendientesCobro.length)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
                                <AnimatePresence>
                                    {lista.length === 0 ? (
                                        <p className="col-span-full text-center text-gray-400 py-12">Sin pedidos en este estado.</p>
                                    ) : lista.map(p => {
                                        const esApp     = p.fuente !== "empleado";
                                        const esMozo    = !esApp && p.userId?.role === "empleado";
                                        const esCaja    = !esApp && !esMozo;
                                        const estadoIdx = getEstadoIdx(p.estado);
                                        const color     = ESTADOS[estadoIdx]?.color || "gray";
                                        const fechaHora = p.createdAt ? format(new Date(p.createdAt), "dd/MM HH:mm", { locale: es }) : "";
                                        const isUpdating = updatingId === p._id;

                                        const estadosMozo    = ESTADOS.filter(e => e.key !== "entregado" && e.key !== "cerrado");
                                        const estadosCliente = ESTADOS.filter(e => e.key !== "cerrado");
                                        const estadosList    = esApp ? estadosCliente : estadosMozo;

                                        const titulo = esApp
                                            ? (p.userId ? `${p.userId.nombre} ${p.userId.apellido || ""}`.trim() : "Cliente")
                                            : (p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || (esCaja ? "Caja" : "Sin mesa"));

                                        const subtitulo = esApp
                                            ? `${p.numeroDia ? `#${p.numeroDia} · ` : ""}${p.tipoEntrega === "envio" ? "Envío a domicilio" : "Retiro en local"}`
                                            : esMozo
                                                ? `Mozo: ${[p.userId?.nombre, p.userId?.apellido].filter(Boolean).join(" ")}`
                                                : "Caja";

                                        const accentBg     = esApp ? "bg-red-600"   : "bg-black";
                                        const cardBorder   = esApp ? "border-red-500" : "border-black";

                                        return (
                                            <motion.div key={p._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col h-[500px] ${cardBorder} bg-white`}>

                                                {/* ── Cabecera coloreada ── */}
                                                <div className={`shrink-0 px-4 py-3 ${accentBg}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-white text-xl leading-tight tracking-tight truncate">{titulo}</p>
                                                            <p className="text-xs text-white/65 font-medium mt-0.5">{subtitulo}</p>
                                                            {esApp && p.tipoEntrega === "envio" && p.direccion && (
                                                                <div className="flex items-start gap-1 mt-1 text-xs text-white/65">
                                                                    <MapPin size={9} className="shrink-0 mt-0.5" /><span className="truncate">{p.direccion}</span>
                                                                </div>
                                                            )}
                                                            {esApp && p.horarioPreferido && (
                                                                <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-white/85">
                                                                    <Clock size={9} className="shrink-0" /><span>{p.horarioPreferido}</span>
                                                                </div>
                                                            )}
                                                            {esApp && p.userId?.telefono && (
                                                                <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white mt-0.5 transition">
                                                                    <Phone size={9} />{p.userId.telefono}
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block ${ESTADO_BADGE[p.estado] || "bg-white/20 text-white"}`}>
                                                                {ESTADOS.find(e => e.key === p.estado)?.label || p.estado}
                                                            </span>
                                                            <p className="text-xs text-white/45 mt-1">{fechaHora}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Cuerpo ── */}
                                                <div className="p-3 flex flex-col flex-1 min-h-0 bg-white">
                                                    {/* Items */}
                                                    <ul className="mb-2 divide-y divide-gray-100 border border-gray-100 rounded-xl flex-1 min-h-0 overflow-y-auto">
                                                        {p.items.map((it, idx) => (
                                                            <li key={it._id || idx} className="flex items-center px-3 py-2.5 gap-2">
                                                                <span className="font-black text-gray-900 text-sm shrink-0">{it.cantidad}×</span>
                                                                <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{it.menuItemId?.nombre}</span>
                                                                {p.estado !== "cerrado" && p.estado !== "cancelado" && it._id && (
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button onClick={() => abrirSelectorProducto(p, { modo: "reemplazar", itemId: it._id!, nombreActual: it.menuItemId?.nombre || "ítem" })}
                                                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
                                                                            <Pencil size={12} />
                                                                        </button>
                                                                        <button onClick={() => eliminarItemPedido(p._id, it._id!, it.menuItemId?.nombre || "ítem")}
                                                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition">
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    {p.estado !== "cerrado" && p.estado !== "cancelado" && (
                                                        <button onClick={() => abrirSelectorProducto(p, { modo: "agregar" })}
                                                            className="shrink-0 mb-2 w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:border-gray-400 bg-white text-gray-500 hover:text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                            <Plus size={12} /> Agregar producto
                                                        </button>
                                                    )}

                                                    {(p.notaEmpleado || p.notaCliente) && (
                                                        <div className="shrink-0 border-l-2 border-amber-400 pl-3 py-1 mb-2">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">Nota</p>
                                                            <p className="text-xs text-gray-600 italic">{p.notaEmpleado || p.notaCliente}</p>
                                                        </div>
                                                    )}

                                                    {/* Total */}
                                                    {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 ? (
                                                        <div className="shrink-0 pt-2 pb-1 border-t border-gray-100 mb-2 space-y-0.5">
                                                            <div className="flex justify-between text-xs text-gray-500">
                                                                <span>Subtotal</span><span>{formatMoney(p.total - (p.costoEnvio ?? 0))}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-500">
                                                                <span>Envío</span><span>{formatMoney(p.costoEnvio ?? 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-black text-gray-900 text-lg">
                                                                <span>Total</span><span>{formatMoney(p.total)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="shrink-0 flex justify-between items-center pt-2 border-t border-gray-100 mb-2">
                                                            <span className="text-xs font-black text-gray-400 uppercase tracking-wide">Total</span>
                                                            <span className="font-black text-gray-900 text-xl">{formatMoney(p.total)}</span>
                                                        </div>
                                                    )}

                                                    {/* WhatsApp para pedidos app */}
                                                    {esApp && p.userId?.telefono && (
                                                        <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                            className="shrink-0 mb-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition">
                                                            <MessageCircle size={13} /> WhatsApp
                                                        </a>
                                                    )}

                                                    {/* Botones pendiente */}
                                                    {p.estado === "pendiente" ? (
                                                        <div className="shrink-0 flex gap-2">
                                                            <button disabled={isUpdating}
                                                                onClick={async () => {
                                                                    await printComanda(p);
                                                                    await avanzarEstado(p, "preparando");
                                                                }}
                                                                className={`flex-1 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 ${esApp ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-900"}`}>
                                                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                                                Aceptar
                                                            </button>
                                                            <button onClick={() => rechazarPedido(p._id)}
                                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition">
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    ) : estadoIdx < estadosList.length - 1 ? (
                                                        <div className="shrink-0 relative w-full flex justify-between items-center mt-1">
                                                            <div className="absolute top-[16px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />
                                                            <motion.div
                                                                className={`absolute top-[16px] left-0 h-[3px] ${BAR_COLORS[color] || "bg-gray-400"} rounded-full`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(estadoIdx / (estadosList.length - 1)) * 100}%` }}
                                                                transition={{ duration: 0.4 }}
                                                            />
                                                            {estadosList.map((est) => {
                                                                const Icon = est.icon;
                                                                const isActive = estadoIdx >= getEstadoIdx(est.key);
                                                                const canClick = getEstadoIdx(est.key) > estadoIdx;
                                                                return (
                                                                    <div key={est.key} className="flex flex-col items-center text-xs w-full relative z-10">
                                                                        <motion.button
                                                                            disabled={!canClick || isUpdating}
                                                                            onClick={() => canClick && avanzarEstado(p, est.key)}
                                                                            whileTap={canClick ? { scale: 0.9 } : undefined}
                                                                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                                                                                ${isActive ? COLOR_CLASSES[est.color] : "border-gray-300 bg-white text-gray-400"}
                                                                                ${!canClick ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}>
                                                                            <Icon className="w-3.5 h-3.5" />
                                                                        </motion.button>
                                                                        <span className={`mt-1 font-medium ${isActive ? "text-gray-700" : "text-gray-400"}`}>
                                                                            {est.label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}

                                                    {/* Reimprimir / Cobrar */}
                                                    {p.estado !== "pendiente" && (
                                                        <div className="shrink-0 mt-2 flex gap-2">
                                                            <button onClick={() => printComanda(p)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                                <Printer size={12} /> Reimprimir
                                                            </button>
                                                            {(p.estado === "listo" || p.estado === "entregado") && (
                                                                <button onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ descuento: "", propina: "", pagos: [{ metodo: "efectivo", monto: String(p.total) }] }); }}
                                                                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-xl text-xs transition">
                                                                    <Wallet size={12} /> Cobrar
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* ── TAB COBRAR ── */}
                    {tab === "caja" && (
                        <div className="max-w-screen-2xl mx-auto px-4 pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-black text-gray-900 text-lg tracking-tight">Para cobrar</h2>
                                {paraCobrar.length > 0 && (
                                    <span className="text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{paraCobrar.length}</span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
                            {paraCobrar.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-400">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Wallet size={28} className="text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-400">Sin pedidos para cobrar</p>
                                    <p className="text-sm mt-1 text-gray-300">Aparecen acá cuando el pedido está Listo o Finalizado</p>
                                </div>
                            ) : paraCobrar.map(p => {
                                const esApp  = p.fuente !== "empleado";
                                const esMozo = !esApp && p.userId?.role === "empleado";

                                const titulo = esApp
                                    ? (p.userId ? `${p.userId.nombre} ${p.userId.apellido || ""}`.trim() : "Cliente")
                                    : (p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || (!esMozo ? "Caja" : "Sin mesa"));

                                const subtitulo = esApp
                                    ? `${p.numeroDia ? `#${p.numeroDia} · ` : ""}${p.tipoEntrega === "envio" ? "Envío" : "Local"}`
                                    : esMozo
                                        ? `Mozo: ${[p.userId?.nombre, p.userId?.apellido].filter(Boolean).join(" ")}`
                                        : "Caja";

                                const accentBg   = esApp ? "bg-red-600"    : "bg-black";
                                const cardBorder = esApp ? "border-red-500" : "border-black";
                                const cobrarBg   = "bg-black hover:bg-gray-900";

                                return (
                                    <div key={p._id} className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col h-[500px] ${cardBorder} bg-white`}>
                                        {/* ── Cabecera coloreada ── */}
                                        <div className={`shrink-0 px-4 py-3 ${accentBg}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-white text-xl leading-tight tracking-tight truncate">{titulo}</p>
                                                    <p className="text-xs text-white/65 font-medium mt-0.5">{subtitulo}</p>
                                                    <p className="text-xs text-white/45 mt-0.5">
                                                        {format(new Date(p.createdAt), "HH:mm", { locale: es })}
                                                        {p.tipoEntrega === "envio" ? " · Envío" : ""}
                                                        {p.comensales ? ` · ${p.comensales} pers.` : ""}
                                                    </p>
                                                    {esApp && p.horarioPreferido && (
                                                        <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-white/85">
                                                            <Clock size={9} className="shrink-0" /><span>{p.horarioPreferido}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="font-black text-white text-xl leading-none">{formatMoney(p.total)}</p>
                                                    <span className={`text-[10px] font-black mt-1 px-2.5 py-1 rounded-full inline-block ${ESTADO_BADGE[p.estado] || "bg-white/20 text-white"}`}>
                                                        {ESTADOS.find(e => e.key === p.estado)?.label || p.estado}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Items ── */}
                                        <div className="px-4 py-3 flex-1 min-h-0 overflow-y-auto space-y-1.5">
                                            {p.items.map((item, idx) => (
                                                <div key={item._id || idx} className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900 text-sm shrink-0">{item.cantidad}×</span>
                                                    <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{item.menuItemId?.nombre}</span>
                                                    <span className="text-xs text-gray-400 shrink-0">{formatMoney((item.menuItemId?.precio || 0) * item.cantidad)}</span>
                                                    {item._id && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => abrirSelectorProducto(p, { modo: "reemplazar", itemId: item._id!, nombreActual: item.menuItemId?.nombre || "ítem" })}
                                                                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
                                                                <Pencil size={11} />
                                                            </button>
                                                            <button onClick={() => eliminarItemPedido(p._id, item._id!, item.menuItemId?.nombre || "ítem")}
                                                                className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition">
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 && (
                                                <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-1.5 mt-1">
                                                    <span>Envío a domicilio</span>
                                                    <span>{formatMoney(p.costoEnvio ?? 0)}</span>
                                                </div>
                                            )}
                                            {(p.notaEmpleado || p.notaCliente) && (
                                                <div className="border-l-2 border-amber-400 pl-2 py-0.5 mt-1">
                                                    <p className="text-xs text-gray-600 italic">{p.notaEmpleado || p.notaCliente}</p>
                                                </div>
                                            )}
                                            <button onClick={() => abrirSelectorProducto(p, { modo: "agregar" })}
                                                className="mt-1 w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:border-gray-400 bg-white text-gray-500 hover:text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                <Plus size={12} /> Agregar producto
                                            </button>
                                        </div>

                                        {/* ── Botón cobrar ── */}
                                        <div className="px-3 pb-3">
                                            <button
                                                onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ descuento: "", propina: "", pagos: [{ metodo: "efectivo", monto: String(p.total) }] }); }}
                                                className={`w-full text-white font-black py-3 rounded-xl text-base tracking-wide transition ${cobrarBg}`}>
                                                Cobrar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {/* ── TAB MESAS ── */}
                    {tab === "mesas" && (
                        <div className="max-w-4xl mx-auto px-4 pt-4">
                            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Libre</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Ocupada</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />Reservada hoy</span>
                                {eventosActivos.length > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Evento</span>}
                            </div>
                            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
                                <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                                    {elementsPlano.map(el => {
                                        const isLine = el.tipo === "linea_h" || el.tipo === "linea_v";
                                        const isBarra = el.tipo === "barra";
                                        if (isLine) return (
                                            <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: el.tipo === "linea_h" ? `${el.ancho}%` : "3px", height: el.tipo === "linea_v" ? `${el.alto}%` : "3px", backgroundColor: el.color, borderRadius: "2px", transform: el.tipo === "linea_h" ? "translateY(-50%)" : "translateX(-50%)" }} />
                                        );
                                        return (
                                            <div key={el._id} style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%,-50%)", width: `${el.ancho}%`, height: `${el.alto}%`, minWidth: "32px", minHeight: "14px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", backgroundColor: isBarra ? "#b45309" : el.color, border: isBarra ? "2px solid #92400e" : `1px solid ${el.color === "#fef3c7" ? "#d97706" : "#9ca3af"}60` }}>
                                                {el.label && <span style={{ fontSize: "clamp(6px,0.9vw,9px)", fontWeight: 700, color: isBarra ? "#fef3c7" : "#374151", whiteSpace: "nowrap" }}>{el.label}</span>}
                                            </div>
                                        );
                                    })}
                                    {mesasPlano.filter(m => m.activa).map(m => {
                                        const pedido = pedidoDeMesa(m.nombre);
                                        const ocupada = !!pedido;
                                        const reserva = !ocupada ? reservasHoy.find(r => r.mesaId?._id === m._id) : undefined;
                                        const reservada = !!reserva;
                                        const mesasDeEventos = new Set(eventosActivos.flatMap(e => e.mesas ?? []));
                                        const esEvento = !ocupada && !reservada && mesasDeEventos.has(m.nombre);
                                        const isRound = m.forma === "round" || m.forma === "oval";
                                        const isBanq = m.tipo === "banqueta";
                                        const rot = m.rotacion ?? 0;
                                        const w = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                                        const h = m.alto || (m.forma === "oval" ? 5 : m.forma === "round" ? 5.5 : 5);
                                        const bg = isBanq
                                            ? "bg-amber-700 border-amber-800 text-amber-100"
                                            : ocupada ? "bg-red-500 border-red-600 text-white"
                                            : reservada ? "bg-yellow-400 border-yellow-500 text-gray-900"
                                            : esEvento ? "bg-blue-500 border-blue-600 text-white"
                                            : "bg-emerald-500 border-emerald-600 text-white";
                                        const clickeable = ocupada || reservada;
                                        return (
                                            <div key={m._id}
                                                onClick={() => {
                                                    if (pedido) setMesaDetalle({ mesa: m, pedido });
                                                    else if (reserva) setReservaDetalle(reserva);
                                                }}
                                                style={{ position: "absolute", left: `${m.x ?? 10}%`, top: `${m.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: clickeable ? "pointer" : "default", userSelect: "none", zIndex: 2 }}
                                                className={`flex items-center justify-center border-2 ${bg} ${clickeable ? "hover:brightness-110 active:scale-95 transition-all" : ""}`}>
                                                <div style={{ transform: `rotate(${-rot}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <span style={{ fontSize: "clamp(5px,0.8vw,9px)", fontWeight: 900 }}>{m.nombre}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB RESERVAS ── */}
                    {tab === "reservas" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            <ReservasManager onPendingCountChange={setReservasPendientes} />
                        </div>
                    )}

                    {/* ── TAB EVENTOS ── */}
                    {tab === "eventos" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-4">

                            {/* Botón crear siempre visible */}
                            <button onClick={abrirCrearEvento}
                                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-700 text-white font-bold py-3 rounded-2xl transition active:scale-95">
                                <Plus size={18} /> Nuevo evento
                            </button>

                            {!eventosLoaded ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
                            ) : eventosActivos.length === 0 ? (
                                <div className="text-center py-12">
                                    <Star size={32} className="mx-auto text-gray-200 mb-3" />
                                    <p className="font-bold text-gray-400">Sin eventos activos</p>
                                </div>
                            ) : eventosActivos.map(ev => {
                                const pedidosEv = pedidos.filter(p => p.eventoId === ev._id);
                                const totalPedidos = pedidosEv.reduce((a, p) => a + (p.total || 0), 0);
                                const totalVentas  = ev.ventas.reduce((a, v) => a + v.total, 0);
                                const totalTarjetas = (ev as any).tarjetas?.reduce((a: number, t: any) => a + t.cantidad, 0) ?? 0;
                                const precioTarjeta = (ev as any).precioTarjeta ?? 0;
                                return (
                                <div key={ev._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                                    {/* Header del evento */}
                                    <div className="flex items-start justify-between gap-3 px-4 py-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Activo</span>
                                            </div>
                                            <h2 className="font-black text-gray-900 text-lg">{ev.nombre}</h2>
                                            <p className="text-xs text-gray-400">Total: {formatMoney(totalVentas + totalPedidos + totalTarjetas * precioTarjeta)}</p>
                                        </div>
                                        <button onClick={() => abrirCierreEvento(ev._id)}
                                            className="text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl transition shrink-0">
                                            Cerrar evento
                                        </button>
                                    </div>

                                    {/* Mesas */}
                                    <div className="px-4 pb-3 border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mesas del evento</p>
                                            <button onClick={() => abrirEditMesas(ev._id)} className="text-[10px] font-bold text-blue-600 hover:underline">Editar</button>
                                        </div>
                                        {(ev.mesas ?? []).length === 0 ? (
                                            <button onClick={() => abrirEditMesas(ev._id)} className="text-xs text-gray-400 hover:text-blue-600 transition">+ Asignar mesas</button>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {ev.mesas.map(m => <span key={m} className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{m}</span>)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tarjetas */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tarjetas</p>
                                                {precioTarjeta > 0 && <p className="text-xs text-gray-500">{totalTarjetas} tarjetas · {formatMoney(precioTarjeta)} c/u = <span className="font-black text-gray-900">{formatMoney(totalTarjetas * precioTarjeta)}</span></p>}
                                                {precioTarjeta === 0 && <p className="text-xs text-gray-400">Precio no configurado</p>}
                                            </div>
                                            <button onClick={() => abrirTarjetasModal(ev._id)}
                                                className="text-xs font-bold text-white bg-black hover:bg-gray-700 px-3 py-1.5 rounded-xl transition">
                                                + Registrar
                                            </button>
                                        </div>
                                        {(ev as any).tarjetas?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {[...(ev as any).tarjetas].reverse().slice(0, 8).map((t: any, i: number) => (
                                                    <span key={i} className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                                        {t.cantidad}× · {new Date(t.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Comandas vinculadas */}
                                    {pedidosEv.length > 0 && (
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Comandas ({pedidosEv.length})</p>
                                            <div className="space-y-1">
                                                {pedidosEv.map(p => (
                                                    <div key={p._id} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-1.5 text-sm">
                                                        <span className="font-bold text-blue-900">{p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || "Comanda"}</span>
                                                        <span className="font-black text-blue-900">{formatMoney(p.total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ventas directas */}
                                    <div className="px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ventas directas ({ev.ventas.length})</p>
                                            <button onClick={() => abrirVentaModal(ev._id)}
                                                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition">
                                                + Registrar venta
                                            </button>
                                        </div>
                                        {ev.ventas.length === 0 ? (
                                            <p className="text-xs text-gray-300 py-2">Sin ventas registradas</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {[...ev.ventas].reverse().map(v => {
                                                    const Icon = METODO_ICON[v.metodoPago] || Banknote;
                                                    return (
                                                        <div key={v._id} className="bg-gray-50 rounded-xl px-3 py-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                                                    <Icon size={9} /> {METODO_LABEL[v.metodoPago]}
                                                                    <span className="text-gray-300 font-normal ml-1">{new Date(v.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                                                                </span>
                                                                <span className="font-black text-gray-900 text-sm">{formatMoney(v.total)}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500">{v.items.map(it => `${it.cantidad}× ${it.nombre}`).join(", ")}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}

                            {/* ── Historial de eventos cerrados ── */}
                            <div className="mt-2">
                                <button
                                    onClick={() => {
                                        if (!historialVisible) cargarHistorial();
                                        setHistorialVisible(v => !v);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition text-sm font-bold text-gray-600">
                                    <span>Historial de eventos cerrados</span>
                                    <span className="text-gray-400">{historialVisible ? "▲" : "▼"}</span>
                                </button>

                            {historialVisible && (
                                <div className="mt-3 space-y-3">
                                    {historialLoading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
                                    ) : eventosCerrados.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-6">Sin eventos cerrados</p>
                                    ) : eventosCerrados.map(ev => {
                                        const cd = ev.cierreData;
                                        const fechaCierre = cd?.fecha
                                            ? new Date(cd.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                                            : new Date(ev.updatedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

                                        // Agregar items de todas las ventas del evento
                                        const grouped: Record<string, { cantidad: number; total: number; categoria: string }> = {};
                                        (ev.ventas ?? []).forEach((v: any) => {
                                            (v.items ?? []).forEach((it: any) => {
                                                if (!grouped[it.nombre]) grouped[it.nombre] = { cantidad: 0, total: 0, categoria: it.categoria ?? "" };
                                                grouped[it.nombre].cantidad += it.cantidad;
                                                grouped[it.nombre].total   += it.precio * it.cantidad;
                                            });
                                        });
                                        const productList = Object.entries(grouped)
                                            .map(([nombre, d]) => ({ nombre, ...d }))
                                            .sort((a, b) => b.total - a.total);
                                        const expandido = historialExpandidos.has(ev._id);
                                        const toggleExpandido = () => setHistorialExpandidos(prev => {
                                            const next = new Set(prev);
                                            next.has(ev._id) ? next.delete(ev._id) : next.add(ev._id);
                                            return next;
                                        });

                                        return (
                                            <div key={ev._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                {/* Header */}
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cerrado · {fechaCierre}</span>
                                                        <h3 className="font-black text-gray-900 leading-tight">{ev.nombre}</h3>
                                                    </div>
                                                    {cd && <span className="font-black text-gray-900 text-lg">{formatMoney(cd.totalGeneral)}</span>}
                                                </div>

                                                {cd ? (
                                                    <div className="px-4 py-3 space-y-3">
                                                        {/* Tarjetas entrada */}
                                                        {cd.entradasCantidad > 0 && (
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-500 flex items-center gap-1.5"><Star size={12} /> Tarjetas entrada ({cd.entradasCantidad}× {formatMoney(cd.entradasPrecio)})</span>
                                                                <span className="font-bold text-gray-900">{formatMoney(cd.entradasTotal)}</span>
                                                            </div>
                                                        )}

                                                        {/* Desglose por método */}
                                                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Desglose por método</p>
                                                            {[
                                                                { label: "Efectivo",              icon: Banknote,   total: cd.totalEfectivo,      ventas: cd.ventasEfectivo,      comandas: cd.comandasEfectivo },
                                                                { label: "Transferencia",         icon: Send,       total: cd.totalTransferencia, ventas: cd.ventasTransferencia, comandas: cd.comandasTransferencia },
                                                                { label: "Tarjeta",               icon: CreditCard, total: cd.totalTarjeta,       ventas: cd.ventasTarjeta,       comandas: cd.comandasTarjeta },
                                                            ].filter(m => m.total > 0).map(m => (
                                                                <div key={m.label} className="flex items-center justify-between text-sm">
                                                                    <span className="text-gray-600 flex items-center gap-1.5"><m.icon size={11} /> {m.label}</span>
                                                                    <div className="text-right">
                                                                        <span className="font-bold text-gray-900">{formatMoney(m.total)}</span>
                                                                        {(m.ventas > 0 || m.comandas > 0) && (
                                                                            <span className="text-[10px] text-gray-400 ml-1">
                                                                                {[m.ventas > 0 && `ventas ${formatMoney(m.ventas)}`, m.comandas > 0 && `comandas ${formatMoney(m.comandas)}`].filter(Boolean).join(" + ")}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {cd.comandasSinCobrar > 0 && (
                                                                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
                                                                    <span className="text-amber-600 flex items-center gap-1.5"><AlertCircle size={11} /> Sin cobrar al cierre</span>
                                                                    <span className="font-bold text-amber-600">{formatMoney(cd.comandasSinCobrar)}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Total general */}
                                                        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                                            <span className="text-sm font-black text-gray-900">Total general</span>
                                                            <span className="font-black text-gray-900 text-base">{formatMoney(cd.totalGeneral)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="px-4 py-3 text-xs text-gray-400">Sin resumen de cierre registrado</p>
                                                )}

                                                {/* Toggle productos */}
                                                {productList.length > 0 && (
                                                    <>
                                                        <button
                                                            onClick={toggleExpandido}
                                                            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-50 transition">
                                                            <span>Productos consumidos ({productList.length})</span>
                                                            <span>{expandido ? "▲" : "▼"}</span>
                                                        </button>
                                                        {expandido && (
                                                            <div className="px-4 pb-3">
                                                                <div className="rounded-xl overflow-hidden border border-gray-100">
                                                                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                                                        <span>Producto</span>
                                                                        <span className="text-center">Cant.</span>
                                                                        <span className="text-right">Total</span>
                                                                    </div>
                                                                    {productList.map((p, i) => (
                                                                        <div key={i} className={`grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                                            <div>
                                                                                <span className="font-semibold text-gray-900">{p.nombre}</span>
                                                                                {p.categoria && <span className="text-[10px] text-gray-400 ml-1.5">{p.categoria}</span>}
                                                                            </div>
                                                                            <span className="text-center font-bold text-gray-700">{p.cantidad}</span>
                                                                            <span className="text-right font-bold text-gray-900">{formatMoney(p.total)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                    {/* ── TAB CANJES ── */}
                    {tab === "canjes" && (
                        <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-6">

                            {/* ── Solicitudes pendientes ── */}
                            <section>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Solicitudes pendientes</p>
                                {canjesPendientes.length === 0 ? (
                                    <div className="bg-gray-50 rounded-2xl border border-gray-100 py-8 text-center">
                                        <Gift size={24} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-400">Sin solicitudes pendientes</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {canjesPendientes.map(c => (
                                            <div key={c._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                    <div>
                                                        <p className="font-black text-gray-900">{c.userId?.nombre} {c.userId?.apellido}</p>
                                                        <p className="text-xs text-gray-400">{c.userId?.puntos ?? 0} pts disponibles</p>
                                                    </div>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(c.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                                <div className="px-4 py-3">
                                                    <div className="flex items-start gap-3">
                                                        <Gift size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900">{c.rewardId?.titulo}</p>
                                                            {c.rewardId?.descripcion && <p className="text-sm text-gray-500 mt-0.5">{c.rewardId.descripcion}</p>}
                                                            <p className="text-sm font-black text-emerald-600 mt-1">{c.puntosGastados} pts</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-4 pb-4 flex gap-2">
                                                    <button onClick={() => procesarCanje(c._id, "rechazar")} disabled={canjeProcessing === c._id}
                                                        className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl text-sm transition active:scale-95 disabled:opacity-50">
                                                        <XCircle size={15} /> Rechazar
                                                    </button>
                                                    <button onClick={() => procesarCanje(c._id, "aceptar")} disabled={canjeProcessing === c._id}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95 disabled:opacity-50">
                                                        <CheckCircle size={15} /> Aceptar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ── Gestión de canjes disponibles ── */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Canjes disponibles</p>
                                    <button onClick={() => abrirRewardForm()}
                                        className="flex items-center gap-1.5 bg-black hover:bg-gray-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition active:scale-95">
                                        <Plus size={13} /> Nuevo
                                    </button>
                                </div>

                                {/* Formulario crear/editar */}
                                {rewardFormOpen && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 space-y-3">
                                        <p className="font-bold text-gray-900 text-sm">{rewardEditId ? "Editar canje" : "Nuevo canje"}</p>
                                        <input
                                            value={rewardForm.titulo}
                                            onChange={e => setRewardForm(p => ({ ...p, titulo: e.target.value }))}
                                            placeholder="Título *"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                                        />
                                        <input
                                            type="number" min="1"
                                            value={rewardForm.puntos || ""}
                                            onChange={e => setRewardForm(p => ({ ...p, puntos: Number(e.target.value) }))}
                                            placeholder="Puntos *"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                                        />
                                        <textarea
                                            value={rewardForm.descripcion}
                                            onChange={e => setRewardForm(p => ({ ...p, descripcion: e.target.value }))}
                                            placeholder="Descripción (opcional)"
                                            rows={2}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 resize-none"
                                        />
                                        <select value={rewardForm.tema} onChange={e => setRewardForm(p => ({ ...p, tema: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 bg-white">
                                            <option value="">Tarjeta estándar</option>
                                            <option value="argentina">🇦🇷 Especial Argentina — Mundial 2026</option>
                                        </select>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => { setRewardFormOpen(false); setRewardEditId(null); }}
                                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl text-sm transition hover:bg-gray-50">
                                                Cancelar
                                            </button>
                                            <button onClick={guardarReward} disabled={rewardSaving || !rewardForm.titulo.trim() || rewardForm.puntos <= 0}
                                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                                                {rewardSaving ? "Guardando..." : rewardEditId ? "Guardar" : "Crear"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {rewards.length === 0 ? (
                                    <div className="bg-gray-50 rounded-2xl border border-gray-100 py-8 text-center">
                                        <p className="text-sm text-gray-400">No hay canjes creados</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {rewards.map(r => (
                                            <div key={r._id} className={`bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start justify-between gap-3 ${!r.activo ? "opacity-50" : ""}`}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-900 text-sm">{r.titulo}</p>
                                                        {r.tema === "argentina" && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">🇦🇷 Mundial</span>}
                                                    </div>
                                                    {r.descripcion && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.descripcion}</p>}
                                                    <p className="text-xs font-black text-red-600 mt-1">{r.puntos} pts</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button onClick={() => toggleReward(r._id)}
                                                        className={`text-xs font-bold px-2 py-1 rounded-lg transition ${r.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                                        {r.activo ? "Activo" : "Inactivo"}
                                                    </button>
                                                    <button onClick={() => abrirRewardForm(r)}
                                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button onClick={() => eliminarReward(r._id)}
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* ── TAB MENÚ ── */}
                    {tab === "menu" && (
                        <div className="max-w-3xl mx-auto px-4 pt-4 pb-10">
                            {/* Header + botón agregar */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="font-black text-gray-900 text-lg">Menú</h2>
                                    <p className="text-xs text-gray-400">{menuGest.length} productos</p>
                                </div>
                                <button
                                    onClick={() => { setMenuGestShowForm(f => !f); setMenuGestEditId(null); setMenuGestForm({ nombre: "", precio: "", descripcion: "", categoria: "" }); setMenuGestSelectCat(""); }}
                                    className="flex items-center gap-2 bg-black text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-900 transition">
                                    <Plus size={15} /> Agregar
                                </button>
                            </div>

                            {/* Formulario agregar / editar */}
                            <AnimatePresence>
                                {menuGestShowForm && (
                                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3 shadow-sm">
                                        <h3 className="font-black text-gray-900">{menuGestEditId ? "Editar producto" : "Nuevo producto"}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input className="col-span-2 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                                placeholder="Nombre *" value={menuGestForm.nombre}
                                                onChange={e => setMenuGestForm(f => ({ ...f, nombre: e.target.value }))} />
                                            <input className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                                placeholder="Precio *" type="text" value={menuGestForm.precio}
                                                onChange={e => setMenuGestForm(f => ({ ...f, precio: e.target.value.replace(/[^0-9.,]/g, "") }))} />
                                            <select className="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
                                                value={menuGestSelectCat}
                                                onChange={e => { setMenuGestSelectCat(e.target.value); setMenuGestForm(f => ({ ...f, categoria: e.target.value === "__nueva__" ? "" : e.target.value })); }}>
                                                <option value="">Categoría *</option>
                                                {Array.from(new Set(menuGest.map(i => i.categoria))).sort().map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                                <option value="__nueva__">+ Nueva categoría...</option>
                                            </select>
                                        </div>
                                        {menuGestSelectCat === "__nueva__" && (
                                            <input className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Nombre de la nueva categoría (ej: PASTAS)"
                                                value={menuGestForm.categoria}
                                                onChange={e => setMenuGestForm(f => ({ ...f, categoria: e.target.value.toUpperCase() }))} />
                                        )}
                                        <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
                                            rows={2} placeholder="Descripción (opcional)" value={menuGestForm.descripcion}
                                            onChange={e => setMenuGestForm(f => ({ ...f, descripcion: e.target.value }))} />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => { setMenuGestShowForm(false); setMenuGestEditId(null); }}
                                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                                                Cancelar
                                            </button>
                                            <button onClick={saveMenuGestItem} disabled={menuGestSaving}
                                                className="px-5 py-2 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition disabled:opacity-50">
                                                {menuGestSaving ? "Guardando..." : (menuGestEditId ? "Guardar cambios" : "Agregar")}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Filtro por categoría + búsqueda */}
                            <div className="flex gap-2 mb-3">
                                <input className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="Buscar producto..." value={menuGestSearch}
                                    onChange={e => setMenuGestSearch(e.target.value)} />
                            </div>
                            <div className="flex gap-2 flex-wrap mb-4">
                                {["todas", ...Array.from(new Set(menuGest.map(i => i.categoria))).sort()].map(cat => (
                                    <button key={cat} onClick={() => setMenuGestCat(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${menuGestCat === cat ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                        {cat === "todas" ? "Todas" : cat}
                                    </button>
                                ))}
                            </div>

                            {/* Lista de productos */}
                            {menuGestLoading ? (
                                <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
                            ) : (
                                <div className="space-y-2">
                                    {menuGest
                                        .filter(i => menuGestCat === "todas" || i.categoria === menuGestCat)
                                        .filter(i => !menuGestSearch || i.nombre.toLowerCase().includes(menuGestSearch.toLowerCase()))
                                        .map(item => (
                                            <div key={item._id} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm transition ${item.activo === false ? "opacity-50 border-gray-100" : "border-gray-200"}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{item.nombre}</p>
                                                    <p className="text-xs text-gray-400">{item.categoria} · ${new Intl.NumberFormat("es-AR").format(item.precio)}</p>
                                                    {item.descripcion && <p className="text-xs text-gray-400 truncate mt-0.5">{item.descripcion}</p>}
                                                </div>
                                                {/* Toggle activo */}
                                                <button onClick={() => toggleMenuGestActivo(item)}
                                                    className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full items-center transition-colors duration-200 ${item.activo !== false ? "bg-red-500" : "bg-gray-300"}`}>
                                                    <span className={`absolute h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${item.activo !== false ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
                                                </button>
                                                {/* Editar */}
                                                <button onClick={() => abrirEditarMenuGest(item)}
                                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                                                    <Pencil size={13} />
                                                </button>
                                                {/* Eliminar */}
                                                <button onClick={() => eliminarMenuGestItem(item._id)}
                                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                    {menuGest.filter(i => menuGestCat === "todas" || i.categoria === menuGestCat).filter(i => !menuGestSearch || i.nombre.toLowerCase().includes(menuGestSearch.toLowerCase())).length === 0 && (
                                        <p className="text-center text-gray-400 py-10">Sin productos en esta categoría.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modal cerrar caja */}
            {closeModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        {closeStep === "resumen" ? (
                            <>
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                    <h2 className="font-black text-gray-900 flex-1">Caja cerrada</h2>
                                    <CheckCircle size={18} className="text-emerald-500" />
                                </div>
                                <div className="px-5 py-4 space-y-2">
                                    <p className="text-sm text-gray-500 mb-1">Recaudado en esta sesión:</p>
                                    {METODOS.map(met => {
                                        const r = cierreResumen[met];
                                        const neto = (r?.ingreso || 0) - (r?.egreso || 0);
                                        const Icon = METODO_ICON[met];
                                        return (
                                            <div key={met} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <Icon size={14} />{METODO_LABEL[met]}
                                                </span>
                                                <span className="font-black text-gray-900">{formatMoney(neto)}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 mt-2">
                                        <span className="text-sm font-black text-gray-900">Total cobrado</span>
                                        <span className="text-lg font-black text-gray-900">
                                            {formatMoney(METODOS.reduce((acc, met) => acc + ((cierreResumen[met]?.ingreso || 0) - (cierreResumen[met]?.egreso || 0)), 0))}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-4 border-t border-gray-100">
                                    <button onClick={() => { setCloseModal(false); setCloseForm({ montoCierre: "", notas: "" }); }}
                                        className="w-full py-2.5 bg-black hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition">
                                        Listo
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                    <h2 className="font-black text-gray-900 flex-1">Cerrar caja</h2>
                                    <button onClick={() => setCloseModal(false)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                                </div>
                                <div className="px-5 py-4 space-y-3">
                                    <p className="text-sm text-gray-600">
                                        Abierta desde las <strong>{sesion ? new Date(sesion.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
                                        {sesion && ` · Inicial: ${formatMoney(sesion.montoInicial)}`}
                                    </p>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Monto en caja al cierre</label>
                                        <input type="number" min="0" value={closeForm.montoCierre}
                                            onChange={e => setCloseForm(p => ({ ...p, montoCierre: e.target.value }))}
                                            placeholder="$0" style={{ fontSize: "16px" }}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-red-400" />
                                    </div>
                                    <input value={closeForm.notas} onChange={e => setCloseForm(p => ({ ...p, notas: e.target.value }))}
                                        placeholder="Notas del cierre (opcional)"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                                    {closeError && <p className="text-red-600 text-xs font-semibold">{closeError}</p>}
                                </div>
                                <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                                    <button onClick={() => { setCloseModal(false); setCloseError(""); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                                    <button onClick={cerrarCaja} disabled={closeSaving}
                                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                        {closeSaving ? "Cerrando..." : "Confirmar cierre"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal cobrar */}
            {cobrarModal.open && cobrarModal.pedido && (() => {
                const ped = cobrarModal.pedido;
                const descuento = Math.max(0, Number(cobrarForm.descuento) || 0);
                const totalConDescuento = Math.max(0, ped.total - descuento);
                const totalPagado = cobrarForm.pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0);
                const pendiente = totalConDescuento - totalPagado;
                const hayEfectivo = cobrarForm.pagos.some(p => p.metodo === "efectivo");
                const vuelto = Math.max(0, totalPagado - totalConDescuento);
                const esValido = pendiente <= 1;
                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl max-h-[92vh] flex flex-col">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                                <h2 className="font-black text-gray-900 flex-1">
                                    Cobrar {ped.mesa ? `Mesa ${ped.mesa}` : ped.nombreComanda || ""}
                                </h2>
                                <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="p-1 text-gray-400"><X size={18} /></button>
                            </div>
                            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                                {/* Items */}
                                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                    {ped.items.map((i, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{i.cantidad}× {i.menuItemId?.nombre}</span>
                                            <span className="font-semibold text-gray-900">{formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</span>
                                        </div>
                                    ))}
                                    {ped.tipoEntrega === "envio" && (ped.costoEnvio ?? 0) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700">Envío a domicilio</span>
                                            <span className="font-semibold text-gray-900">{formatMoney(ped.costoEnvio ?? 0)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 mt-1">
                                        <span>TOTAL</span><span>{formatMoney(ped.total)}</span>
                                    </div>
                                </div>

                                {/* Descuento */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Descuento en pesos</label>
                                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-400 focus-within:border-transparent">
                                        <span className="text-gray-400 text-sm font-semibold">−$</span>
                                        <input type="number" min="0" max={ped.total}
                                            value={cobrarForm.descuento}
                                            onChange={e => setCobrarForm(p => ({ ...p, descuento: e.target.value }))}
                                            placeholder="0"
                                            className="flex-1 text-sm font-bold focus:outline-none text-gray-900 bg-transparent" />
                                    </div>
                                    {descuento > 0 && (
                                        <div className="flex justify-between px-1">
                                            <span className="text-xs text-red-600 font-semibold">Total con descuento</span>
                                            <span className="text-xs text-red-600 font-black">{formatMoney(totalConDescuento)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Propina */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Propina (opcional)</label>
                                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-transparent">
                                        <span className="text-gray-400 text-sm font-semibold">+$</span>
                                        <input type="number" min="0"
                                            value={cobrarForm.propina}
                                            onChange={e => setCobrarForm(p => ({ ...p, propina: e.target.value }))}
                                            placeholder="0"
                                            className="flex-1 text-sm font-bold focus:outline-none text-gray-900 bg-transparent" />
                                    </div>
                                </div>

                                {/* Pagos */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Forma de pago</label>
                                    {cobrarForm.pagos.map((pago, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="flex gap-1 flex-1">
                                                {METODOS.map(met => {
                                                    const Icon = METODO_ICON[met];
                                                    return (
                                                        <button key={met}
                                                            onClick={() => setCobrarForm(p => ({ ...p, pagos: p.pagos.map((pg, i) => i === idx ? { ...pg, metodo: met } : pg) }))}
                                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 border transition ${pago.metodo === met ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"}`}>
                                                            <Icon size={10} />{METODO_LABEL[met]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <input type="number" min="0"
                                                value={pago.monto}
                                                onChange={e => setCobrarForm(p => ({ ...p, pagos: p.pagos.map((pg, i) => i === idx ? { ...pg, monto: e.target.value } : pg) }))}
                                                className="w-24 px-2 py-1.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 text-right bg-transparent"
                                                placeholder="$0" />
                                            {cobrarForm.pagos.length > 1 && (
                                                <button onClick={() => setCobrarForm(p => ({ ...p, pagos: p.pagos.filter((_, i) => i !== idx) }))}
                                                    className="p-1 text-red-400 hover:text-red-600 shrink-0">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {cobrarForm.pagos.length < 3 && (
                                        <button
                                            onClick={() => {
                                                const usados = cobrarForm.pagos.map(p => p.metodo);
                                                const next = METODOS.find(m => !usados.includes(m)) || "efectivo";
                                                const restante = Math.max(0, totalConDescuento - totalPagado);
                                                setCobrarForm(p => ({ ...p, pagos: [...p.pagos, { metodo: next, monto: restante > 0 ? String(restante) : "" }] }));
                                            }}
                                            className="w-full py-1.5 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-600 hover:border-gray-400 transition">
                                            + Agregar método de pago
                                        </button>
                                    )}
                                </div>

                                {/* Resumen */}
                                {pendiente > 1 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-amber-700">Falta</span>
                                        <span className="text-sm font-black text-amber-700">{formatMoney(pendiente)}</span>
                                    </div>
                                )}
                                {vuelto > 0 && hayEfectivo && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-emerald-700">Vuelto</span>
                                        <span className="text-sm font-black text-emerald-700">{formatMoney(vuelto)}</span>
                                    </div>
                                )}
                                {vuelto > 0 && !hayEfectivo && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-orange-700">Excede en</span>
                                        <span className="text-sm font-black text-orange-700">{formatMoney(vuelto)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                                <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                                <button onClick={cobrar} disabled={cobrarSaving || !esValido}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                                    <Printer size={15} />{cobrarSaving ? "..." : "Cobrar e imprimir"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal cambiar/agregar producto */}
            {editItemModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1 truncate">
                                {editItemModal.modo === "reemplazar" ? `Cambiar "${editItemModal.nombreActual}"` : "Agregar producto"}
                            </h2>
                            <button onClick={() => setEditItemModal(null)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-3 shrink-0">
                            <input autoFocus value={editItemSearch} onChange={e => setEditItemSearch(e.target.value)}
                                placeholder="Buscar producto..." style={{ fontSize: "16px" }}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="overflow-y-auto flex-1 min-h-0 px-3 pb-3 space-y-1">
                            {menuItemsAll
                                .filter(m => m.nombre.toLowerCase().includes(editItemSearch.toLowerCase()))
                                .map(m => (
                                    <button key={m._id} onClick={() => editItemModal.modo === "reemplazar" ? reemplazarItemPedido(m._id, m.nombre) : agregarProductoAPedido(m)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 text-left transition">
                                        <span className="text-sm text-gray-800">{m.nombre}</span>
                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{formatMoney(m.precio)} · {m.categoria}</span>
                                    </button>
                                ))}
                            {menuItemsAll.filter(m => m.nombre.toLowerCase().includes(editItemSearch.toLowerCase())).length === 0 && (
                                <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal crear evento */}
            {crearEventoModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 p-3">
                    <div className="bg-white rounded-3xl w-full sm:max-w-3xl shadow-2xl max-h-[92vh] flex flex-col">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1">Nuevo evento</h2>
                            <button onClick={() => setCrearEventoModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Nombre del evento</label>
                                    <input autoFocus value={nuevoEventoNombre}
                                        onChange={e => setNuevoEventoNombre(e.target.value)}
                                        placeholder="Ej: Cumpleaños" style={{ fontSize: "16px" }}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Precio tarjeta (ARS)</label>
                                    <input type="number" inputMode="numeric" value={nuevoEventoPrecio}
                                        onChange={e => setNuevoEventoPrecio(e.target.value)}
                                        placeholder="0" style={{ fontSize: "16px" }}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-400" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Mesas del evento</label>
                                    {nuevoEventoMesas.length > 0 && (
                                        <span className="text-xs font-bold text-blue-600">{nuevoEventoMesas.length} seleccionada{nuevoEventoMesas.length !== 1 ? "s" : ""}</span>
                                    )}
                                </div>
                                {renderPlanoSelector(nuevoEventoMesas, (nombre) =>
                                    setNuevoEventoMesas(prev => prev.includes(nombre) ? prev.filter(x => x !== nombre) : [...prev, nombre]),
                                    null
                                )}
                                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Seleccionada</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Libre</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Ocupada</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />Reservada</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />Otro evento</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => setCrearEventoModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={crearEvento} disabled={!nuevoEventoNombre.trim() || crearEventoSaving}
                                className="flex-1 py-2.5 bg-black hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {crearEventoSaving ? "Creando..." : "Crear evento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal editar mesas del evento */}
            {editMesasModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 p-3">
                    <div className="bg-white rounded-3xl w-full sm:max-w-3xl shadow-2xl max-h-[92vh] flex flex-col">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex-1">
                                <h2 className="font-black text-gray-900">Mesas del evento</h2>
                                {editMesasList.length > 0 && <p className="text-xs text-blue-600 font-bold mt-0.5">{editMesasList.length} seleccionada{editMesasList.length !== 1 ? "s" : ""}</p>}
                            </div>
                            <button onClick={() => setEditMesasModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                            <p className="text-xs text-gray-400 mb-3">Tocá las mesas para seleccionarlas. Aparecerán en azul en el plano principal.</p>
                            {renderPlanoSelector(editMesasList, (nombre) =>
                                setEditMesasList(prev => prev.includes(nombre) ? prev.filter(x => x !== nombre) : [...prev, nombre]),
                                editMesasEventoId
                            )}
                            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Seleccionada</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Libre</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Ocupada</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />Reservada</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />Otro evento</span>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => setEditMesasModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={guardarMesasEvento} disabled={editMesasSaving}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {editMesasSaving ? "Guardando..." : "Guardar mesas"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal registrar tarjetas */}
            {tarjetasModal && (() => {
                const ev = eventosActivos.find(e => e._id === tarjetasEventoId);
                if (!ev) return null;
                const precio = (ev as any).precioTarjeta ?? 0;
                const cant = Number(tarjetasCantidad) || 0;
                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                                <div className="flex-1">
                                    <h2 className="font-black text-gray-900">Registrar tarjetas</h2>
                                    <p className="text-xs text-gray-400">{ev.nombre} · {formatMoney(precio)} c/u</p>
                                </div>
                                <button onClick={() => setTarjetasModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                            </div>
                            <div className="px-5 py-5 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Cantidad de tarjetas</label>
                                    <input autoFocus type="number" inputMode="numeric" min="1"
                                        value={tarjetasCantidad}
                                        onChange={e => setTarjetasCantidad(e.target.value)}
                                        style={{ fontSize: "16px" }}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900 text-center" />
                                </div>
                                {precio > 0 && cant > 0 && (
                                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                        <span className="text-sm text-gray-500">{cant} × {formatMoney(precio)}</span>
                                        <span className="font-black text-gray-900 text-lg">{formatMoney(cant * precio)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                                <button onClick={() => setTarjetasModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                                <button onClick={guardarTarjetas} disabled={!tarjetasCantidad || Number(tarjetasCantidad) < 1 || tarjetasSaving}
                                    className="flex-1 py-2.5 bg-black hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                    {tarjetasSaving ? "Registrando..." : "Registrar"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal registrar venta en evento */}
            {ventaModal && eventosActivos.find(e => e._id === ventaEventoId) && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex-1 min-w-0">
                                <h2 className="font-black text-gray-900">Registrar venta</h2>
                                <p className="text-xs text-gray-400 truncate">{eventosActivos.find(e => e._id === ventaEventoId)?.nombre}</p>
                            </div>
                            <button onClick={() => setVentaModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>

                        {/* Buscador + lista de productos */}
                        <div className="px-4 pt-3 pb-2 shrink-0">
                            <input autoFocus value={ventaSearch} onChange={e => setVentaSearch(e.target.value)}
                                placeholder="Buscar producto..." style={{ fontSize: "16px" }}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="overflow-y-auto px-3 space-y-1 pb-2" style={{ maxHeight: "35vh" }}>
                            {menuItemsAll
                                .filter(m => m.nombre.toLowerCase().includes(ventaSearch.toLowerCase()))
                                .map(m => (
                                    <button key={m._id}
                                        onClick={() => setVentaCart(prev => {
                                            const ex = prev.find(it => it.menuItemId === m._id);
                                            if (ex) return prev.map(it => it.menuItemId === m._id ? { ...it, cantidad: it.cantidad + 1 } : it);
                                            return [...prev, { menuItemId: m._id, nombre: m.nombre, precio: m.precio, categoria: m.categoria, cantidad: 1 }];
                                        })}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 border border-gray-100 text-left transition">
                                        <span className="text-sm text-gray-800">{m.nombre}</span>
                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{formatMoney(m.precio)}</span>
                                    </button>
                                ))}
                            {menuItemsAll.filter(m => m.nombre.toLowerCase().includes(ventaSearch.toLowerCase())).length === 0 && (
                                <p className="text-center text-gray-400 py-6 text-sm">Sin resultados</p>
                            )}
                        </div>

                        {/* Carrito */}
                        {ventaCart.length > 0 && (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 shrink-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Carrito</p>
                                <div className="space-y-2">
                                    {ventaCart.map(it => (
                                        <div key={it.menuItemId} className="flex items-center gap-2">
                                            <button onClick={() => setVentaCart(prev => prev.map(x => x.menuItemId === it.menuItemId ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))}
                                                className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0">−</button>
                                            <span className="text-sm font-bold w-5 text-center shrink-0">{it.cantidad}</span>
                                            <button onClick={() => setVentaCart(prev => prev.map(x => x.menuItemId === it.menuItemId ? { ...x, cantidad: x.cantidad + 1 } : x))}
                                                className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0">+</button>
                                            <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{it.nombre}</span>
                                            <span className="text-xs text-gray-400 shrink-0">{formatMoney(it.precio * it.cantidad)}</span>
                                            <button onClick={() => setVentaCart(prev => prev.filter(x => x.menuItemId !== it.menuItemId))}
                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 shrink-0 transition">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comensales registrados (suman puntos al guardar) */}
                        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                                Comensales <span className="font-normal normal-case text-gray-300">(suman puntos)</span>
                            </p>
                            <div className="flex gap-2 relative">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario..."
                                        value={ventaComensalesSearch}
                                        onChange={e => setVentaComensalesSearch(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                    {ventaComensalesResults.filter(c => !ventaComensales.some(s => s._id === c._id)).length > 0 && ventaComensalesSearch.length >= 2 && (
                                        <div className="absolute top-full left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                            {ventaComensalesResults.filter(c => !ventaComensales.some(s => s._id === c._id)).map(c => (
                                                <button key={c._id} onMouseDown={e => e.preventDefault()} onClick={() => {
                                                    setVentaComensales(prev => [...prev, c]);
                                                    setVentaComensalesSearch("");
                                                    setVentaComensalesResults([]);
                                                }} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-xs transition border-b border-gray-50 last:border-0">
                                                    <span className="font-semibold text-gray-900">{c.nombre} {c.apellido}</span>
                                                    <span className="text-gray-400 ml-1">@{c.username}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setVentaQrOpen(true)} title="Escanear QR"
                                    className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0 hover:bg-gray-700 transition">
                                    <Plus size={16} />
                                </button>
                            </div>
                            {ventaComensales.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {ventaComensales.map(c => (
                                        <div key={c._id} className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                                            <CheckCircle size={10} className="text-emerald-600 shrink-0" />
                                            <span>{c.nombre}</span>
                                            <button onClick={() => setVentaComensales(prev => prev.filter(s => s._id !== c._id))}
                                                className="ml-0.5 text-emerald-500 hover:text-red-500 font-bold leading-none">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Método de pago + confirmar */}
                        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-3">
                            <div className="flex gap-2">
                                {METODOS.map(met => {
                                    const Icon = METODO_ICON[met];
                                    return (
                                        <button key={met} onClick={() => setVentaMetodo(met)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${ventaMetodo === met ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>
                                            <Icon size={12} /> {METODO_LABEL[met]}
                                        </button>
                                    );
                                })}
                            </div>
                            {ventaCart.length > 0 && (
                                <div className="flex justify-between items-center font-black text-gray-900 px-1">
                                    <span>TOTAL</span>
                                    <span className="text-lg">{formatMoney(ventaCart.reduce((acc, it) => acc + it.precio * it.cantidad, 0))}</span>
                                </div>
                            )}
                            <button onClick={registrarVenta} disabled={ventaCart.length === 0 || ventaSaving}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                                <Printer size={16} /> {ventaSaving ? "Registrando..." : "Confirmar y cobrar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scan modal para evento */}
            {ventaQrOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col">
                    <div className="flex items-center gap-3 px-4 py-3 text-white shrink-0">
                        <button onClick={() => setVentaQrOpen(false)} className="p-1 -ml-1"><X size={24} /></button>
                        <h2 className="font-bold text-base flex-1">Escanear QR del cliente</h2>
                        {ventaQrLooking && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    </div>
                    <div className="relative flex-1 overflow-hidden">
                        <video ref={ventaVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-52 h-52 border-4 border-white/60 rounded-2xl relative">
                                <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-lg -translate-x-1 -translate-y-1" />
                                <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-lg translate-x-1 -translate-y-1" />
                                <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-lg -translate-x-1 translate-y-1" />
                                <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-lg translate-x-1 translate-y-1" />
                            </div>
                        </div>
                    </div>
                    <div className="px-5 pb-8 pt-4 space-y-3 shrink-0 bg-black/90">
                        {ventaQrError && <p className="text-red-400 text-sm text-center font-semibold">{ventaQrError}</p>}
                        <p className="text-white/60 text-xs text-center">O ingresá el token manualmente</p>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Token del QR..."
                                value={ventaQrToken} onChange={e => setVentaQrToken(e.target.value)}
                                className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:bg-white/20" />
                            <button onClick={() => { if (ventaQrToken.trim()) lookupVentaQrToken(ventaQrToken.trim()); }}
                                disabled={!ventaQrToken.trim() || ventaQrLooking}
                                className="bg-red-600 text-white px-5 py-3 rounded-2xl font-bold text-sm disabled:opacity-50 transition">
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal detalle de mesa */}
            {mesaDetalle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-black text-gray-900 flex-1">Mesa {mesaDetalle.mesa.nombre}</h2>
                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${COLOR_CLASSES[ESTADOS[getEstadoIdx(mesaDetalle.pedido.estado)]?.color] || "border-gray-200 bg-gray-100 text-gray-600"}`}>
                                {mesaDetalle.pedido.estado}
                            </span>
                            <button onClick={() => setMesaDetalle(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                <span className="font-bold text-gray-900">
                                    {mesaDetalle.pedido.nombreComanda || mesaDetalle.pedido.userId?.nombre || "Sin nombre"}
                                </span>
                                {mesaDetalle.pedido.comensales ? (
                                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                                        <Users size={11} />{mesaDetalle.pedido.comensales}p
                                    </span>
                                ) : null}
                            </div>
                            {mesaDetalle.pedido.fuente === "empleado" && mesaDetalle.pedido.userId?.nombre && (
                                <p className="text-xs text-gray-400">Mozo: {mesaDetalle.pedido.userId.nombre}</p>
                            )}
                            <p className="text-xs text-gray-400">{format(new Date(mesaDetalle.pedido.createdAt), "dd/MM HH:mm", { locale: es })}</p>

                            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                {mesaDetalle.pedido.items.map((it, idx) => (
                                    <li key={it._id || idx} className="flex justify-between items-center px-3 py-2 bg-gray-50">
                                        <span className="text-sm text-gray-800">{it.menuItemId?.nombre}</span>
                                        <span className="text-red-600 font-semibold text-sm">×{it.cantidad}</span>
                                    </li>
                                ))}
                            </ul>

                            {(mesaDetalle.pedido.notaEmpleado || mesaDetalle.pedido.notaCliente) && (
                                <div className="border-l-2 border-amber-400 pl-3 py-1">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Nota</p>
                                    <p className="text-xs text-gray-600 italic">{mesaDetalle.pedido.notaEmpleado || mesaDetalle.pedido.notaCliente}</p>
                                </div>
                            )}

                            <p className="text-sm font-bold text-gray-900 pt-1">Total: {formatMoney(mesaDetalle.pedido.total)}</p>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            {(mesaDetalle.pedido.estado === "listo" || mesaDetalle.pedido.estado === "entregado") ? (
                                <button onClick={() => {
                                    const p = mesaDetalle.pedido;
                                    setCobrarModal({ open: true, pedido: p });
                                    setCobrarForm({ descuento: "", propina: "", pagos: [{ metodo: "efectivo", monto: String(p.total) }] });
                                    setMesaDetalle(null);
                                }} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
                                    Cobrar
                                </button>
                            ) : (
                                <button onClick={() => { setTab("pedidos"); setMesaDetalle(null); }}
                                    className="flex-1 py-2.5 bg-black hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition">
                                    Ver en Pedidos
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal resumen de cierre de evento */}
            {cierreEventoData && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex-1">
                                <h2 className="font-black text-gray-900">Resumen de cierre</h2>
                                <p className="text-xs text-gray-400">{cierreEventoData.eventoNombre}</p>
                            </div>
                            <button onClick={() => setCierreEventoData(null)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            {/* Tarjetas de entrada */}
                            {cierreEventoData.entradasCantidad > 0 && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2">Tarjetas de entrada</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">{cierreEventoData.entradasCantidad} tarjetas × {formatMoney(cierreEventoData.entradasPrecio)}</span>
                                        <span className="font-black text-gray-900 text-base">{formatMoney(cierreEventoData.entradasTotal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Ventas directas */}
                            {(cierreEventoData.ventasEfectivo + cierreEventoData.ventasTransferencia + cierreEventoData.ventasTarjeta) > 0 && (
                                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Ventas directas</p>
                                    {[
                                        { label: "Efectivo",      Icon: Banknote,    val: cierreEventoData.ventasEfectivo },
                                        { label: "Transferencia", Icon: Send,        val: cierreEventoData.ventasTransferencia },
                                        { label: "Tarjeta",       Icon: CreditCard,  val: cierreEventoData.ventasTarjeta },
                                    ].filter(r => r.val > 0).map(r => (
                                        <div key={r.label} className="flex items-center justify-between py-1">
                                            <span className="text-sm text-gray-600 flex items-center gap-1.5"><r.Icon size={12} />{r.label}</span>
                                            <span className="font-bold text-gray-900">{formatMoney(r.val)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Comandas del evento */}
                            {(cierreEventoData.comandasEfectivo + cierreEventoData.comandasTransferencia + cierreEventoData.comandasTarjeta + cierreEventoData.comandasSinCobrar) > 0 && (
                                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Comandas</p>
                                    {[
                                        { label: "Efectivo",      Icon: Banknote,    val: cierreEventoData.comandasEfectivo },
                                        { label: "Transferencia", Icon: Send,        val: cierreEventoData.comandasTransferencia },
                                        { label: "Tarjeta",       Icon: CreditCard,  val: cierreEventoData.comandasTarjeta },
                                    ].filter(r => r.val > 0).map(r => (
                                        <div key={r.label} className="flex items-center justify-between py-1">
                                            <span className="text-sm text-gray-600 flex items-center gap-1.5"><r.Icon size={12} />{r.label}</span>
                                            <span className="font-bold text-gray-900">{formatMoney(r.val)}</span>
                                        </div>
                                    ))}
                                    {cierreEventoData.comandasSinCobrar > 0 && (
                                        <div className="flex items-center justify-between py-1 border-t border-gray-200 mt-1 pt-2">
                                            <span className="text-sm text-amber-600 flex items-center gap-1.5"><AlertCircle size={12} />Sin cobrar al cierre</span>
                                            <span className="font-bold text-amber-600">{formatMoney(cierreEventoData.comandasSinCobrar)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total por método */}
                            <div className="bg-black rounded-2xl px-4 py-4 text-white">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Total por método de pago</p>
                                {[
                                    { label: "Efectivo",      Icon: Banknote,    val: cierreEventoData.totalEfectivo },
                                    { label: "Transferencia", Icon: Send,        val: cierreEventoData.totalTransferencia },
                                    { label: "Tarjeta",       Icon: CreditCard,  val: cierreEventoData.totalTarjeta },
                                ].filter(r => r.val > 0).map(r => (
                                    <div key={r.label} className="flex items-center justify-between py-1.5">
                                        <span className="text-sm text-gray-300 flex items-center gap-1.5"><r.Icon size={12} />{r.label}</span>
                                        <span className="font-bold text-white">{formatMoney(r.val)}</span>
                                    </div>
                                ))}
                                {cierreEventoData.entradasTotal > 0 && (
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-sm text-gray-300 flex items-center gap-1.5"><Star size={12} />Tarjetas entrada</span>
                                        <span className="font-bold text-white">{formatMoney(cierreEventoData.entradasTotal)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-700">
                                    <span className="font-black text-white">TOTAL GENERAL</span>
                                    <span className="font-black text-white text-xl">{formatMoney(cierreEventoData.totalGeneral)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => setCierreEventoData(null)} disabled={cierreEventoSaving}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                                Cancelar
                            </button>
                            <button onClick={confirmarCierreEvento} disabled={cierreEventoSaving}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {cierreEventoSaving ? "Cerrando..." : "Confirmar cierre"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal detalle de reserva */}
            {reservaDetalle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <div className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
                            <h2 className="font-black text-gray-900 flex-1">Mesa reservada</h2>
                            <button onClick={() => setReservaDetalle(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Mesa</span>
                                <span className="font-bold text-gray-900">{reservaDetalle.mesaId?.nombre}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Hora</span>
                                <span className="font-bold text-gray-900">{reservaDetalle.hora}hs</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Comensales</span>
                                <span className="font-bold text-gray-900">{reservaDetalle.comensales}</span>
                            </div>
                            {reservaDetalle.userId && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Cliente</span>
                                    <span className="font-bold text-gray-900">{reservaDetalle.userId.nombre} {reservaDetalle.userId.apellido}</span>
                                </div>
                            )}
                            {reservaDetalle.notas && (
                                <div className="border-l-2 border-amber-400 pl-3 py-1">
                                    <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase">Nota</p>
                                    <p className="text-sm text-gray-600 italic">{reservaDetalle.notas}</p>
                                </div>
                            )}
                            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${reservaDetalle.estado === "confirmada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {reservaDetalle.estado === "confirmada" ? "Confirmada" : "Pendiente"}
                            </span>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100">
                            <button onClick={() => setReservaDetalle(null)}
                                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
