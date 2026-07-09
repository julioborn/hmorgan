"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Tablet, List, LayoutGrid, X, CheckCircle, UserPlus, Plus, Minus,
    ChevronLeft, ShoppingCart, UtensilsCrossed, Clock,
} from "lucide-react";
import Loader from "@/components/Loader";
import { useCategoryConfigs } from "@/hooks/useCategoryConfigs";

type Mesa = { _id: string; nombre: string; activa: boolean; x?: number; y?: number; forma?: string; ancho?: number; alto?: number; rotacion?: number; tipo?: string };
type SalonEl = { _id: string; tipo: string; label?: string; x: number; y: number; ancho: number; alto: number; color: string };
type UsuarioSug = { _id: string; nombre: string; apellido: string; username: string };
type PedidoItem = { _id: string; menuItemId: { _id: string; nombre: string; precio: number }; cantidad: number; nota?: string };
type Pedido = { _id: string; items: PedidoItem[]; total: number; estado: string; createdAt: string };
type Sesion = { _id: string; mesasNombres: string[]; usuariosIds: { _id: string; nombre: string; apellido: string; username: string }[]; pedidos?: Pedido[] };
type MenuItem = { _id: string; nombre: string; precio: number; categoria: string; activo: boolean };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(n);
const BEBIDAS_CATS = ["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"];
const MAIN_ORDER = ["PARRILLA", "PIZZAS", "HAMBURGUESAS", "SANDWICHES", "PICADAS", "ENSALADAS", "FRITURAS", "BEBIDAS", "POSTRE Y CAFE"];

type PageView = "sesiones" | "asignar";

