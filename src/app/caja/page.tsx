"use client";
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
    Phone, MessageCircle, Plus, Pencil, Trash2, MapPin, Users, Star,
} from "lucide-react";
import ReservasManager from "@/components/ReservasManager";

type Pedido = {
    _id: string;
    mesa?: string;
    nombreComanda?: string;
    comensales?: number;
    fuente: string;
    numeroDia?: number;
    items: { _id?: string; menuItemId: { _id?: string; nombre: string; precio: number; categoria?: string }; cantidad: number; impreso?: boolean }[];
    total: number;
    costoEnvio?: number;
    estado: string;
    tipoEntrega?: string;
    direccion?: string;
    createdAt: string;
    notaEmpleado?: string;
    notaCliente?: string;
    userId?: { _id: string; nombre: string; apellido: string; telefono?: string; role?: string };
    comensalesIds?: { _id: string; nombre: string; apellido: string; username?: string }[];
};
type MenuItemLite = { _id: string; nombre: string; precio: number; categoria: string };
type CajaSession = { _id: string; estado: "abierta" | "cerrada"; montoInicial: number; fechaApertura: string };
type MesaPlano = { _id: string; nombre: string; activa: boolean; x: number; y: number; forma: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string };
type SalonElPlano = { _id: string; tipo: string; label: string; x: number; y: number; ancho: number; alto: number; color: string };
type VentaEvento = { _id: string; items: { nombre: string; precio: number; categoria: string; cantidad: number }[]; total: number; metodoPago: string; createdAt: string };
type Evento = { _id: string; nombre: string; estado: "activo" | "cerrado"; ventas: VentaEvento[]; createdAt: string };
type CartItem = { menuItemId: string; nombre: string; precio: number; categoria: string; cantidad: number };
type Comensal = { _id: string; nombre: string; apellido: string; username: string };

// Categorías que se imprimen en la comandera de la barra; el resto va a cocina
const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;
const METODO_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };
const METODO_ICON: Record<string, React.ElementType> = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Send };
const formatMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

const ESTADOS = [
    { key: "pendiente",  label: "Pendiente",   icon: Clock,         color: "yellow"  },
    { key: "preparando", label: "Preparando",  icon: Flame,         color: "orange"  },
    { key: "listo",      label: "Listo",       icon: CheckCircle,   color: "blue"    },
    { key: "entregado",  label: "Finalizado",  icon: Truck,         color: "emerald" },
    { key: "cerrado",    label: "Cobrado",     icon: CheckCircle,   color: "emerald" },
];
const COLOR_CLASSES: Record<string, string> = {
    yellow:  "border-yellow-500 bg-yellow-400/30 text-yellow-900 font-semibold",
    orange:  "border-orange-500 bg-orange-100 text-orange-700 font-semibold",
    blue:    "border-blue-500 bg-blue-100 text-blue-700 font-semibold",
    emerald: "border-emerald-500 bg-emerald-100 text-emerald-700 font-semibold",
};
const BAR_COLORS: Record<string, string> = {
    yellow: "bg-yellow-500", orange: "bg-orange-500", blue: "bg-blue-500", emerald: "bg-emerald-500",
};

type Vista = "pendientes" | "preparando" | "listos" | "finalizados";
const VISTA_MAP: Record<string, Vista> = {
    pendiente: "pendientes", preparando: "preparando", listo: "listos", entregado: "finalizados",
};

