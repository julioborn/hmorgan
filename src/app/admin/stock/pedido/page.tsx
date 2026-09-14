"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, ChevronDown, ChevronUp } from "lucide-react";

type StockItem = {
    _id: string; nombre: string; tipo: string;
    categoria: string; unidad: string; stockActual: number; activo: boolean;
};

const normCat = (i: StockItem) => i.categoria || "Otros";

export default function NotaPedidoPage() {
    const router = useRouter();
    const [productos, setProductos] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [notas, setNotas] = useState("");
    const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

    const loadProductos = useCallback(() => {
        setLoading(true);
        fetch("/api/superadmin/stock", { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const activos = data.filter((p: StockItem) => p.activo !== false);
                    setProductos(activos);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadProductos(); }, [loadProductos]);

    const toggleProducto = (id: string) => {
        setSeleccionados(p => ({ ...p, [id]: !p[id] }));
        if (!cantidades[id]) setCantidades(p => ({ ...p, [id]: "" }));
    };

    const toggleGrupo = (key: string, ids: string[]) => {
        const allSelected = ids.every(id => seleccionados[id]);
        const next: Record<string, boolean> = { ...seleccionados };
        ids.forEach(id => { next[id] = !allSelected; });
        setSeleccionados(next);
    };

    const toggleExpandido = (key: string) => setExpandidos(p => ({ ...p, [key]: !p[key] }));

    // Agrupar: tipo → subcategoría
    const grupos: { key: string; tipo: string; cat: string; items: StockItem[] }[] = [];
    const tipoOrder = ["cocina", "bebida"];
    tipoOrder.forEach(tipo => {
        const del = productos.filter(p => (p.tipo ?? "bebida").toLowerCase() === tipo);
        const cats: Record<string, StockItem[]> = {};
        del.forEach(p => { const c = normCat(p); if (!cats[c]) cats[c] = []; cats[c].push(p); });
        Object.entries(cats).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, items]) => {
            grupos.push({ key: `${tipo}-${cat}`, tipo, cat, items });
        });
    });

    const itemsSeleccionados = productos.filter(p => seleccionados[p._id]);
    const totalSeleccionados = itemsSeleccionados.length;

    function imprimir() {
        const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const filas = itemsSeleccionados.map(p => {
            const cant = cantidades[p._id] ? `${cantidades[p._id]} ${p.unidad}` : `_____ ${p.unidad}`;
            return `<tr><td>${p.nombre}</td><td>${normCat(p)}</td><td style="text-align:center">${cant}</td></tr>`;
        }).join("");

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Nota de Pedido</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
  h1 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
  .fecha { color: #666; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #111; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  th:last-child { text-align: center; width: 140px; }
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
    <thead><tr><th>Producto</th><th>Categoría</th><th>Cantidad pedida</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  ${notas ? `<div class="notas"><div class="notas-label">Notas</div><div class="notas-text">${notas}</div></div>` : ""}
  <div class="firma">
    <div class="firma-linea"><hr/><p>Solicitado por</p></div>
    <div class="firma-linea"><hr/><p>Proveedor</p></div>
  </div>
  <script>window.onload=()=>window.print();</script>
</body>
</html>`;

        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); }
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

                {/* Notas opcionales */}
                <div className="mb-4">
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
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
                            const abierto = expandidos[key] !== false; // abierto por defecto
                            const selCount = items.filter(i => seleccionados[i._id]).length;
                            const allSel = selCount === items.length;
                            const ids = items.map(i => i._id);

                            return (
                                <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Cabecera del grupo */}
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        <input type="checkbox" checked={allSel} onChange={() => toggleGrupo(key, ids)}
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
                                                <div key={prod._id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 ${seleccionados[prod._id] ? "bg-gray-50" : ""}`}>
                                                    <input type="checkbox" checked={!!seleccionados[prod._id]} onChange={() => toggleProducto(prod._id)}
                                                        className="w-4 h-4 accent-gray-700 shrink-0" />
                                                    <p className="flex-1 text-sm text-gray-800 font-medium truncate">{prod.nombre}</p>
                                                    {seleccionados[prod._id] && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <input
                                                                type="number" min="0" step="any" inputMode="decimal"
                                                                value={cantidades[prod._id] ?? ""}
                                                                onChange={e => setCantidades(p => ({ ...p, [prod._id]: e.target.value }))}
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

            {/* Botón fijo al pie */}
            {totalSeleccionados > 0 && (
                <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white/90 backdrop-blur border-t border-gray-100">
                    <button onClick={imprimir}
                        className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 py-4 bg-gray-900 hover:bg-gray-700 text-white rounded-2xl font-bold text-sm transition">
                        <Printer size={18} /> Generar PDF ({totalSeleccionados} producto{totalSeleccionados !== 1 ? "s" : ""})
                    </button>
                </div>
            )}
        </div>
    );
}
