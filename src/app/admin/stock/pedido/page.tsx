"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";

const DRAFT_KEY = "hmorgan_nota_pedido_draft";

type StockItem = {
    _id: string; nombre: string; tipo: string;
    categoria: string; unidad: string; stockActual: number; activo: boolean;
};

type Draft = {
    seleccionados: Record<string, boolean>;
    cantidades: Record<string, string>;
    notas: string;
    savedAt: number;
};

const normCat = (i: StockItem) => i.categoria || "Otros";

const formatHora = (ts: number) =>
    new Date(ts).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const formatNum = (n: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export default function NotaPedidoPage() {
    const router = useRouter();
    const [productos, setProductos] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [notas, setNotas] = useState("");
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
    const [borrador, setBorrador] = useState<Draft | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [printHtml, setPrintHtml] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const loadProductos = useCallback(() => {
        setLoading(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const activos = data.filter((p: StockItem) => p.activo !== false);
                    setProductos(activos);
                    try {
                        const raw = localStorage.getItem(DRAFT_KEY);
                        if (raw) setBorrador(JSON.parse(raw) as Draft);
                    } catch { /* ignore */ }
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadProductos(); }, [loadProductos]);

    // Auto-guardar borrador solo si el usuario hizo algún cambio
    useEffect(() => {
        if (!isDirty) return;
        const t = setTimeout(() => {
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ seleccionados, cantidades, notas, savedAt: Date.now() })); }
            catch { /* ignore */ }
        }, 600);
        return () => clearTimeout(t);
    }, [seleccionados, cantidades, notas, isDirty]);

    function restaurarBorrador() {
        if (!borrador) return;
        setSeleccionados(borrador.seleccionados ?? {});
        setCantidades(borrador.cantidades ?? {});
        setNotas(borrador.notas ?? "");
        setBorrador(null);
        setIsDirty(true);
    }

    function descartarBorrador() {
        localStorage.removeItem(DRAFT_KEY);
        setBorrador(null);
        setIsDirty(false);
    }

    const markDirty = () => { if (!isDirty) setIsDirty(true); };

    const toggleProducto = (id: string) => {
        markDirty();
        setSeleccionados(p => ({ ...p, [id]: !p[id] }));
    };

    const toggleGrupo = (ids: string[], allSel: boolean) => {
        markDirty();
        const next: Record<string, boolean> = { ...seleccionados };
        ids.forEach(id => { next[id] = !allSel; });
        setSeleccionados(next);
    };

    const toggleExpandido = (key: string) => setExpandidos(p => ({ ...p, [key]: !p[key] }));

    const setCant = (id: string, val: string) => { markDirty(); setCantidades(p => ({ ...p, [id]: val })); };
    const setNota = (v: string) => { markDirty(); setNotas(v); };

    // Agrupar: tipo → subcategoría
    const grupos: { key: string; tipo: string; cat: string; items: StockItem[] }[] = [];
    ["cocina", "bebida"].forEach(tipo => {
        const del = productos.filter(p => (p.tipo ?? "bebida").toLowerCase() === tipo);
        const cats: Record<string, StockItem[]> = {};
        del.forEach(p => { const c = normCat(p); if (!cats[c]) cats[c] = []; cats[c].push(p); });
        Object.entries(cats).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, items]) => {
            grupos.push({ key: `${tipo}-${cat}`, tipo, cat, items });
        });
    });

    const itemsSeleccionados = productos.filter(p => seleccionados[p._id]);
    const totalSeleccionados = itemsSeleccionados.length;

    function buildHtml(autoPrint: boolean) {
        const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const filas = itemsSeleccionados.map(p => {
            const cant = cantidades[p._id] ? `${cantidades[p._id]} ${p.unidad}` : `_____ ${p.unidad}`;
            return `<tr><td>${p.nombre}</td><td>${normCat(p)}</td><td style="text-align:right">${formatNum(p.stockActual)} ${p.unidad}</td><td style="text-align:center">${cant}</td></tr>`;
        }).join("");
        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Nota de Pedido</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
  h1 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
  .fecha { color: #666; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #111; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  th.right { text-align: right; } th.center { text-align: center; }
  td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .notas { margin-top: 28px; border-top: 2px solid #111; padding-top: 14px; }
  .notas-label { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .notas-text { font-size: 13px; color: #333; white-space: pre-wrap; }
  .firma { margin-top: 48px; display: flex; gap: 64px; }
  .firma-linea { flex: 1; }
  .firma-linea hr { border: none; border-top: 1px solid #aaa; margin-bottom: 6px; }
  .firma-linea p { font-size: 11px; color: #666; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <h1>H. Morgan Bar</h1>
  <p class="fecha">Nota de pedido · ${fecha}</p>
  <table>
    <thead><tr><th>Producto</th><th>Categoría</th><th class="right">Stock actual</th><th class="center">Cantidad pedida</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  ${notas ? `<div class="notas"><div class="notas-label">Notas</div><div class="notas-text">${notas}</div></div>` : ""}
  <div class="firma">
    <div class="firma-linea"><hr/><p>Solicitado por</p></div>
    <div class="firma-linea"><hr/><p>Proveedor</p></div>
  </div>
  ${autoPrint ? "<script>window.onload=()=>window.print();</script>" : ""}
</body>
</html>`;
    }

    function imprimir() {
        localStorage.removeItem(DRAFT_KEY);
        setBorrador(null); setIsDirty(false);

        // En browsers normales window.open abre una nueva pestaña
        const win = window.open("", "_blank");
        if (win) {
            win.document.write(buildHtml(true));
            win.document.close();
        } else {
            // iOS PWA no permite window.open → mostrar en overlay con iframe
            setPrintHtml(buildHtml(false));
        }
    }

    const TIPO_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
        cocina: { label: "Cocina", emoji: "🍳", color: "text-orange-700" },
        bebida: { label: "Bebida", emoji: "🍺", color: "text-blue-700" },
    };

    return (
        <div className="min-h-screen pb-32">
            <div className="px-4 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 py-5">
                    <button onClick={() => router.push("/admin/stock")}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-extrabold text-black">Nota de Pedido</h1>
                        {totalSeleccionados > 0 && <p className="text-xs text-gray-400 mt-0.5">{totalSeleccionados} producto{totalSeleccionados !== 1 ? "s" : ""} seleccionado{totalSeleccionados !== 1 ? "s" : ""}</p>}
                    </div>
                </div>

                {/* Banner borrador */}
                {borrador && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                        <RotateCcw size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-amber-800">Hay un borrador guardado</p>
                            <p className="text-xs text-amber-600 mt-0.5">Guardado el {formatHora(borrador.savedAt)}</p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={restaurarBorrador}
                                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition">
                                    Restaurar borrador
                                </button>
                                <button onClick={descartarBorrador}
                                    className="flex-1 py-1.5 bg-white border border-amber-300 text-amber-700 text-xs font-bold rounded-lg transition hover:bg-amber-50">
                                    Descartar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notas */}
                <div className="mb-4">
                    <textarea value={notas} onChange={e => setNota(e.target.value)} rows={2}
                        placeholder="Notas del pedido (opcional)…"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none bg-white" />
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {grupos.map(({ key, tipo, cat, items }) => {
                            const tm = TIPO_LABEL[tipo] ?? { label: tipo, emoji: "", color: "text-gray-700" };
                            const abierto = expandidos[key] !== false;
                            const ids = items.map(i => i._id);
                            const selCount = ids.filter(id => seleccionados[id]).length;
                            const allSel = selCount === items.length && items.length > 0;

                            return (
                                <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Cabecera grupo */}
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <input type="checkbox" checked={allSel} onChange={() => toggleGrupo(ids, allSel)}
                                            className="w-4 h-4 accent-gray-700 shrink-0" />
                                        <button onClick={() => toggleExpandido(key)} className="flex-1 text-left flex items-center gap-2">
                                            <span className={`text-sm font-black ${tm.color}`}>{tm.emoji} {cat}</span>
                                            <span className="text-xs text-gray-400">{selCount}/{items.length}</span>
                                        </button>
                                        <button onClick={() => toggleExpandido(key)} className="text-gray-400 hover:text-gray-700 transition">
                                            {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>

                                    {/* Productos */}
                                    {abierto && (
                                        <div className="border-t border-gray-50">
                                            {items.map(prod => (
                                                <div key={prod._id}
                                                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 ${seleccionados[prod._id] ? "bg-gray-50" : ""}`}>
                                                    <input type="checkbox" checked={!!seleccionados[prod._id]} onChange={() => toggleProducto(prod._id)}
                                                        className="w-4 h-4 accent-gray-700 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-800 font-medium truncate">{prod.nombre}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            Stock: <span className="font-bold text-gray-600">{formatNum(prod.stockActual)}</span> {prod.unidad}
                                                        </p>
                                                    </div>
                                                    {seleccionados[prod._id] && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <input
                                                                type="number" min="0" step="any" inputMode="decimal"
                                                                value={cantidades[prod._id] ?? ""}
                                                                onChange={e => setCant(prod._id, e.target.value)}
                                                                placeholder="Cant."
                                                                className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                            />
                                                            <span className="text-xs text-gray-400 w-12 truncate">{prod.unidad}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Botón fijo */}
            {totalSeleccionados > 0 && (
                <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white/90 backdrop-blur border-t border-gray-100">
                    <button onClick={imprimir}
                        className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 py-4 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl font-bold text-sm transition">
                        <Printer size={18} /> Generar PDF ({totalSeleccionados} producto{totalSeleccionados !== 1 ? "s" : ""})
                    </button>
                </div>
            )}

            {/* Overlay iOS PWA: muestra la nota en iframe cuando window.open falla */}
            {printHtml && (
                <>
                    {/* CSS de impresión: oculta todo excepto el iframe */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            body * { visibility: hidden !important; }
                            #nota-pedido-iframe, #nota-pedido-iframe * { visibility: visible !important; }
                            #nota-pedido-iframe { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important; }
                        }
                    `}} />
                    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                        {/* Contenido del iframe — ocupa todo el espacio */}
                        <iframe
                            id="nota-pedido-iframe"
                            ref={iframeRef}
                            srcDoc={printHtml}
                            className="flex-1 w-full border-0"
                            title="Nota de Pedido"
                        />
                        {/* Barra de acciones al fondo — más accesible en iPhone */}
                        <div className="shrink-0 flex items-center gap-3 px-4 py-4 bg-white border-t border-gray-100 pb-safe">
                            <button onClick={() => setPrintHtml(null)}
                                className="flex items-center justify-center gap-1.5 px-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition flex-1">
                                <X size={16} /> Cerrar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold rounded-2xl transition flex-[2]">
                                <Printer size={16} /> Imprimir / Guardar PDF
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