export default function CajaPage() {
    const router = useRouter();
    const [tab, setTab]                   = useState<"pedidos" | "caja" | "reservas" | "mesas" | "eventos">("pedidos");
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
    const [cobrarForm, setCobrarForm]     = useState({ metodoPago: "efectivo" as typeof METODOS[number], montoPagado: "" });
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

    // Eventos
    const [eventoActivo, setEventoActivo]         = useState<Evento | null | undefined>(undefined);
    const [crearEventoModal, setCrearEventoModal] = useState(false);
    const [nuevoEventoNombre, setNuevoEventoNombre] = useState("");
    const [crearEventoSaving, setCrearEventoSaving] = useState(false);
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
            setEventoActivo(Array.isArray(data) && data.length > 0 ? data[0] : null);
        } catch { setEventoActivo(null); }
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
                // Incluir "cerrado" (cobrado por caja) solo del día de hoy para Finalizados
                const filtrados = pedData.filter((p: Pedido) =>
                    p.estado !== "cancelado" &&
                    (p.estado !== "cerrado" || (p as any).createdAt?.slice(0, 10) === hoyStr)
                );
                setPedidos(filtrados);
                detectarAgregados(filtrados);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        loadData();
        loadEvento();
        const iv = setInterval(loadData, 5000);
        return () => clearInterval(iv);
    }, [loadData, loadEvento]);

    useEffect(() => {
        fetch("/api/config/pedidos").then(r => r.json()).then(d => setPedidosActivos(d.activo ?? true));
        fetch("/api/config/reservas").then(r => r.json()).then(d => setReservasActivas(d.activo ?? true));
    }, []);

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
    }, [tab, loadEvento]);

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
            body: JSON.stringify({ accion: "eliminarItem", itemId }),
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
            body: JSON.stringify({ accion: "reemplazarItem", itemId: editItemModal.itemId, nuevoMenuItemId }),
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
        const pedidoCobrado = cobrarModal.pedido;
        const metodoPago    = cobrarForm.metodoPago;
        const montoPagado   = Number(cobrarForm.montoPagado) || pedidoCobrado.total;
        try {
            const res = await fetch("/api/superadmin/caja/cobrar", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ pedidoId: pedidoCobrado._id, metodoPago, montoPagado }),
            });
            if (res.ok) {
                // Cerrar modal inmediatamente
                setCobrarModal({ open: false, pedido: null });
                setCobrarForm({ metodoPago: "efectivo", montoPagado: "" });
                // Quitar el pedido de la lista local de forma optimista (no esperar al poll)
                setPedidos(prev => prev.map(p =>
                    p._id === pedidoCobrado._id ? { ...p, estado: "cerrado" } : p
                ));
                // Imprimir ticket
                printTicket(pedidoCobrado, metodoPago, montoPagado);
                // Confirmar con datos frescos del servidor
                await loadData();
            }
        } finally { setCobrarSaving(false); }
    }

    async function printTicket(pedido: Pedido, metodo: string, montoPagado: number) {
        const hora   = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const fecha  = new Date().toLocaleDateString("es-AR");
        const vuelto = metodo === "efectivo" && montoPagado > pedido.total ? montoPagado - pedido.total : 0;

        // Intentar servidor local de impresión
        try {
            const res = await fetch("http://localhost:3001/imprimir/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mesa:        pedido.mesa || "—",
                    fecha,
                    hora,
                    items:       pedido.items.map(i => ({
                        cantidad: i.cantidad,
                        nombre:   i.menuItemId?.nombre || "Ítem",
                        precio:   i.menuItemId?.precio || 0,
                    })),
                    total:       pedido.total,
                    costoEnvio:  pedido.tipoEntrega === "envio" ? (pedido.costoEnvio ?? 0) : 0,
                    metodoPago:  metodo,
                    montoPagado,
                    vuelto,
                }),
            });
            if (res.ok) return; // impresión exitosa
        } catch { /* servidor no disponible → fallback */ }

        // Fallback: ventana del navegador
        const rows = pedido.items.map(i => `<tr><td>${i.cantidad}x ${i.menuItemId?.nombre || "ítem"}</td><td style="text-align:right">${formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</td></tr>`).join("")
            + (pedido.tipoEntrega === "envio" && (pedido.costoEnvio ?? 0) > 0 ? `<tr><td>Envío a domicilio</td><td style="text-align:right">${formatMoney(pedido.costoEnvio ?? 0)}</td></tr>` : "");
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:12px;max-width:280px}
            h2{text-align:center;font-size:15px;letter-spacing:2px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:4px}
            hr{border:none;border-top:1px dashed #000;margin:5px 0}
            table{width:100%;border-collapse:collapse}td{padding:2px 0;font-size:12px}
            .total{font-size:14px;font-weight:bold}.vuelto{font-weight:bold;color:#16a34a}
            .legal{text-align:center;font-size:9px;color:#aaa;margin-top:10px}
        </style></head><body>
        <h2>TICKET</h2>
        <div class="sub">${fecha} ${hora}</div>
        <hr/><table>${rows}</table><hr/>
        <table>
            <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(pedido.total)}</td></tr>
            <tr><td>${METODO_LABEL[metodo]}</td><td style="text-align:right">${formatMoney(montoPagado)}</td></tr>
            ${vuelto > 0 ? `<tr><td class="vuelto">Vuelto</td><td class="vuelto" style="text-align:right">${formatMoney(vuelto)}</td></tr>` : ""}
        </table>
        <div class="legal">Comprobante no válido como factura</div>
        </body></html>`;
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
                        items: comida.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem" })),
                    }),
                })
            );
            if (bebidas.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Barra",
                        mesa, cliente, mozo, direccion, hora, nota,
                        items: bebidas.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem" })),
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
                        items: comida.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem" })),
                    }),
                })
            );
            if (bebidas.length > 0) promesas.push(
                fetch("http://localhost:3001/imprimir/comanda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        impresora: "Barra", titulo: "BARRA",
                        mesa, cliente, mozo, direccion, hora, nota,
                        items: bebidas.map(it => ({ cantidad: it.cantidad, nombre: it.menuItemId?.nombre || "Ítem" })),
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
                body: JSON.stringify({ nombre: nuevoEventoNombre.trim() }),
            });
            if (res.ok) {
                const data = await res.json();
                setEventoActivo(data);
                setCrearEventoModal(false);
                setNuevoEventoNombre("");
            }
        } finally { setCrearEventoSaving(false); }
    }

    async function cerrarEvento() {
        if (!eventoActivo) return;
        const r = await swalBase.fire({
            title: "¿Cerrar evento?",
            text: `Se cerrará "${eventoActivo.nombre}". No se podrán agregar más ventas.`,
            icon: "warning", showCancelButton: true,
            confirmButtonText: "Sí, cerrar", cancelButtonText: "Cancelar",
        });
        if (!r.isConfirmed) return;
        const res = await fetch(`/api/eventos/${eventoActivo._id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ accion: "cerrar" }),
        });
        if (res.ok) setEventoActivo(null);
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

    async function abrirVentaModal() {
        if (menuItemsAll.length === 0) {
            const r = await fetch("/api/menu?activo=true", { credentials: "include" });
            const d = await r.json().catch(() => []);
            setMenuItemsAll(Array.isArray(d) ? d : []);
        }
        setVentaCart([]);
        setVentaMetodo("efectivo");
        setVentaSearch("");
        setVentaComensales([]);
        setVentaComensalesSearch("");
        setVentaComensalesResults([]);
        setVentaModal(true);
    }

    async function registrarVenta() {
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
                setEventoActivo(data.evento);
                await printVentaEvento(eventoActivo, ventaCart, ventaMetodo);
                setVentaModal(false);
                setVentaCart([]);
                setVentaMetodo("efectivo");
                setVentaSearch("");
            }
        } finally { setVentaSaving(false); }
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
                    ? "bg-gray-900 text-white shadow-md"
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
                                tab === "pedidos" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Package size={15} /> Pedidos
                            {(pendientes.length + preparando.length + listos.length) > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "pedidos" ? "bg-gray-900 text-white" : "bg-red-100 text-red-600"}`}>
                                    {pendientes.length + preparando.length + listos.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("caja")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "caja" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Wallet size={15} /> Cobrar
                            {paraCobrar.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "caja" ? "bg-gray-900 text-white" : "bg-amber-100 text-amber-700"}`}>
                                    {paraCobrar.length}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("mesas")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "mesas" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <MapPin size={15} /> Mesas
                        </button>
                        <button onClick={() => setTab("reservas")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "reservas" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <CalendarDays size={15} /> Reservas
                            {reservasPendientes > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "reservas" ? "bg-gray-900 text-white" : "bg-red-100 text-red-600"}`}>
                                    {reservasPendientes}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setTab("eventos")}
                            className={`flex-1 py-3.5 text-sm font-black transition flex items-center justify-center gap-2 ${
                                tab === "eventos" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
                            }`}>
                            <Star size={15} /> Eventos
                            {eventoActivo && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === "eventos" ? "bg-gray-900 text-white" : "bg-amber-100 text-amber-700"}`}>
                                    1
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── TAB PEDIDOS ── */}
                    {tab === "pedidos" && (
                        <div className="max-w-screen-2xl mx-auto px-4 pt-4">
                            {/* Nueva comanda (cajero actuando como mozo) */}
                            <button onClick={() => router.push("/empleado/anotador/menu")}
                                className="w-full mb-4 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-bold py-3 rounded-2xl transition shadow-sm active:scale-[0.98]">
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
                                        const esMozo   = p.fuente === "empleado" || p.userId?.role === "empleado";
                                        const estadoIdx = getEstadoIdx(p.estado);
                                        const color     = ESTADOS[estadoIdx]?.color || "gray";
                                        const fechaHora = p.createdAt ? format(new Date(p.createdAt), "dd/MM HH:mm", { locale: es }) : "";
                                        const isUpdating = updatingId === p._id;

                                        // "cerrado" nunca es clickeable en el progress bar (solo via Cobrar)
                                        // Mozo: pendiente→preparando→listo (cobrar = pestaña Cobrar)
                                        // Cliente: pendiente→preparando→listo→entregado (finalizado)
                                        const estadosMozo   = ESTADOS.filter(e => e.key !== "entregado" && e.key !== "cerrado");
                                        const estadosCliente = ESTADOS.filter(e => e.key !== "cerrado");
                                        const estadosList = esMozo ? estadosMozo : estadosCliente;

                                        return (
                                            <motion.div key={p._id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                className={`rounded-2xl border shadow-sm overflow-hidden aspect-[4/5] flex flex-col ${esMozo ? "border-gray-800" : "border-gray-200"}`}>

                                                {/* Banner mozo */}
                                                {esMozo && (
                                                    <div className="shrink-0 text-white px-4 py-2.5 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #1c1c1c 0%, #2a2a2a 100%)" }}>
                                                        <UtensilsCrossed size={14} className="text-gray-400" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-black text-sm tracking-tight">
                                                                Barra — Mozo{p.mesa ? ` · Mesa ${p.mesa}` : ""}
                                                            </span>
                                                            {(p as any).nombreComanda && (
                                                                <p className="text-xs text-gray-400 font-semibold truncate mt-0.5">{(p as any).nombreComanda}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Banner app */}
                                                {!esMozo && (
                                                    <div className="shrink-0 bg-gray-100 text-gray-600 px-4 py-2 flex items-center gap-2">
                                                        <Package size={12} />
                                                        <span className="text-xs font-bold">
                                                            {p.numeroDia ? `Pedido #${p.numeroDia}` : "Pedido App"}
                                                        </span>
                                                        {p.tipoEntrega && <span className="text-xs text-gray-400 ml-1 capitalize">· {p.tipoEntrega}</span>}
                                                    </div>
                                                )}

                                                <div className={`p-3 flex flex-col flex-1 min-h-0 ${esMozo ? "bg-gray-50" : "bg-white"}`}>
                                                    {/* Header */}
                                                    <div className="shrink-0 flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide inline-block mb-1 ${COLOR_CLASSES[color] || "border-gray-200 bg-gray-100 text-gray-600"}`}>
                                                                {p.estado}
                                                            </span>
                                                            <h2 className="text-base font-black text-gray-900 leading-tight">
                                                                {p.userId?.nombre} {p.userId?.apellido}
                                                            </h2>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                                                {!esMozo && p.userId?.telefono && (
                                                                    <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 hover:text-emerald-600 transition">
                                                                        <Phone size={10} />{p.userId.telefono}
                                                                    </a>
                                                                )}
                                                                <span>{fechaHora}</span>
                                                            </div>
                                                            {p.tipoEntrega === "envio" && p.direccion && (
                                                                <div className="flex items-start gap-1 mt-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                                                                    <MapPin size={11} className="shrink-0 mt-0.5" />
                                                                    <span>{p.direccion}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!esMozo && p.userId?.telefono && (
                                                            <a href={`https://wa.me/${p.userId.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0">
                                                                <MessageCircle size={13} /> WhatsApp
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Items */}
                                                    <ul className="mb-2 flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                                                        {p.items.map((it, idx) => (
                                                            <li key={it._id || idx} className="flex justify-between items-center px-3 py-2 bg-gray-50 gap-2">
                                                                <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{it.menuItemId?.nombre}</span>
                                                                <span className="text-red-600 font-semibold text-sm shrink-0">×{it.cantidad}</span>
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
                                                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Nota</p>
                                                            <p className="text-xs text-gray-600 italic">{p.notaEmpleado || p.notaCliente}</p>
                                                        </div>
                                                    )}

                                                    {/* Total */}
                                                    {p.tipoEntrega === "envio" && (p.costoEnvio ?? 0) > 0 ? (
                                                        <div className="shrink-0 text-sm text-gray-700 mb-2 space-y-0.5">
                                                            <div className="flex justify-between">
                                                                <span>Subtotal</span>
                                                                <span>{formatMoney(p.total - (p.costoEnvio ?? 0))}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Envío</span>
                                                                <span>{formatMoney(p.costoEnvio ?? 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-bold text-gray-900">
                                                                <span>Total</span>
                                                                <span>{formatMoney(p.total)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="shrink-0 text-sm font-bold text-gray-900 mb-2">Total: {formatMoney(p.total)}</p>
                                                    )}

                                                    {/* Botones estado pendiente */}
                                                    {p.estado === "pendiente" ? (
                                                        <div className="shrink-0 flex gap-2">
                                                            <button disabled={isUpdating}
                                                                onClick={async () => {
                                                                    // Imprime y marca los ítems como impresos ANTES de pasar a
                                                                    // "preparando", así el chequeo de agregados no los detecta
                                                                    // como pendientes y los imprime por segunda vez.
                                                                    await printComanda(p);
                                                                    await avanzarEstado(p, "preparando");
                                                                }}
                                                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1">
                                                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                                                                Aceptar
                                                            </button>
                                                            <button onClick={() => rechazarPedido(p._id)}
                                                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition">
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    ) : estadoIdx < estadosList.length - 1 ? (
                                                        /* Barra de progreso con estados (se oculta cuando ya no hay un próximo paso clickeable) */
                                                        <div className="shrink-0 relative w-full flex justify-between items-center mt-1">
                                                            <div className="absolute top-[16px] left-0 w-full h-[3px] bg-gray-200 rounded-full" />
                                                            <motion.div
                                                                className={`absolute top-[16px] left-0 h-[3px] ${BAR_COLORS[color] || "bg-gray-400"} rounded-full`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(estadoIdx / (estadosList.length - 1)) * 100}%` }}
                                                                transition={{ duration: 0.4 }}
                                                            />
                                                            {estadosList.map((est, idx) => {
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

                                                    {/* Reimprimir / Cobrar (pedido ya aceptado) */}
                                                    {p.estado !== "pendiente" && (
                                                        <div className="shrink-0 mt-2 flex gap-2">
                                                            <button onClick={() => printComanda(p)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                                <Printer size={12} /> Reimprimir
                                                            </button>
                                                            {(p.estado === "listo" || p.estado === "entregado") && (
                                                                <button onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ metodoPago: "efectivo", montoPagado: "" }); }}
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
                                const esMozo = p.fuente === "empleado" || p.userId?.role === "empleado";
                                const label = esMozo
                                    ? (p.mesa ? `Mesa ${p.mesa}` : p.nombreComanda || "Sin mesa")
                                    : (p.userId ? `${p.userId.nombre} ${p.userId.apellido || ""}`.trim() : "Cliente app");
                                return (
                                    <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden aspect-[4/5] flex flex-col">
                                        <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-gray-50">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <UtensilsCrossed size={14} className="text-gray-400" />
                                                    <p className="font-black text-gray-900">{label}</p>
                                                    {!esMozo && (
                                                        <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">
                                                            {p.numeroDia ? `#${p.numeroDia}` : "App"}
                                                        </span>
                                                    )}
                                                    {p.comensales ? <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">{p.comensales}p</span> : null}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.estado === "entregado" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {p.estado === "entregado" ? "Finalizado" : "Listo"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{format(new Date(p.createdAt), "HH:mm", { locale: es })}{p.tipoEntrega === "envio" ? " · Envío" : ""}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-xl font-black text-gray-900">{formatMoney(p.total)}</p>
                                                <button
                                                    onClick={() => { setCobrarModal({ open: true, pedido: p }); setCobrarForm({ metodoPago: "efectivo", montoPagado: String(p.total) }); }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
                                                    Cobrar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3 space-y-1 flex-1 min-h-0 overflow-y-auto">
                                            {p.items.map((item, idx) => (
                                                <div key={item._id || idx} className="flex justify-between items-center text-sm gap-2">
                                                    <span className="text-gray-700 flex-1 min-w-0 truncate">{item.cantidad}× {item.menuItemId?.nombre}</span>
                                                    <span className="text-gray-400 shrink-0">{formatMoney((item.menuItemId?.precio || 0) * item.cantidad)}</span>
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
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-700">Envío a domicilio</span>
                                                    <span className="text-gray-400">{formatMoney(p.costoEnvio ?? 0)}</span>
                                                </div>
                                            )}
                                            {p.notaEmpleado && <p className="text-xs text-amber-600 italic pt-1">📝 {p.notaEmpleado}</p>}
                                            <button onClick={() => abrirSelectorProducto(p, { modo: "agregar" })}
                                                className="mt-1 w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 hover:border-gray-400 bg-white text-gray-500 hover:text-gray-700 font-semibold py-1.5 rounded-xl text-xs transition">
                                                <Plus size={12} /> Agregar producto
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
                                        const isRound = m.forma === "round" || m.forma === "oval";
                                        const isBanq = m.tipo === "banqueta";
                                        const rot = m.rotacion ?? 0;
                                        const w = m.ancho || (m.forma === "oval" ? 11 : m.forma === "round" ? 5.5 : 7);
                                        const h = m.alto || (m.forma === "oval" ? 5 : m.forma === "round" ? 5.5 : 5);
                                        const bg = isBanq
                                            ? "bg-amber-700 border-amber-800 text-amber-100"
                                            : ocupada ? "bg-red-500 border-red-600 text-white" : "bg-emerald-500 border-emerald-600 text-white";
                                        return (
                                            <div key={m._id}
                                                onClick={() => { if (pedido) setMesaDetalle({ mesa: m, pedido }); }}
                                                style={{ position: "absolute", left: `${m.x ?? 10}%`, top: `${m.y ?? 10}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, width: `min(${w}%,${w * 7}px)`, height: `min(${h}%,${h * 7.5}px)`, minWidth: "22px", minHeight: "16px", borderRadius: isRound ? "50%" : "8px", cursor: pedido ? "pointer" : "default", userSelect: "none", zIndex: 2 }}
                                                className={`flex items-center justify-center border-2 ${bg} ${pedido ? "hover:brightness-110 active:scale-95 transition-all" : ""}`}>
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
                        <div className="max-w-2xl mx-auto px-4 pt-4">
                            {eventoActivo === undefined ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="animate-spin text-gray-300" size={28} />
                                </div>
                            ) : eventoActivo === null ? (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Star size={28} className="text-gray-300" />
                                    </div>
                                    <p className="font-bold text-gray-400 mb-2">Sin evento activo</p>
                                    <p className="text-sm text-gray-300 mb-6">Creá un evento para registrar ventas individuales durante la noche</p>
                                    <button onClick={() => { setCrearEventoModal(true); setNuevoEventoNombre(""); }}
                                        className="bg-gray-900 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-2xl transition active:scale-95">
                                        + Crear evento
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Cabecera del evento */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Evento activo</span>
                                                </div>
                                                <h2 className="font-black text-gray-900 text-xl">{eventoActivo.nombre}</h2>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {eventoActivo.ventas.length} venta{eventoActivo.ventas.length !== 1 ? "s" : ""} · Total: {formatMoney(eventoActivo.ventas.reduce((acc, v) => acc + v.total, 0))}
                                                </p>
                                            </div>
                                            <button onClick={cerrarEvento}
                                                className="text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-xl transition shrink-0">
                                                Cerrar evento
                                            </button>
                                        </div>
                                        {eventoActivo.ventas.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                                                {METODOS.map(met => {
                                                    const tot = eventoActivo.ventas.filter(v => v.metodoPago === met).reduce((acc, v) => acc + v.total, 0);
                                                    const Icon = METODO_ICON[met];
                                                    return tot > 0 ? (
                                                        <div key={met} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                                <Icon size={11} />
                                                                <span className="text-[10px] font-semibold uppercase">{METODO_LABEL[met]}</span>
                                                            </div>
                                                            <p className="font-black text-gray-900 text-sm">{formatMoney(tot)}</p>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón registrar venta */}
                                    <button onClick={abrirVentaModal}
                                        className="w-full mb-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition shadow-sm active:scale-[0.98] text-base">
                                        <Plus size={20} /> Registrar venta
                                    </button>

                                    {/* Lista de ventas */}
                                    {eventoActivo.ventas.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-8">Sin ventas registradas todavía</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {[...eventoActivo.ventas].reverse().map(v => {
                                                const Icon = METODO_ICON[v.metodoPago] || Banknote;
                                                return (
                                                    <div key={v._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                    <Icon size={10} /> {METODO_LABEL[v.metodoPago]}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {new Date(v.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                                </span>
                                                            </div>
                                                            <span className="font-black text-gray-900">{formatMoney(v.total)}</span>
                                                        </div>
                                                        <ul className="space-y-0.5">
                                                            {v.items.map((it, idx) => (
                                                                <li key={idx} className="text-sm text-gray-600">
                                                                    <span className="font-bold text-gray-400 mr-1">{it.cantidad}×</span>{it.nombre}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
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
                                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition">
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
            {cobrarModal.open && cobrarModal.pedido && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Cobrar Mesa {cobrarModal.pedido.mesa}</h2>
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                                {cobrarModal.pedido.items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-700">{i.cantidad}× {i.menuItemId?.nombre}</span>
                                        <span className="font-semibold text-gray-900">{formatMoney((i.menuItemId?.precio || 0) * i.cantidad)}</span>
                                    </div>
                                ))}
                                {cobrarModal.pedido.tipoEntrega === "envio" && (cobrarModal.pedido.costoEnvio ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-700">Envío a domicilio</span>
                                        <span className="font-semibold text-gray-900">{formatMoney(cobrarModal.pedido.costoEnvio ?? 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-200 pt-2 mt-1">
                                    <span>TOTAL</span><span>{formatMoney(cobrarModal.pedido.total)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {METODOS.map(met => {
                                    const Icon = METODO_ICON[met];
                                    return (
                                        <button key={met} onClick={() => setCobrarForm(p => ({ ...p, metodoPago: met }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${cobrarForm.metodoPago === met ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>
                                            <Icon size={12} />{METODO_LABEL[met]}
                                        </button>
                                    );
                                })}
                            </div>
                            <input type="number" min="0" value={cobrarForm.montoPagado}
                                onChange={e => setCobrarForm(p => ({ ...p, montoPagado: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                            {cobrarForm.metodoPago === "efectivo" && Number(cobrarForm.montoPagado) > cobrarModal.pedido.total && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex justify-between">
                                    <span className="text-sm font-semibold text-emerald-700">Vuelto</span>
                                    <span className="text-sm font-black text-emerald-700">{formatMoney(Number(cobrarForm.montoPagado) - cobrarModal.pedido.total)}</span>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setCobrarModal({ open: false, pedido: null })} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={cobrar} disabled={cobrarSaving}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                                <Printer size={15} />{cobrarSaving ? "..." : "Cobrar e imprimir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">Crear evento</h2>
                            <button onClick={() => setCrearEventoModal(false)} className="p-1 text-gray-400"><X size={18} /></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Nombre del evento</label>
                                <input autoFocus value={nuevoEventoNombre}
                                    onChange={e => setNuevoEventoNombre(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && crearEvento()}
                                    placeholder="Ej: Cumpleaños" style={{ fontSize: "16px" }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={() => setCrearEventoModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={crearEvento} disabled={!nuevoEventoNombre.trim() || crearEventoSaving}
                                className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">
                                {crearEventoSaving ? "Creando..." : "Crear evento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal registrar venta en evento */}
            {ventaModal && eventoActivo && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col" style={{ maxHeight: "92vh" }}>
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                            <div className="flex-1 min-w-0">
                                <h2 className="font-black text-gray-900">Registrar venta</h2>
                                <p className="text-xs text-gray-400 truncate">{eventoActivo.nombre}</p>
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
                                    className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 hover:bg-gray-700 transition">
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
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${ventaMetodo === met ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"}`}>
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
                                    setCobrarForm({ metodoPago: "efectivo", montoPagado: String(p.total) });
                                    setMesaDetalle(null);
                                }} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
                                    Cobrar
                                </button>
                            ) : (
                                <button onClick={() => { setTab("pedidos"); setMesaDetalle(null); }}
                                    className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition">
                                    Ver en Pedidos
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
