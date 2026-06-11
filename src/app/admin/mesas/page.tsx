"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { swalBase } from "@/lib/swalConfig";
import { hoyArgentina } from "@/lib/argentina-time";
import {
    Plus, Trash2, ToggleLeft, ToggleRight, Move, X,
    Circle, Square, Users, MapPin, Minus,
    DoorOpen, MoveHorizontal, MoveVertical, LayoutTemplate, UtensilsCrossed,
    MousePointer, RectangleHorizontal, Settings2, Undo2, Redo2,
    AlignStartVertical, AlignEndVertical, AlignCenterHorizontal,
    AlignStartHorizontal, AlignEndHorizontal, AlignCenterVertical,
} from "lucide-react";
import Loader from "@/components/Loader";

type Mesa = {
    _id: string; nombre: string; activa: boolean;
    x: number; y: number;
    forma: "rect" | "round" | "oval";
    tipo?: "mesa" | "banqueta";
    capacidad: number; rotacion?: number;
    ancho?: number; alto?: number;
    zona?: string;
};
type SalonEl = {
    _id: string; tipo: "puerta" | "linea_h" | "linea_v" | "zona" | "barra";
    label: string; x: number; y: number; ancho: number; alto: number; color: string;
};
type Mode = "select" | "lasso" | "config";
type Snapshot = { mesas: Mesa[]; elements: SalonEl[] };

const MESA_DEFAULTS = (forma: string): { ancho: number; alto: number } => {
    if (forma === "oval")  return { ancho: 11, alto: 5  };
    if (forma === "round") return { ancho: 5.5, alto: 5.5 };
    return { ancho: 7, alto: 5 };
};

const EL_DEFAULTS: Record<SalonEl["tipo"], Partial<SalonEl>> = {
    puerta:  { label: "PUERTA",  ancho: 6,  alto: 4,  color: "#fef3c7" },
    barra:   { label: "BARRA",   ancho: 22, alto: 9,  color: "#b45309" },
    linea_h: { label: "",        ancho: 20, alto: 1,  color: "#374151" },
    linea_v: { label: "",        ancho: 1,  alto: 20, color: "#374151" },
    zona:    { label: "Zona",    ancho: 18, alto: 14, color: "#dbeafe" },
};
const EL_ICONS: Record<SalonEl["tipo"], React.ElementType> = {
    puerta: DoorOpen, barra: UtensilsCrossed,
    linea_h: MoveHorizontal, linea_v: MoveVertical, zona: LayoutTemplate,
};
const EL_LABELS: Record<SalonEl["tipo"], string> = {
    puerta: "Puerta", barra: "Barra", linea_h: "Línea H", linea_v: "Línea V", zona: "Zona",
};