export default function EmpleadoAutoservicioPage() {
    const categoryConfigMap = useCategoryConfigs();
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [elementos, setElementos] = useState<SalonEl[]>([]);
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageView, setPageView] = useState<PageView>("sesiones");

    // Asignar nueva sesión
    const [vistaAsignar, setVistaAsignar] = useState<"lista" | "plano">("lista");
    const [mesasSeleccionadas, setMesasSeleccionadas] = useState<string[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [usernames, setUsernames] = useState<string[]>([]);
    const [sugerencias, setSugerencias] = useState<UsuarioSug[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [errorAsignar, setErrorAsignar] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Agregar items a una sesión
    const [sesionAgregando, setSesionAgregando] = useState<Sesion | null>(null);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [categoriaMenu, setCategoriaMenu] = useState<string | null>(null);
    const [cartAdd, setCartAdd] = useState<Record<string, number>>({});
    const [notasAdd, setNotasAdd] = useState<Record<string, string>>({});
    const [enviandoItems, setEnviandoItems] = useState(false);

    // Agregar cliente a sesión existente
    const [agregandoClienteId, setAgregandoClienteId] = useState<string | null>(null);
    const [agregandoInput, setAgregandoInput] = useState("");
    const [agregandoSug, setAgregandoSug] = useState<UsuarioSug[]>([]);
    const [agregandoBuscando, setAgregandoBuscando] = useState(false);
    const debounceAgregarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function cargar() {
        const [mRes, elRes, sRes] = await Promise.all([
            fetch("/api/admin/mesas", { credentials: "include" }),
            fetch("/api/superadmin/salon", { credentials: "include" }),
            fetch("/api/autoservicio", { credentials: "include" }),
        ]);
        const [mData, elData, sData] = await Promise.all([mRes.json(), elRes.json(), sRes.json()]);
        setMesas(Array.isArray(mData) ? mData.filter((m: Mesa) => m.activa).sort((a, b) => parseInt(a.nombre) - parseInt(b.nombre)) : []);
        setElementos(Array.isArray(elData) ? elData : []);

        // Para cada sesión, traer pedidos activos de esas mesas
        if (Array.isArray(sData)) {
            const sesionesConPedidos = await Promise.all(sData.map(async (s: Sesion) => {
                const query = s.mesasNombres.map(m => `mesa=${encodeURIComponent(m)}`).join("&");
                const pRes = await fetch(`/api/pedidos?activos=true&${query}`, { credentials: "include" });
                const pData = await pRes.json().catch(() => []);
                return { ...s, pedidos: Array.isArray(pData) ? pData.filter((p: Pedido) => !["cerrado","cancelado","cobrado"].includes(p.estado)) : [] };
            }));
            setSesiones(sesionesConPedidos);
        } else {
            setSesiones([]);
        }
        setLoading(false);
    }

    async function cargarMenu() {
        if (menu.length > 0) return;
        const r = await fetch("/api/menu", { credentials: "include" });
        const d = await r.json();
        setMenu(Array.isArray(d) ? d.filter((i: MenuItem) => i.activo) : []);
    }

    useEffect(() => { cargar(); }, []);

    // Búsqueda debounce para agregar cliente a sesión existente
    useEffect(() => {
        if (debounceAgregarRef.current) clearTimeout(debounceAgregarRef.current);
        const q = agregandoInput.trim();
        if (q.length < 2) { setAgregandoSug([]); return; }
        debounceAgregarRef.current = setTimeout(async () => {
            setAgregandoBuscando(true);
            try {
                const r = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(q)}`, { credentials: "include" });
                const d = await r.json();
                setAgregandoSug(Array.isArray(d) ? d : []);
            } finally { setAgregandoBuscando(false); }
        }, 300);
    }, [agregandoInput]);

    async function agregarClienteASesion(sesionId: string, usuario: UsuarioSug) {
        const res = await fetch(`/api/autoservicio/${sesionId}`, {
            method: "PATCH", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "agregarUsuario", username: usuario.username }),
        });
        if (res.ok) {
            setAgregandoClienteId(null);
            setAgregandoInput("");
            setAgregandoSug([]);
            await cargar();
        }
    }

    // Búsqueda de usuarios con debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = userInput.trim();
        if (q.length < 2) { setSugerencias([]); return; }
        debounceRef.current = setTimeout(async () => {
            setBuscando(true);
            try {
                const r = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(q)}`, { credentials: "include" });
                const d = await r.json();
                setSugerencias(Array.isArray(d) ? d.filter((u: UsuarioSug) => !usernames.includes(u.username)) : []);
            } finally { setBuscando(false); }
        }, 300);
    }, [userInput, usernames]);

    const mesasConSesion = new Set(sesiones.flatMap(s => s.mesasNombres));

    function toggleMesa(nombre: string) {
        if (mesasConSesion.has(nombre)) return;
        setMesasSeleccionadas(prev => prev.includes(nombre) ? prev.filter(x => x !== nombre) : [...prev, nombre]);
    }
    function seleccionarUsuario(u: UsuarioSug) {
        if (!usernames.includes(u.username)) setUsernames(p => [...p, u.username]);
        setUserInput(""); setSugerencias([]);
    }
    function agregarUsername() {
        const u = userInput.trim().toLowerCase();
        if (!u || usernames.includes(u)) return;
        setUsernames(p => [...p, u]); setUserInput(""); setSugerencias([]);
    }
    function cerrarModal() {
        setModalOpen(false); setUsernames([]); setUserInput(""); setSugerencias([]); setErrorAsignar("");
    }
    async function crearSesion() {
        if (!mesasSeleccionadas.length || !usernames.length) return;
        setEnviando(true); setErrorAsignar("");
        try {
            const res = await fetch("/api/autoservicio", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mesasNombres: mesasSeleccionadas, usernames }),
            });
            const data = await res.json();
            if (!res.ok) { setErrorAsignar(data.error || "Error al crear sesión"); return; }
            setMesasSeleccionadas([]); cerrarModal(); setPageView("sesiones"); await cargar();
        } finally { setEnviando(false); }
    }
    async function cerrarSesion(id: string) {
        await fetch(`/api/autoservicio/${id}`, { method: "PATCH", credentials: "include" });
        await cargar();
    }

    // Agregar ítems a la sesión
    async function abrirAgregar(s: Sesion) {
        await cargarMenu();
        setSesionAgregando(s); setCartAdd({}); setNotasAdd({}); setCategoriaMenu(null);
    }
    async function enviarItems() {
        if (!sesionAgregando) return;
        const items = Object.entries(cartAdd).filter(([,c]) => c > 0).map(([id, cantidad]) => ({
            menuItemId: id, cantidad, nota: notasAdd[id]?.trim() || undefined,
        }));
        if (!items.length) return;

        // Buscar el pedido activo más reciente de esa sesión para añadir, o crear uno nuevo
        const pedidoActivo = sesionAgregando.pedidos?.find(p => !["cerrado","cancelado","cobrado"].includes(p.estado));
        setEnviandoItems(true);
        try {
            if (pedidoActivo) {
                await fetch(`/api/pedidos/${pedidoActivo._id}`, {
                    method: "PATCH", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accion: "agregarItems", items }),
                });
            } else {
                await fetch("/api/pedidos", {
                    method: "POST", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        items,
                        fuente: "autoservicio",
                        mesa: sesionAgregando.mesasNombres.join(", "),
                        tipoEntrega: "retira",
                    }),
                });
            }
            setSesionAgregando(null); setCartAdd({}); setNotasAdd({});
            await cargar();
        } finally { setEnviandoItems(false); }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    // ── Vista agregar ítems ──────────────────────────────────────────────────
    if (sesionAgregando) {
        const cats = [...new Set(menu.map(i => BEBIDAS_CATS.includes(i.categoria) ? "BEBIDAS" : i.categoria))]
            .sort((a, b) => { const ai = MAIN_ORDER.indexOf(a), bi = MAIN_ORDER.indexOf(b); return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi); });
        const totalCart = Object.entries(cartAdd).reduce((s,[id,c]) => s+(menu.find(m=>m._id===id)?.precio??0)*c, 0);
        const totalItems = Object.values(cartAdd).reduce((a,b)=>a+b,0);

        if (!categoriaMenu) return (
            <div className="min-h-screen bg-gray-50 pb-32">
                <div className="bg-black px-4 pt-5 pb-4 sticky top-0 z-20">
                    <div className="max-w-xl mx-auto flex items-center gap-3">
                        <button onClick={() => setSesionAgregando(null)} className="p-2 text-white/70 hover:text-white"><ChevronLeft size={22}/></button>
                        <div>
                            <p className="text-xs text-purple-300 font-semibold">Agregar a sesión</p>
                            <h1 className="text-lg font-black text-white">Mesa{sesionAgregando.mesasNombres.length>1?"s":""} {sesionAgregando.mesasNombres.join(", ")}</h1>
                        </div>
                        {totalItems > 0 && (
                            <button onClick={enviarItems} disabled={enviandoItems}
                                className="ml-auto flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                                <ShoppingCart size={15}/> {enviandoItems ? "Agregando..." : `Agregar · $${fmt(totalCart)}`}
                            </button>
                        )}
                    </div>
                </div>
                <div className="max-w-xl mx-auto px-4 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Elegí una categoría</p>
                    <div className="grid grid-cols-2 gap-3">
                        {cats.map(cat => {
                            const count = cat === "BEBIDAS" ? menu.filter(i=>BEBIDAS_CATS.includes(i.categoria)).length : menu.filter(i=>i.categoria===cat).length;
                            return (
                                <button key={cat} onClick={() => setCategoriaMenu(cat)}
                                    className="bg-white rounded-2xl border border-gray-200 px-4 py-4 text-left shadow-sm hover:border-purple-300 transition active:scale-[0.98]">
                                    <p className="font-black text-gray-900">{cat}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{count} productos</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );

        const productosCategoria = categoriaMenu === "BEBIDAS"
            ? menu.filter(i => BEBIDAS_CATS.includes(i.categoria))
            : menu.filter(i => i.categoria === categoriaMenu);

        return (
            <div className="min-h-screen bg-gray-50 pb-32">
                <div className="bg-black px-4 pt-5 pb-4 sticky top-0 z-20">
                    <div className="max-w-xl mx-auto flex items-center gap-3">
                        <button onClick={() => setCategoriaMenu(null)} className="p-2 text-white/70 hover:text-white"><ChevronLeft size={22}/></button>
                        <div className="flex-1">
                            <p className="text-xs text-purple-300 font-semibold">Mesa{sesionAgregando.mesasNombres.length>1?"s":""} {sesionAgregando.mesasNombres.join(", ")}</p>
                            <h1 className="text-lg font-black text-white">{categoriaMenu}</h1>
                        </div>
                        {totalItems > 0 && (
                            <button onClick={enviarItems} disabled={enviandoItems}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                                <ShoppingCart size={15}/> {enviandoItems ? "Agregando..." : `$${fmt(totalCart)}`}
                            </button>
                        )}
                    </div>
                </div>
                <div className="max-w-xl mx-auto px-4 pt-4 space-y-2">
                    {productosCategoria.map(item => (
                        <div key={item._id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">{item.nombre}</p>
                                <p className="text-xs text-purple-600 font-semibold">${fmt(item.precio)}</p>
                                {(cartAdd[item._id]??0)>0 && (
                                    <input placeholder="Nota..." value={notasAdd[item._id]||""} onChange={e=>setNotasAdd(p=>({...p,[item._id]:e.target.value}))}
                                        style={{fontSize:"16px"}} className="mt-1.5 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
                                )}
                            </div>
                            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
                                <button onClick={()=>setCartAdd(p=>({...p,[item._id]:Math.max((p[item._id]||0)-1,0)}))}
                                    className="w-9 h-9 text-purple-500 text-lg font-bold flex items-center justify-center hover:bg-gray-100">−</button>
                                <span className="w-8 text-center text-sm font-bold text-black">{cartAdd[item._id]||0}</span>
                                <button onClick={()=>setCartAdd(p=>({...p,[item._id]:(p[item._id]||0)+1}))}
                                    className="w-9 h-9 text-purple-500 text-lg font-bold flex items-center justify-center hover:bg-gray-100">+</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Vista principal ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-black px-4 pt-5 pb-4 sticky top-0 z-20">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tablet size={22} className="text-white" />
                        <h1 className="text-xl font-black text-white">Autoservicio</h1>
                        {sesiones.length > 0 && (
                            <span className="bg-purple-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{sesiones.length}</span>
                        )}
                    </div>
                    <div className="flex gap-1 bg-white/10 rounded-xl p-1">
                        <button onClick={() => setPageView("sesiones")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${pageView==="sesiones" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
                            Comandas
                        </button>
                        <button onClick={() => setPageView("asignar")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${pageView==="asignar" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
                            + Asignar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Tab: Comandas de sesiones activas ── */}
            {pageView === "sesiones" && (
                <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                    {sesiones.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
                                <Tablet size={32} className="text-purple-300" />
                            </div>
                            <p className="font-bold text-gray-500">Sin sesiones activas</p>
                            <button onClick={() => setPageView("asignar")}
                                className="flex items-center gap-2 bg-purple-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition">
                                <Plus size={15}/> Asignar nueva
                            </button>
                        </div>
                    ) : sesiones.map(s => (
                        <div key={s._id} className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
                            {/* Header sesión */}
                            <div className="px-4 py-3 bg-purple-600">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="font-black text-white text-base">
                                            Mesa{s.mesasNombres.length>1?"s":""} {s.mesasNombres.join(", ")}
                                        </p>
                                        <p className="text-purple-200 text-xs">
                                            {s.usuariosIds.map(u => `${u.nombre || ""}${u.apellido ? " "+u.apellido : ""} (@${u.username})`).join(", ")}
                                        </p>
                                    </div>
                                    <button onClick={() => abrirAgregar(s)}
                                        className="flex items-center gap-1.5 bg-white text-purple-700 font-bold text-xs px-3 py-1.5 rounded-lg transition hover:bg-purple-50">
                                        <Plus size={13}/> Agregar
                                    </button>
                                    <button onClick={() => { setAgregandoClienteId(agregandoClienteId === s._id ? null : s._id); setAgregandoInput(""); setAgregandoSug([]); }}
                                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
                                        title="Agregar cliente">
                                        <UserPlus size={14}/>
                                    </button>
                                    <button onClick={() => cerrarSesion(s._id)}
                                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition">
                                        <X size={14}/>
                                    </button>
                                </div>
                                {/* Buscador inline para agregar cliente */}
                                {agregandoClienteId === s._id && (
                                    <div className="mt-2 relative">
                                        <input
                                            autoFocus
                                            value={agregandoInput}
                                            onChange={e => setAgregandoInput(e.target.value)}
                                            placeholder="Buscar por nombre o @usuario..."
                                            style={{ fontSize: "16px" }}
                                            className="w-full px-3 py-2 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none"
                                        />
                                        {agregandoBuscando && (
                                            <p className="text-purple-200 text-xs mt-1">Buscando...</p>
                                        )}
                                        {agregandoSug.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                                {agregandoSug
                                                    .filter(u => !s.usuariosIds.some(eu => eu._id === u._id))
                                                    .map(u => (
                                                        <button key={u._id} onMouseDown={e => e.preventDefault()}
                                                            onClick={() => agregarClienteASesion(s._id, u)}
                                                            className="w-full text-left px-3 py-2.5 hover:bg-purple-50 text-sm border-b border-gray-50 last:border-0 transition">
                                                            <span className="font-semibold text-gray-900">{u.nombre} {u.apellido}</span>
                                                            <span className="text-gray-400 text-xs ml-2">@{u.username}</span>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Pedidos de la sesión */}
                            {(!s.pedidos || s.pedidos.length === 0) ? (
                                <div className="px-4 py-4 text-center">
                                    <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                                        <UtensilsCrossed size={16}/> Sin pedidos aún
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {s.pedidos.map(p => (
                                        <div key={p._id} className="px-4 py-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        p.estado==="pendiente" ? "bg-amber-100 text-amber-700"
                                                        : p.estado==="aceptado" ? "bg-blue-100 text-blue-700"
                                                        : p.estado==="preparando" ? "bg-orange-100 text-orange-700"
                                                        : "bg-emerald-100 text-emerald-700"
                                                    }`}>{p.estado}</span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Clock size={11}/>{new Date(p.createdAt).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}
                                                    </span>
                                                </div>
                                                <span className="font-black text-gray-900 text-sm">${fmt(p.total)}</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {p.items.map(it => (
                                                    <li key={it._id} className="flex justify-between text-sm text-gray-700">
                                                        <span>{it.cantidad}× {it.menuItemId?.nombre ?? "—"}{it.nota ? <span className="text-gray-400 text-xs"> · {it.nota}</span> : null}</span>
                                                        <span className="text-gray-500 text-xs">${fmt((it.menuItemId?.precio??0)*it.cantidad)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tab: Asignar nueva sesión ── */}
            {pageView === "asignar" && (
                <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
                    {/* Toggle lista/plano */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        <button onClick={() => setVistaAsignar("lista")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${vistaAsignar==="lista" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}>
                            <List size={14}/> Lista
                        </button>
                        <button onClick={() => setVistaAsignar("plano")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${vistaAsignar==="plano" ? "bg-white text-black shadow-sm" : "text-gray-500"}`}>
                            <LayoutGrid size={14}/> Plano
                        </button>
                    </div>

                    {/* Selección actual */}
                    {mesasSeleccionadas.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-purple-500 uppercase">Seleccionadas</p>
                                <p className="font-bold text-purple-900">Mesa{mesasSeleccionadas.length>1?"s":""} {mesasSeleccionadas.join(", ")}</p>
                            </div>
                            <button onClick={() => setMesasSeleccionadas([])} className="p-1.5 text-purple-400 hover:text-purple-700"><X size={16}/></button>
                            <button onClick={() => { if (mesasSeleccionadas.length) { setModalOpen(true); setErrorAsignar(""); } }}
                                className="flex items-center gap-2 bg-purple-600 text-white font-bold text-sm px-4 py-2 rounded-xl">
                                <UserPlus size={15}/> Asignar
                            </button>
                        </div>
                    )}

                    {/* Vista lista */}
                    {vistaAsignar === "lista" && (
                        <div className="space-y-2">
                            {mesas.map(m => {
                                const tieneSession = mesasConSesion.has(m.nombre);
                                const seleccionada = mesasSeleccionadas.includes(m.nombre);
                                return (
                                    <button key={m._id} onClick={() => toggleMesa(m.nombre)} disabled={tieneSession}
                                        className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition shadow-sm
                                            ${tieneSession ? "bg-purple-50 border-purple-200 opacity-60 cursor-default"
                                            : seleccionada ? "bg-purple-600 border-purple-700 text-white active:scale-[0.98]"
                                            : "bg-white border-gray-200 hover:border-purple-300 active:scale-[0.98]"}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm
                                            ${tieneSession ? "bg-purple-400 text-white" : seleccionada ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                                            {m.nombre}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold ${seleccionada ? "text-white" : "text-gray-900"}`}>Mesa {m.nombre}</p>
                                        </div>
                                        {tieneSession && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">Activa</span>}
                                        {seleccionada && <CheckCircle size={20} className="text-white shrink-0"/>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Vista plano */}
                    {vistaAsignar === "plano" && (
                        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200" style={{ paddingBottom: "72%" }}>
                            <div className="absolute inset-0" style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px" }}>
                                {elementos.map(el => {
                                    const isLine = el.tipo==="linea_h"||el.tipo==="linea_v";
                                    const isBarra = el.tipo==="barra";
                                    if (isLine) return <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, width:el.tipo==="linea_h"?`${el.ancho}%`:"3px", height:el.tipo==="linea_v"?`${el.alto}%`:"3px", backgroundColor:el.color, borderRadius:"2px", transform:el.tipo==="linea_h"?"translateY(-50%)":"translateX(-50%)" }}/>;
                                    return <div key={el._id} style={{ position:"absolute", left:`${el.x}%`, top:`${el.y}%`, transform:"translate(-50%,-50%)", width:`${el.ancho}%`, height:`${el.alto}%`, minWidth:"32px", minHeight:"14px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"6px", backgroundColor:isBarra?"#b45309":el.color, border:isBarra?"2px solid #92400e":`1px solid ${el.color==="#fef3c7"?"#d97706":"#9ca3af"}60` }}>{el.label&&<span style={{fontSize:"clamp(6px,0.9vw,9px)",fontWeight:700,color:isBarra?"#fef3c7":"#374151",whiteSpace:"nowrap"}}>{el.label}</span>}</div>;
                                })}
                                {mesas.map(m => {
                                    const tieneSession = mesasConSesion.has(m.nombre);
                                    const sel = mesasSeleccionadas.includes(m.nombre);
                                    const isRound = m.forma==="round"||m.forma==="oval";
                                    const rot = m.rotacion??0;
                                    const w = m.ancho||(m.forma==="oval"?11:m.forma==="round"?5.5:7);
                                    const h = m.alto||(m.forma==="oval"?5:m.forma==="round"?5.5:5);
                                    const bg = tieneSession ? "bg-purple-500 border-purple-600 text-white"
                                        : sel ? "bg-purple-600 border-purple-700 text-white ring-2 ring-purple-300"
                                        : "bg-emerald-500 border-emerald-600 text-white";
                                    return (
                                        <div key={m._id} onClick={() => !tieneSession && toggleMesa(m.nombre)}
                                            style={{ position:"absolute", left:`${m.x??10}%`, top:`${m.y??10}%`, transform:`translate(-50%,-50%) rotate(${rot}deg)`, width:`min(${w}%,${w*7}px)`, height:`min(${h}%,${h*7.5}px)`, minWidth:"22px", minHeight:"16px", borderRadius:isRound?"50%":"8px", cursor:tieneSession?"not-allowed":"pointer", userSelect:"none", zIndex:2 }}
                                            className={`flex items-center justify-center border-2 ${bg} transition-all active:scale-95`}>
                                            <div style={{ transform:`rotate(${-rot}deg)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                                <span style={{fontSize:"clamp(5px,0.8vw,9px)",fontWeight:900}}>{m.nombre}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal asignar usuarios */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4" onClick={cerrarModal}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase">Autoservicio</p>
                                <h2 className="text-xl font-extrabold text-gray-900">Mesa{mesasSeleccionadas.length>1?"s":""} {mesasSeleccionadas.join(", ")}</h2>
                            </div>
                            <button onClick={cerrarModal} className="p-1 text-gray-400 hover:text-gray-600"><X size={18}/></button>
                        </div>
                        <div className="px-5 pb-2 space-y-3">
                            <p className="text-sm text-gray-500">Agregá los usuarios que van a pedir desde su teléfono.</p>
                            <div className="relative">
                                <div className="flex gap-2">
                                    <input value={userInput} onChange={e => setUserInput(e.target.value)}
                                        onKeyDown={e => e.key==="Enter" && (e.preventDefault(), agregarUsername())}
                                        placeholder="Buscar por nombre o usuario..." style={{ fontSize:"16px" }}
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                                    <button onClick={agregarUsername} className="w-11 h-11 flex items-center justify-center rounded-xl bg-purple-600 text-white shrink-0"><UserPlus size={18}/></button>
                                </div>
                                {(sugerencias.length > 0 || buscando) && (
                                    <div className="absolute left-0 right-12 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                        {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>}
                                        {sugerencias.map(u => (
                                            <button key={u._id} onClick={() => seleccionarUsuario(u)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 text-left transition">
                                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 font-black text-xs text-purple-700">{u.nombre?.[0]?.toUpperCase()??"?"}</div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{u.nombre} {u.apellido}</p>
                                                    <p className="text-xs text-gray-400">@{u.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {usernames.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {usernames.map(u => (
                                        <span key={u} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                            @{u}<button onClick={() => setUsernames(p=>p.filter(x=>x!==u))} className="text-purple-400 hover:text-purple-700"><X size={12}/></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {errorAsignar && <p className="text-red-600 text-xs font-semibold">{errorAsignar}</p>}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
                            <button onClick={crearSesion} disabled={enviando || !usernames.length}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm transition active:scale-[0.98]">
                                <CheckCircle size={16}/>{enviando ? "Activando..." : "Activar autoservicio"}
                            </button>
                            <button onClick={cerrarModal} className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition">Cancelar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
