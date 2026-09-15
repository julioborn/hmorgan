"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, ChevronDown, RotateCcw, X, Share2 } from "lucide-react";

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
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);
    const [generando, setGenerando] = useState(false);

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

    async function generarImagenNota() {
        setGenerando(true);
        try {
            const SCALE = 2;
            const W = 750;
            const PAD = 36;
            const filas = itemsSeleccionados;
            const ROW_H = 46;
            const TABLE_H = 42;
            const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

            // altura de notas (multilinea)
            const notaLines = notas ? notas.split("\n") : [];
            const NOTAS_H = notas ? 16 + 18 + notaLines.length * 20 + 16 : 0;
            const totalH = PAD + 38 + 30 + 12 + TABLE_H + filas.length * ROW_H + NOTAS_H + 24 + 80 + PAD;

            const canvas = document.createElement("canvas");
            canvas.width = W * SCALE;
            canvas.height = totalH * SCALE;
            const ctx = canvas.getContext("2d")!;
            ctx.scale(SCALE, SCALE);

            // fondo blanco
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, W, totalH);

            let y = PAD;

            // título
            ctx.fillStyle = "#000000";
            ctx.font = "bold 26px Arial";
            ctx.fillText("H. Morgan Bar", PAD, y + 26);
            y += 38;

            ctx.fillStyle = "#777777";
            ctx.font = "13px Arial";
            ctx.fillText(`Nota de pedido · ${fecha}`, PAD, y + 13);
            y += 30;

            // línea separadora
            ctx.strokeStyle = "#e5e7eb";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
            y += 12;

            // columnas: Producto | Categoría | Stock | Pedido
            const cW = W - PAD * 2; // 678
            const c0 = PAD;
            const c1 = PAD + Math.round(cW * 0.35); // ~273
            const c2 = PAD + Math.round(cW * 0.58); // ~429
            const c3 = PAD + Math.round(cW * 0.78); // ~564
            const cEnd = W - PAD;

            // encabezado tabla
            ctx.fillStyle = "#111111";
            ctx.fillRect(c0, y, cW, TABLE_H);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px Arial";
            const labels = ["PRODUCTO", "CATEGORÍA", "STOCK", "PEDIDO"];
            const cols = [c0 + 10, c1 + 8, c2 + 8, c3 + 8];
            labels.forEach((l, i) => ctx.fillText(l, cols[i], y + TABLE_H / 2 + 4));
            y += TABLE_H;

            // filas productos
            filas.forEach((prod, idx) => {
                if (idx % 2 === 1) {
                    ctx.fillStyle = "#f9fafb";
                    ctx.fillRect(c0, y, cW, ROW_H);
                }
                ctx.strokeStyle = "#e5e7eb";
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(c0, y + ROW_H); ctx.lineTo(cEnd, y + ROW_H); ctx.stroke();

                const midY = y + ROW_H / 2 + 4.5;
                ctx.fillStyle = "#111111";
                ctx.font = "13px Arial";
                // truncar texto si es muy largo
                const maxNombreW = c1 - c0 - 18;
                let nombre = prod.nombre;
                while (ctx.measureText(nombre).width > maxNombreW && nombre.length > 4)
                    nombre = nombre.slice(0, -1);
                if (nombre !== prod.nombre) nombre += "…";
                ctx.fillText(nombre, c0 + 10, midY);
                ctx.fillText(normCat(prod), c1 + 8, midY);
                ctx.fillText(`${formatNum(prod.stockActual)} ${prod.unidad}`, c2 + 8, midY);
                const cant = cantidades[prod._id] ? `${cantidades[prod._id]} ${prod.unidad}` : `___ ${prod.unidad}`;
                ctx.fillText(cant, c3 + 8, midY);
                y += ROW_H;
            });

            // notas
            if (notas) {
                y += 16;
                ctx.strokeStyle = "#111111";
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
                y += 16;
                ctx.fillStyle = "#111111";
                ctx.font = "bold 10px Arial";
                ctx.fillText("NOTAS", PAD, y + 10);
                y += 18;
                ctx.fillStyle = "#333333";
                ctx.font = "13px Arial";
                notaLines.forEach(line => { ctx.fillText(line || " ", PAD, y + 13); y += 20; });
            }

            // firma
            y += 24;
            const fw = Math.round((cW - 48) / 2);
            [[c0, "Solicitado por"], [c0 + fw + 48, "Proveedor"]].forEach(([x, label]) => {
                ctx.strokeStyle = "#aaaaaa"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(Number(x), y); ctx.lineTo(Number(x) + fw, y); ctx.stroke();
                ctx.fillStyle = "#777777"; ctx.font = "11px Arial";
                ctx.fillText(String(label), Number(x), y + 16);
            });

            const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/png"));
            if (imagenUrl) URL.revokeObjectURL(imagenUrl);
            setImagenUrl(URL.createObjectURL(blob));
        } finally {
            setGenerando(false);
        }
    }

    async function compartirImagen() {
        if (!imagenUrl) return;
        try {
            const blob = await fetch(imagenUrl).then(r => r.blob());
            const file = new File([blob], "nota-pedido.png", { type: "image/png" });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: "Nota de Pedido H. Morgan Bar" });
            } else {
                window.open(imagenUrl, "_blank");
            }
        } catch { /* usuario canceló */ }
    }

    function cerrarImagen() {
        if (imagenUrl) URL.revokeObjectURL(imagenUrl);
        setImagenUrl(null);
    }

    function imprimir() {
        localStorage.removeItem(DRAFT_KEY);
        setBorrador(null); setIsDirty(false);

        const win = window.open("", "_blank");
        if (win) {
            win.document.write(buildHtml(true));
            win.document.close();
        } else {
            // iOS PWA: genera imagen para guardar/compartir
            generarImagenNota();
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
                            const abierto = expandidos[key] === true;
                            const ids = items.map(i => i._id);
                            const selCount = ids.filter(id => seleccionados[id]).length;
                            const allSel = selCount === items.length && items.length > 0;

                            return (
                                <div key={key}>
                                    {/* Botón de categoría */}
                                    <button
                                        onClick={() => toggleExpandido(key)}
                                        className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 shadow-sm transition active:scale-[0.98] text-left
                                            ${abierto
                                                ? "bg-gray-900 border-gray-900 text-white"
                                                : "bg-white border-gray-100 text-gray-800"}`}>
                                        <input
                                            type="checkbox"
                                            checked={allSel}
                                            onClick={e => e.stopPropagation()}
                                            onChange={() => toggleGrupo(ids, allSel)}
                                            className="w-4 h-4 accent-gray-500 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-base leading-tight ${abierto ? "text-white" : tm.color}`}>
                                                {tm.emoji} {cat}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${abierto ? "text-gray-300" : "text-gray-400"}`}>
                                                {items.length} producto{items.length !== 1 ? "s" : ""}
                                                {selCount > 0 && ` · ${selCount} seleccionado${selCount !== 1 ? "s" : ""}`}
                                            </p>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 transition-transform duration-200 ${abierto ? "rotate-180 text-gray-300" : "text-gray-400"}`}
                                        />
                                    </button>

                                    {/* Productos expandidos */}
                                    {abierto && (
                                        <div className="mt-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            {items.map(prod => (
                                                <div key={prod._id}
                                                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${seleccionados[prod._id] ? "bg-gray-50" : ""}`}>
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

            {/* Overlay iOS PWA: imagen generada con canvas */}
            {(generando || imagenUrl) && (
                <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col">
                    {generando ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-white">
                                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-sm font-semibold">Generando imagen…</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto bg-gray-100">
                            <img src={imagenUrl!} alt="Nota de pedido" className="w-full block" />
                        </div>
                    )}
                    <div className="shrink-0 flex items-center gap-3 px-4 py-4 bg-white border-t border-gray-100">
                        <button onClick={cerrarImagen}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition flex-1">
                            <X size={16} /> Cerrar
                        </button>
                        {imagenUrl && (
                            <button onClick={compartirImagen}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold rounded-2xl transition flex-[2]">
                                <Share2 size={16} /> Compartir / Guardar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