export default function SuperAdminMesasPage() {
    const [mesas, setMesas]           = useState<Mesa[]>([]);
    const [elements, setElements]     = useState<SalonEl[]>([]);
    const [loading, setLoading]       = useState(true);
    const [ocupadas, setOcupadas]         = useState<Set<string>>(new Set());
    const [reservadasHoy, setReservadasHoy] = useState<Set<string>>(new Set()); // _id de mesas con reserva hoy
    const [tab, setTab]               = useState<"plano" | "gestion">("plano");
    const [mode, setMode]             = useState<Mode | null>(null); // null = view
    const [selected, setSelected]     = useState<Set<string>>(new Set());
    const [lasso, setLasso]           = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [canUndo, setCanUndo]       = useState(false);
    const [canRedo, setCanRedo]       = useState(false);

    const [nuevaMesa, setNuevaMesa] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError]         = useState("");

    const [mesaModal, setMesaModal] = useState<Mesa | null>(null);
    const [mesaForm, setMesaForm]   = useState<{ forma: Mesa["forma"]; tipo: "mesa"|"banqueta"; capacidad: number; activa: boolean; rotacion: number; ancho: number; alto: number; zona: string }>({ forma: "rect", tipo: "mesa", capacidad: 4, activa: true, rotacion: 0, ancho: 7, alto: 5, zona: "" });
    const [elModal, setElModal]     = useState<SalonEl | null>(null);
    const [elForm, setElForm]       = useState<Partial<SalonEl>>({});

    const canvasRef   = useRef<HTMLDivElement>(null);
    const mesasRef    = useRef<Mesa[]>([]);
    const elementsRef = useRef<SalonEl[]>([]);
    const selectedRef = useRef<Set<string>>(new Set());
    const modeRef     = useRef<Mode | null>(null);

    // Drag
    const dragState = useRef<{
        kind: "items";
        items: { type: "mesa"|"element"; id: string; origX: number; origY: number }[];
        startCX: number; startCY: number;
    } | {
        kind: "lasso";
        startCX: number; startCY: number;
    } | null>(null);
    const movedPx = useRef(0);

    // History
    const histStack = useRef<Snapshot[]>([]);
    const histPos   = useRef(-1);

    useEffect(() => { mesasRef.current    = mesas;    }, [mesas]);
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { selectedRef.current = selected; }, [selected]);
    useEffect(() => { modeRef.current     = mode;     }, [mode]);

    // ── Data fetchers ─────────────────────────────────────────────
    const fetchMesas = useCallback(async () => {
        const r = await fetch("/api/admin/mesas?all=true", { credentials: "include", cache: "no-store" });
        const d = await r.json();
        setMesas(Array.isArray(d) ? d.sort((a: Mesa, b: Mesa) => a.nombre.localeCompare(b.nombre, "es", { numeric: true })) : []);
    }, []);
    const fetchElements = useCallback(async () => {
        const r = await fetch("/api/superadmin/salon", { credentials: "include" });
        const d = await r.json();
        setElements(Array.isArray(d) ? d : []);
    }, []);
    const fetchOcupadas = useCallback(async () => {
        const d = await fetch("/api/pedidos?activos=true&fuente=empleado", { credentials: "include" }).then(r => r.json()).catch(() => []);
        if (Array.isArray(d)) setOcupadas(new Set(d.filter((p: any) => p.mesa).map((p: any) => String(p.mesa))));
    }, []);

    const fetchReservadasHoy = useCallback(async () => {
        const d = await fetch("/api/reservas", { credentials: "include" }).then(r => r.json()).catch(() => []);
        if (!Array.isArray(d)) return;
        const hoy = hoyArgentina();
        setReservadasHoy(new Set(
            d.filter((r: any) => r.estado !== "cancelada" && r.mesaId && r.fecha?.slice(0, 10) === hoy)
             .map((r: any) => String(r.mesaId?._id || r.mesaId))
        ));
    }, []);

    useEffect(() => {
        Promise.all([fetchMesas(), fetchElements(), fetchOcupadas(), fetchReservadasHoy()]).finally(() => setLoading(false));
        const iv = setInterval(() => { fetchOcupadas(); fetchReservadasHoy(); }, 15000);
        return () => clearInterval(iv);
    }, [fetchMesas, fetchElements, fetchOcupadas, fetchReservadasHoy]);

    // ── History ───────────────────────────────────────────────────
    function pushSnapshot() {
        const snap: Snapshot = { mesas: mesasRef.current.map(m => ({ ...m })), elements: elementsRef.current.map(e => ({ ...e })) };
        histStack.current = histStack.current.slice(0, histPos.current + 1);
        histStack.current.push(snap);
        if (histStack.current.length > 40) histStack.current.shift();
        histPos.current = histStack.current.length - 1;
        setCanUndo(histPos.current > 0); setCanRedo(false);
    }

    async function applyAndSave(snap: Snapshot, prev: Snapshot) {
        setMesas(snap.mesas); setElements(snap.elements);
        const changedM  = snap.mesas.filter(m => { const o = prev.mesas.find(x => x._id === m._id); return !o || o.x !== m.x || o.y !== m.y || o.rotacion !== m.rotacion || o.ancho !== m.ancho || o.alto !== m.alto; });
        const changedEl = snap.elements.filter(e => { const o = prev.elements.find(x => x._id === e._id); return !o || o.x !== e.x || o.y !== e.y || o.ancho !== e.ancho || o.alto !== e.alto; });
        await Promise.all([
            ...changedM.map(m => fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: m._id, x: m.x, y: m.y, rotacion: m.rotacion, ancho: m.ancho, alto: m.alto }) })),
            ...changedEl.map(e => fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: e._id, x: e.x, y: e.y, ancho: e.ancho, alto: e.alto }) })),
        ]);
    }

    function undo() {
        if (histPos.current <= 0) return;
        const cur = histStack.current[histPos.current];
        histPos.current--;
        const prev = histStack.current[histPos.current];
        applyAndSave(prev, cur);
        setCanUndo(histPos.current > 0); setCanRedo(true);
    }
    function redo() {
        if (histPos.current >= histStack.current.length - 1) return;
        const cur = histStack.current[histPos.current];
        histPos.current++;
        const next = histStack.current[histPos.current];
        applyAndSave(next, cur);
        setCanUndo(true); setCanRedo(histPos.current < histStack.current.length - 1);
    }

    // Ctrl+Z / Ctrl+Y keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!modeRef.current) return;
            if (e.ctrlKey && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
            if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── Drag system ───────────────────────────────────────────────
    useEffect(() => {
        if (!mode) return;

        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current || !canvasRef.current) return;
            if (e.cancelable) e.preventDefault();
            const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
            const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
            const rect = canvasRef.current.getBoundingClientRect();

            if (dragState.current.kind === "lasso") {
                movedPx.current = Math.hypot(cx - dragState.current.startCX, cy - dragState.current.startCY);
                setLasso({
                    x1: (Math.min(dragState.current.startCX, cx) - rect.left) / rect.width  * 100,
                    y1: (Math.min(dragState.current.startCY, cy) - rect.top)  / rect.height * 100,
                    x2: (Math.max(dragState.current.startCX, cx) - rect.left) / rect.width  * 100,
                    y2: (Math.max(dragState.current.startCY, cy) - rect.top)  / rect.height * 100,
                });
            } else if (dragState.current.kind === "items" && modeRef.current === "select") {
                const dx = (cx - dragState.current.startCX) / rect.width  * 100;
                const dy = (cy - dragState.current.startCY) / rect.height * 100;
                movedPx.current = Math.hypot(cx - dragState.current.startCX, cy - dragState.current.startCY);
                const map = new Map(dragState.current.items.map(it => [
                    it.id, { x: Math.max(1, Math.min(97, it.origX + dx)), y: Math.max(1, Math.min(96, it.origY + dy)) },
                ]));
                setMesas(prev => prev.map(m => map.has(m._id) ? { ...m, ...map.get(m._id) } : m));
                setElements(prev => prev.map(el => map.has(el._id) ? { ...el, ...map.get(el._id) } : el));
            }
        };

        const onUp = () => {
            if (!dragState.current) return;
            const ds = dragState.current;
            const moved = movedPx.current;
            dragState.current = null;
            movedPx.current = 0;

            if (ds.kind === "lasso") {
                if (moved < 5) { setLasso(null); return; }
                setLasso(prev => {
                    if (!prev) return null;
                    const inside = new Set<string>();
                    mesasRef.current.forEach(m => { if (m.x >= prev.x1 && m.x <= prev.x2 && m.y >= prev.y1 && m.y <= prev.y2) inside.add(m._id); });
                    elementsRef.current.forEach(e => { if (e.x >= prev.x1 && e.x <= prev.x2 && e.y >= prev.y1 && e.y <= prev.y2) inside.add(e._id); });
                    setSelected(inside);
                    return null;
                });
                return;
            }

            // Items
            const { items } = ds;
            if (moved < 5) {
                // Tap
                const id = items[0]?.id;
                if (!id) return;
                if (modeRef.current === "config") {
                    // Open config directly
                    const m = mesasRef.current.find(x => x._id === id);
                    if (m) { const def = MESA_DEFAULTS(m.forma); setMesaModal(m); setMesaForm({ forma: m.forma ?? "rect", tipo: m.tipo ?? "mesa", capacidad: m.capacidad ?? 4, activa: m.activa, rotacion: m.rotacion ?? 0, ancho: m.ancho || def.ancho, alto: m.alto || def.alto, zona: m.zona || "" }); return; }
                    const el = elementsRef.current.find(x => x._id === id);
                    if (el) { setElModal(el); setElForm({ label: el.label, ancho: el.ancho, alto: el.alto, color: el.color }); }
                } else {
                    // Toggle selection
                    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
                }
            } else {
                // Real drag — save positions
                (async () => {
                    for (const it of items) {
                        const m = mesasRef.current.find(x => x._id === it.id);
                        if (m) { await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: m._id, x: m.x, y: m.y }) }); continue; }
                        const el = elementsRef.current.find(x => x._id === it.id);
                        if (el) await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: el._id, x: el.x, y: el.y }) });
                    }
                })();
            }
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchend", onUp);
        };
    }, [mode]);

    function startItemDrag(e: React.MouseEvent | React.TouchEvent, type: "mesa"|"element", id: string, ox: number, oy: number) {
        if (mode !== "select" && mode !== "config") return;
        e.preventDefault(); e.stopPropagation();
        movedPx.current = 0;
        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;

        // Determine items to drag (selected group or single)
        let items: { type: "mesa"|"element"; id: string; origX: number; origY: number }[];
        if (mode === "select" && selectedRef.current.has(id) && selectedRef.current.size > 1) {
            items = [...selectedRef.current].map(selId => {
                const m = mesasRef.current.find(x => x._id === selId);
                if (m) return { type: "mesa" as const, id: selId, origX: m.x ?? 10, origY: m.y ?? 10 };
                const el = elementsRef.current.find(x => x._id === selId);
                if (el) return { type: "element" as const, id: selId, origX: el.x, origY: el.y };
                return null;
            }).filter(Boolean) as typeof items;
        } else {
            items = [{ type, id, origX: ox, origY: oy }];
        }

        if (mode === "select") pushSnapshot(); // snapshot before drag
        dragState.current = { kind: "items", items, startCX: cx, startCY: cy };
    }

    function onCanvasDown(e: React.MouseEvent | React.TouchEvent) {
        if ((e.target as HTMLElement) !== canvasRef.current) return;
        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
        if (mode === "lasso" || mode === "select") {
            setSelected(new Set());
            movedPx.current = 0;
            dragState.current = { kind: "lasso", startCX: cx, startCY: cy };
        }
    }

    // ── Alignment ─────────────────────────────────────────────────
    async function align(op: "left"|"right"|"top"|"bottom"|"centerH"|"centerV"|"distH"|"distV") {
        const ids = [...selected]; if (ids.length < 2) return;
        pushSnapshot();
        type I = { id: string; type: "mesa"|"element"; x: number; y: number };
        const items: I[] = ids.map(id => {
            const m = mesasRef.current.find(x => x._id === id);
            if (m) return { id, type: "mesa" as const, x: m.x, y: m.y };
            const el = elementsRef.current.find(x => x._id === id);
            if (el) return { id, type: "element" as const, x: el.x, y: el.y };
            return null;
        }).filter(Boolean) as I[];
        const xs = items.map(i => i.x), ys = items.map(i => i.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        let updates: I[];
        if (op === "left")    updates = items.map(i => ({ ...i, x: minX }));
        else if (op === "right")   updates = items.map(i => ({ ...i, x: maxX }));
        else if (op === "top")     updates = items.map(i => ({ ...i, y: minY }));
        else if (op === "bottom")  updates = items.map(i => ({ ...i, y: maxY }));
        else if (op === "centerH") { const m = (minX+maxX)/2; updates = items.map(i => ({ ...i, x: m })); }
        else if (op === "centerV") { const m = (minY+maxY)/2; updates = items.map(i => ({ ...i, y: m })); }
        else if (op === "distH")   { const s = [...items].sort((a,b)=>a.x-b.x); const g=(maxX-minX)/(s.length-1); updates = s.map((it,i)=>({...it,x:minX+i*g})); }
        else                       { const s = [...items].sort((a,b)=>a.y-b.y); const g=(maxY-minY)/(s.length-1); updates = s.map((it,i)=>({...it,y:minY+i*g})); }
        const map = new Map(updates.map(u => [u.id, u]));
        setMesas(prev => prev.map(m => map.has(m._id) ? { ...m, x: map.get(m._id)!.x, y: map.get(m._id)!.y } : m));
        setElements(prev => prev.map(e => map.has(e._id) ? { ...e, x: map.get(e._id)!.x, y: map.get(e._id)!.y } : e));
        await Promise.all(updates.map(u => u.type === "mesa"
            ? fetch("/api/admin/mesas", { method: "PATCH", headers: {"Content-Type":"application/json"}, credentials: "include", body: JSON.stringify({ id: u.id, x: u.x, y: u.y }) })
            : fetch("/api/superadmin/salon", { method: "PATCH", headers: {"Content-Type":"application/json"}, credentials: "include", body: JSON.stringify({ id: u.id, x: u.x, y: u.y }) })
        ));
    }

    // ── Config modals ─────────────────────────────────────────────
    async function saveMesaConfig() {
        if (!mesaModal) return;
        pushSnapshot();
        const res = await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: mesaModal._id, ...mesaForm }) });
        if (res.ok) { const u = await res.json(); setMesas(p => p.map(m => m._id === u._id ? u : m)); setMesaModal(null); }
    }
    async function saveElConfig() {
        if (!elModal) return;
        const res = await fetch("/api/superadmin/salon", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: elModal._id, ...elForm }) });
        if (res.ok) { const u = await res.json(); setElements(p => p.map(e => e._id === u._id ? u : e)); setElModal(null); }
    }
    async function deleteEl(id: string) {
        await fetch(`/api/superadmin/salon?id=${id}`, { method: "DELETE", credentials: "include" });
        setElements(p => p.filter(e => e._id !== id)); setElModal(null);
    }
    async function addElement(tipo: SalonEl["tipo"]) {
        const res = await fetch("/api/superadmin/salon", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tipo, x: 48, y: 48, ...EL_DEFAULTS[tipo] }) });
        if (res.ok) { const el = await res.json(); setElements(p => [...p, el]); }
    }

    // ── Mesa CRUD ─────────────────────────────────────────────────
    async function agregarMesa() {
        if (!nuevaMesa.trim()) return;
        setGuardando(true); setError("");
        try {
            const n = mesas.length;
            const res = await fetch("/api/admin/mesas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ nombre: nuevaMesa.trim(), x: 8 + (n % 8) * 11, y: 8 + Math.floor(n / 8) * 16 }) });
            if (!res.ok) { setError((await res.json().catch(() => ({}))).message || "Error"); return; }
            setNuevaMesa(""); await fetchMesas();
        } finally { setGuardando(false); }
    }
    async function eliminarMesa(id: string) {
        const r = await swalBase.fire({ title: "¿Eliminar esta mesa?", icon: "warning", showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" });
        if (!r.isConfirmed) return;
        await fetch(`/api/admin/mesas?id=${id}`, { method: "DELETE", credentials: "include" });
        setMesas(p => p.filter(m => m._id !== id));
    }
    async function toggleActiva(id: string) {
        const res = await fetch("/api/admin/mesas", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
        if (res.ok) { const u = await res.json(); setMesas(p => p.map(m => m._id === u._id ? u : m).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))); }
    }

    function openSelectedConfig() {
        if (selected.size !== 1) return;
        const id = [...selected][0];
        const m = mesas.find(x => x._id === id);
        if (m) { const def = MESA_DEFAULTS(m.forma); setMesaModal(m); setMesaForm({ forma: m.forma ?? "rect", tipo: m.tipo ?? "mesa", capacidad: m.capacidad ?? 4, activa: m.activa, rotacion: m.rotacion ?? 0, ancho: m.ancho || def.ancho, alto: m.alto || def.alto, zona: m.zona || "" }); return; }
        const el = elements.find(x => x._id === id);
        if (el) { setElModal(el); setElForm({ label: el.label, ancho: el.ancho, alto: el.alto, color: el.color }); }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader size={48} /></div>;

    const mesasActivas  = mesas.filter(m => m.activa).length;
    const ocupadasCount = mesas.filter(m => m.activa && (ocupadas.has(m.nombre) || reservadasHoy.has(m._id))).length;
    const selCount      = selected.size;

    const ModeBtn = ({ m, icon: Icon, label }: { m: Mode; icon: React.ElementType; label: string }) => (
        <button onClick={() => { setMode(prev => prev === m ? null : m); setSelected(new Set()); setLasso(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${mode === m ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            <Icon size={13} />{label}
        </button>
    );

    const AlignBtn = ({ op, title, children }: { op: Parameters<typeof align>[0]; title: string; children: React.ReactNode }) => (
        <button onClick={() => align(op)} title={title}
            className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold text-gray-700 transition flex items-center gap-0.5">
            {children}
        </button>
    );

    return (
        <div className="min-h-screen pb-16">
            {/* Header */}
            <div className="px-4">
                <h1 className="text-3xl font-extrabold text-center py-6 text-black">Mesas</h1>
                <p className="text-xs text-gray-400 text-center -mt-4 mb-4">
                    {mesasActivas} mesas · {mesas.filter(m => m.tipo === "banqueta").length} banquetas · <span className="text-red-500 font-semibold">{ocupadasCount} ocupadas</span>
                </p>
                <div className="flex justify-center mb-4">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {(["plano","gestion"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                                {t === "plano" ? "Plano" : "Gestión"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PLANO */}
            {tab === "plano" && (
                <div className="max-w-5xl mx-auto px-3">
                    {/* Mode toolbar */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <ModeBtn m="select" icon={MousePointer}       label="Seleccionar" />
                        <ModeBtn m="lasso"  icon={RectangleHorizontal} label="Lazo" />
                        <ModeBtn m="config" icon={Settings2}           label="Editar" />

                        {mode && (
                            <>
                                <div className="w-px h-5 bg-gray-200 mx-1" />
                                <button onClick={undo} disabled={!canUndo} title="Ctrl+Z" className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"><Undo2 size={14} className="text-gray-600" /></button>
                                <button onClick={redo} disabled={!canRedo} title="Ctrl+Y" className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"><Redo2 size={14} className="text-gray-600" /></button>
                            </>
                        )}

                        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />Libre</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" />Ocupada / Reservada hoy</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-700" />Banqueta</span>
                        </div>
                    </div>

                    {/* Mode hint */}
                    {mode && (
                        <p className="text-xs text-gray-400 mb-1 px-1">
                            {mode === "select" && "Tap = seleccionar · Arrastrar ítem = mover · Arrastrar fondo = lazo · Ctrl+Z/Y deshacer"}
                            {mode === "lasso"  && "Arrastrá para seleccionar un área"}
                            {mode === "config" && "Tap en cualquier mesa o elemento para configurarlo"}
                        </p>
                    )}

                    {/* Add elements (config mode only) */}
                    {mode === "config" && (
                        <div className="flex items-center gap-2 mb-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex-wrap">
                            <span className="text-xs font-semibold text-amber-700 mr-1">Agregar:</span>
                            {(["puerta","barra","linea_h","linea_v","zona"] as const).map(tipo => {
                                const Icon = EL_ICONS[tipo];
                                return (
                                    <button key={tipo} onClick={() => addElement(tipo)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-50 rounded-lg text-xs font-semibold text-gray-700 transition">
                                        <Icon size={12} />{EL_LABELS[tipo]}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Selection / alignment toolbar */}
                    {(mode === "select" || mode === "lasso") && selCount > 0 && (
                        <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex-wrap">
                            <span className="text-xs font-semibold text-blue-700 shrink-0">{selCount} selec.</span>
                            {selCount === 1 && (
                                <button onClick={openSelectedConfig} className="px-3 py-1 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold text-blue-700 transition">⚙ Configurar</button>
                            )}
                            {selCount >= 2 && (
                                <>
                                    <span className="text-[10px] text-gray-400">H:</span>
                                    <AlignBtn op="left"    title="Alinear izquierda"><AlignStartVertical size={12}  /></AlignBtn>
                                    <AlignBtn op="centerH" title="Centrar H"><AlignCenterVertical size={12}   /></AlignBtn>
                                    <AlignBtn op="right"   title="Alinear derecha"><AlignEndVertical size={12}    /></AlignBtn>
                                    <AlignBtn op="distH"   title="Distribuir H"><span className="text-[10px]">⟺H</span></AlignBtn>
                                    <span className="text-[10px] text-gray-400">V:</span>
                                    <AlignBtn op="top"     title="Alinear arriba"><AlignStartHorizontal size={12} /></AlignBtn>
                                    <AlignBtn op="centerV" title="Centrar V"><AlignCenterHorizontal size={12}    /></AlignBtn>
                                    <AlignBtn op="bottom"  title="Alinear abajo"><AlignEndHorizontal size={12}   /></AlignBtn>
                                    <AlignBtn op="distV"   title="Distribuir V"><span className="text-[10px]">⟺V</span></AlignBtn>
                                </>
                            )}
                            <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-gray-400 hover:text-gray-700"><X size={14} /></button>
                        </div>
                    )}

                    {/* Canvas */}
                    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ paddingBottom: "66%" }}>
                        <div ref={canvasRef} className="absolute inset-0"
                            style={{ backgroundColor: "#f9f5ef", backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)", backgroundSize: "30px 30px", cursor: mode === "lasso" ? "crosshair" : mode ? "default" : "default" }}
                            onMouseDown={onCanvasDown} onTouchStart={onCanvasDown}>

                            {/* Lasso rect */}
                            {lasso && <div style={{ position:"absolute", left:`${lasso.x1}%`, top:`${lasso.y1}%`, width:`${lasso.x2-lasso.x1}%`, height:`${lasso.y2-lasso.y1}%`, border:"2px dashed #3b82f6", backgroundColor:"rgba(59,130,246,0.08)", borderRadius:"4px", pointerEvents:"none", zIndex:10 }} />}

                            {/* Elements */}
                            {elements.map(el => {
                                const isLine = el.tipo==="linea_h"||el.tipo==="linea_v";
                                const isBarra = el.tipo==="barra";
                                const isSel = selected.has(el._id);
                                const interactive = mode === "select" || mode === "config";
                                const base: React.CSSProperties = { position:"absolute", cursor: interactive ? "grab" : "default", userSelect:"none", touchAction: interactive ? "none" : "auto", zIndex:1 };
                                let s: React.CSSProperties;
                                if (isLine) {
                                    s = { ...base, left:`${el.x}%`, top:`${el.y}%`, width:el.tipo==="linea_h"?`${el.ancho}%`:"3px", height:el.tipo==="linea_v"?`${el.alto}%`:"3px", backgroundColor:isSel?"#3b82f6":el.color, borderRadius:"2px", transform:el.tipo==="linea_h"?"translateY(-50%)":"translateX(-50%)", outline:isSel?"2px solid #3b82f6":"none", outlineOffset:"2px" };
                                } else {
                                    s = { ...base, left:`${el.x}%`, top:`${el.y}%`, transform:"translate(-50%,-50%)", width:`${el.ancho}%`, height:`${el.alto}%`, minWidth:"40px", minHeight:"18px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:isBarra?"8px":"6px", backgroundColor:isBarra?"#b45309":el.color, border:isSel?"2px solid #3b82f6":isBarra?"2px solid #92400e":el.tipo==="zona"?`2px dashed ${el.color==="#dbeafe"?"#3b82f6":"#6b7280"}99`:`2px solid ${el.color==="#fef3c7"?"#d97706":"#9ca3af"}80`, boxShadow:isSel?"0 0 0 3px rgba(59,130,246,0.25)":"none" };
                                }
                                return (
                                    <div key={el._id} style={s}
                                        onMouseDown={interactive ? e => startItemDrag(e,"element",el._id,el.x,el.y) : undefined}
                                        onTouchStart={interactive ? e => startItemDrag(e,"element",el._id,el.x,el.y) : undefined}>
                                        {!isLine && <span style={{ fontSize:"clamp(7px,1.1vw,11px)", fontWeight:700, color:isBarra?"#fef3c7":"#374151", textAlign:"center", padding:"0 4px", letterSpacing:"0.05em", lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{el.label}</span>}
                                    </div>
                                );
                            })}

                            {/* Mesas */}
                            {mesas.map(mesa => {
                                const isOcupada   = mesa.activa && ocupadas.has(mesa.nombre);
                                const isReservada = mesa.activa && reservadasHoy.has(mesa._id);
                                const isRound     = mesa.forma === "round";
                                const isOval      = mesa.forma === "oval";
                                const isBanq      = mesa.tipo === "banqueta";
                                const isSel       = selected.has(mesa._id);
                                const rot         = mesa.rotacion ?? 0;
                                const interactive = mode === "select" || mode === "config";

                                const def = MESA_DEFAULTS(mesa.forma);
                                const w = mesa.ancho || def.ancho;
                                const h = mesa.alto  || def.alto;

                                const bg = !mesa.activa ? "bg-gray-300 border-gray-400 text-gray-500"
                                    : isBanq                        ? "bg-amber-700 border-amber-800 text-amber-100"
                                    : isOcupada || isReservada      ? "bg-red-500 border-red-600 text-white"
                                    : "bg-emerald-500 border-emerald-600 text-white";

                                return (
                                    <div key={mesa._id} style={{
                                        position: "absolute",
                                        left: `${mesa.x ?? 10}%`, top: `${mesa.y ?? 10}%`,
                                        transform: `translate(-50%,-50%) rotate(${rot}deg)`,
                                        cursor: interactive ? "grab" : "default",
                                        touchAction: interactive ? "none" : "auto",
                                        userSelect: "none", zIndex: 2,
                                        width: `min(${w}%,${w*7}px)`, height: `min(${h}%,${h*7.5}px)`,
                                        minWidth: isRound ? "24px" : "28px", minHeight: "20px",
                                        borderRadius: isRound||isOval ? "50%" : "10px",
                                        outline: isSel ? "2px solid #3b82f6" : "none",
                                        outlineOffset: "3px",
                                        boxShadow: isSel ? "0 0 0 4px rgba(59,130,246,0.2)" : undefined,
                                    }}
                                        className={`flex items-center justify-center border-2 select-none ${bg} ${interactive ? "hover:brightness-110" : ""}`}
                                        onMouseDown={interactive ? e => startItemDrag(e,"mesa",mesa._id,mesa.x??10,mesa.y??10) : undefined}
                                        onTouchStart={interactive ? e => startItemDrag(e,"mesa",mesa._id,mesa.x??10,mesa.y??10) : undefined}>
                                        {/* Single counter-rotated wrapper keeps text upright */}
                                        <div style={{ transform: `rotate(${-rot}deg)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"100%", lineHeight:1 }}>
                                            <span style={{ fontSize:"clamp(6px,0.9vw,10px)", fontWeight:900 }}>{mesa.nombre}</span>
                                            {mesa.capacidad > 0 && !isRound && (
                                                <span style={{ fontSize:"clamp(4px,0.7vw,7px)", opacity:0.75, marginTop:"1px" }}>{mesa.capacidad}p</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {mesas.length === 0 && elements.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-gray-400 text-sm text-center px-6">Sin datos.<br/><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">node scripts/seed-mesas.mjs</code></p>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-2 mb-4">{mesas.length} mesas · {elements.length} elementos {selCount > 0 && `· ${selCount} seleccionados`}</p>
                </div>
            )}

            {/* GESTIÓN */}
            {tab === "gestion" && (
                <div className="max-w-2xl mx-auto px-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <h2 className="font-bold text-gray-800 mb-3 text-sm">Agregar mesa</h2>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Número o nombre" value={nuevaMesa} onChange={e => setNuevaMesa(e.target.value)} onKeyDown={e => e.key==="Enter"&&agregarMesa()} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            <button onClick={agregarMesa} disabled={guardando||!nuevaMesa.trim()} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-semibold transition text-sm shrink-0"><Plus className="w-4 h-4"/>Agregar</button>
                        </div>
                        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">{mesas.length} entradas ({mesas.filter(m=>m.tipo==="banqueta").length} banquetas)</span>
                            <button onClick={fetchMesas} className="text-xs text-gray-400 hover:text-gray-600">↻</button>
                        </div>
                        {mesas.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">Sin mesas.</p> : (
                            <ul className="divide-y divide-gray-100">
                                {mesas.map(m => {
                                    const isOcupada = m.activa&&ocupadas.has(m.nombre);
                                    const isBanq = m.tipo==="banqueta";
                                    return (
                                        <li key={m._id} className="flex items-center gap-3 px-4 py-3">
                                            <div className={`w-9 h-9 flex items-center justify-center text-[9px] font-black shrink-0 border-2 ${m.forma==="round"||m.forma==="oval"?"rounded-full":"rounded-lg"} ${!m.activa?"bg-gray-100 border-gray-200 text-gray-400":isBanq?"bg-amber-700 border-amber-800 text-amber-100":isOcupada?"bg-red-500 border-red-600 text-white":"bg-emerald-500 border-emerald-600 text-white"}`}>{m.nombre}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${!m.activa?"text-gray-400 line-through":"text-gray-900"}`}>{isBanq?"Banqueta":"Mesa"} {m.nombre}</p>
                                                <p className="text-xs text-gray-400">{m.forma==="round"?"Redonda":m.forma==="oval"?"Ovalada":"Rectangular"} · {m.capacidad}p{m.forma==="oval"&&(m.rotacion??0)!==0?` · ${m.rotacion}°`:""}{isOcupada?<span className="text-red-500 font-semibold"> · ocupada</span>:""}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => { const def=MESA_DEFAULTS(m.forma); setMesaModal(m); setMesaForm({forma:m.forma??"rect",tipo:m.tipo??"mesa",capacidad:m.capacidad??4,activa:m.activa,rotacion:m.rotacion??0,ancho:m.ancho||def.ancho,alto:m.alto||def.alto,zona:m.zona||""}); }} className="p-2 rounded-lg hover:bg-gray-100 transition"><Users className="w-4 h-4 text-gray-500"/></button>
                                                <button onClick={()=>toggleActiva(m._id)} className="p-2 rounded-lg hover:bg-gray-100 transition">{m.activa?<ToggleRight className="w-5 h-5 text-emerald-500"/>:<ToggleLeft className="w-5 h-5 text-gray-400"/>}</button>
                                                <button onClick={()=>eliminarMesa(m._id)} className="p-2 rounded-lg hover:bg-red-50 transition text-red-500"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Modal mesa */}
            {mesaModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="font-black text-gray-900 flex-1">{mesaForm.tipo==="banqueta"?"Banqueta":"Mesa"} {mesaModal.nombre}</h2>
                            <button onClick={()=>setMesaModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18}/></button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            {/* Tipo */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Tipo</label>
                                <div className="flex gap-2">
                                    {(["mesa","banqueta"] as const).map(t => (
                                        <button key={t} onClick={()=>setMesaForm(p=>({...p,tipo:t}))} className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition capitalize ${mesaForm.tipo===t?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Forma */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Forma</label>
                                <div className="flex gap-2">
                                    {(["rect","round","oval"] as const).map(f => (
                                        <button key={f} onClick={()=>{ const def=MESA_DEFAULTS(f); setMesaForm(p=>({...p,forma:f,ancho:def.ancho,alto:def.alto})); }} className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition ${mesaForm.forma===f?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                            {f==="rect"?<><Square size={11}/>Rect</>:f==="round"?<><Circle size={11}/>Redonda</>:<>⬭ Oval</>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Tamaño */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Tamaño</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["ancho","alto"] as const).map(dim => (
                                        <div key={dim} className="bg-gray-50 rounded-xl p-2.5">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{dim}</p>
                                            <div className="flex items-center justify-between gap-1">
                                                <button onClick={()=>setMesaForm(p=>({...p,[dim]:Math.max(1,+(p[dim]).toFixed(1)-0.5)}))} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"><Minus size={12}/></button>
                                                <span className="text-sm font-bold text-gray-900">{mesaForm[dim]}%</span>
                                                <button onClick={()=>setMesaForm(p=>({...p,[dim]:Math.min(30,+(p[dim]).toFixed(1)+0.5)}))} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"><Plus size={12}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Capacidad */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Capacidad</label>
                                <div className="flex gap-1.5">
                                    {[1,2,4,6,8,10].map(n => (
                                        <button key={n} onClick={()=>setMesaForm(p=>({...p,capacidad:n}))} className={`flex-1 py-2 rounded-xl border text-xs font-bold transition ${mesaForm.capacidad===n?"bg-red-600 text-white border-red-600":"bg-white text-gray-600 border-gray-200"}`}>{n}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Rotación (solo oval) */}
                            {mesaForm.forma==="oval" && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Rotación — {mesaForm.rotacion}°</label>
                                    <div className="flex items-center gap-1.5">
                                        {([-45,-15,0,15,45] as const).map(deg=>(
                                            <button key={deg} onClick={()=>setMesaForm(p=>({...p,rotacion:deg===0?0:((p.rotacion+deg)+360)%360}))} className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition text-gray-700">
                                                {deg>0?`+${deg}°`:deg===0?"0°":`${deg}°`}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex justify-center">
                                        <div style={{ width:56,height:26,borderRadius:"50%",background:"#10b981",border:"2px solid #059669",transform:`rotate(${mesaForm.rotacion}deg)`,transition:"transform 0.2s" }} />
                                    </div>
                                </div>
                            )}
                            {/* Zona */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Zona</label>
                                <input value={mesaForm.zona} onChange={e=>setMesaForm(p=>({...p,zona:e.target.value}))}
                                    placeholder="Ej: Adentro, Afuera, Living, Terraza..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                            </div>
                            {/* Activa */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                <span className="text-sm font-semibold text-gray-700">Activa</span>
                                <button onClick={()=>setMesaForm(p=>({...p,activa:!p.activa}))}>
                                    {mesaForm.activa?<ToggleRight className="w-8 h-8 text-emerald-500"/>:<ToggleLeft className="w-8 h-8 text-gray-400"/>}
                                </button>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
                            <button onClick={()=>setMesaModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={saveMesaConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal elemento */}
            {elModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-gray-900 flex-1">{EL_LABELS[elModal.tipo]}</h2>
                            <button onClick={()=>setElModal(null)} className="p-1 text-gray-400 hover:text-gray-700"><X size={18}/></button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {elModal.tipo!=="linea_h"&&elModal.tipo!=="linea_v" && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Etiqueta</label>
                                    <input value={elForm.label??""} onChange={e=>setElForm(p=>({...p,label:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                {(["ancho","alto"] as const).map(dim=>(
                                    <div key={dim}>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{dim==="ancho"?"Ancho (%)":"Alto (%)"}</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={()=>setElForm(p=>({...p,[dim]:Math.max(1,((p[dim] as number)??8)-1)}))}>
                                                <Minus size={14} className="text-gray-500"/>
                                            </button>
                                            <span className="text-sm font-bold w-8 text-center">{(elForm[dim] as number)??8}</span>
                                            <button onClick={()=>setElForm(p=>({...p,[dim]:Math.min(95,((p[dim] as number)??8)+1)}))}>
                                                <Plus size={14} className="text-gray-500"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {elModal.tipo!=="barra" && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {["#fef3c7","#fed7aa","#dbeafe","#dcfce7","#f3e8ff","#374151","#9ca3af","#ef4444"].map(c=>(
                                            <button key={c} onClick={()=>setElForm(p=>({...p,color:c}))} style={{backgroundColor:c}} className={`w-7 h-7 rounded-lg border-2 transition ${elForm.color===c?"border-gray-900 scale-110":"border-transparent hover:border-gray-400"}`}/>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                            <button onClick={()=>deleteEl(elModal._id)} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"><Trash2 size={15}/></button>
                            <button onClick={()=>setElModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
                            <button onClick={saveElConfig} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
