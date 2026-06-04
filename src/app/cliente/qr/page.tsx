"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/auth-context";
import { registerSW, subscribeUser } from "@/lib/push-client";
import Loader from "@/components/Loader";
import { swalBase } from "@/lib/swalConfig";
import { UtensilsCrossed, Settings, Gift, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

type Tx = {
    _id: string;
    source: "consumo" | "ajuste";
    amount: number;
    notes?: string;
    meta?: { consumoARS?: number; mesa?: string; share?: number };
    createdAt: string;
};
type Canje = {
    _id: string;
    rewardId: { titulo: string; descripcion?: string; puntos: number };
    puntosGastados: number;
    estado: string;
    createdAt: string;
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function MiQRPage() {
    const { user } = useAuth();
    const [png, setPng] = useState<string>("");

    // historial
    const [tab, setTab] = useState<"puntos" | "canjes">("puntos");
    const [items, setItems] = useState<Tx[]>([]);
    const [canjes, setCanjes] = useState<Canje[]>([]);
    const [loadingPuntos, setLoadingPuntos] = useState(true);
    const [loadingCanjes, setLoadingCanjes] = useState(true);
    const [page, setPage] = useState(1);
    const [pageCanjes, setPageCanjes] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const pageSize = 6;

    useEffect(() => {
        if (!user?.qrToken) return;
        (async () => {
            const payload = JSON.stringify({ qrToken: user.qrToken });
            const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
            setPng(dataUrl);
        })();
    }, [user?.qrToken]);

    useEffect(() => {
        fetch("/api/puntos", { cache: "no-store" })
            .then(r => r.json()).then(d => setItems(d.items || [])).catch(() => setItems([])).finally(() => setLoadingPuntos(false));
        fetch("/api/canjes", { cache: "no-store" })
            .then(r => r.json()).then(d => setCanjes(Array.isArray(d) ? d : [])).catch(() => setCanjes([])).finally(() => setLoadingCanjes(false));
    }, []);

    async function handleEnableNotifications() {
        try {
            const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any).standalone;
            if (!isStandalone) { swalBase.fire("ℹ️", "Instalá la app (Añadir a inicio) para recibir notificaciones.", "info"); return; }
            if (!("serviceWorker" in navigator && "PushManager" in window)) { swalBase.fire("❌", "Este dispositivo no soporta notificaciones push.", "error"); return; }
            const perm = await Notification.requestPermission();
            if (perm !== "granted") return;
            const reg = await registerSW();
            if (!reg) { swalBase.fire("❌", "No se pudo registrar el Service Worker.", "error"); return; }
            const sub = await subscribeUser(reg);
            if (!sub) { swalBase.fire("❌", "No se pudo crear la suscripción.", "error"); return; }
            swalBase.fire("✅ Listo", "Las notificaciones fueron activadas.", "success");
        } catch (e: any) {
            swalBase.fire("❌ Error", e?.message || "Falló la activación", "error");
        }
    }

    if (!user) return <div className="py-20 flex justify-center"><Loader size={40} /></div>;

    const pagedItems  = items.slice((page - 1) * pageSize, page * pageSize);
    const totalPages  = Math.max(1, Math.ceil(items.length / pageSize));
    const pagedCanjes = canjes.slice((pageCanjes - 1) * pageSize, pageCanjes * pageSize);
    const totalPagesC = Math.max(1, Math.ceil(canjes.length / pageSize));

    return (
        <div className="max-w-xl mx-auto p-4 space-y-4 bg-white min-h-screen pb-20">
            {/* QR card */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-md">
                <div className="p-5 border-b border-gray-200">
                    <h1 className="text-3xl font-extrabold text-center text-black">Mi QR</h1>
                </div>
                <div className="p-6 grid place-items-center bg-gray-50">
                    {png ? <img src={png} alt="Mi QR" className="rounded-xl shadow-lg border border-gray-200" /> : <Loader size={48} />}
                </div>
                <div className="p-5 bg-white border-t border-gray-200 text-center">
                    <div className="text-4xl font-extrabold text-black">
                        {user.puntos ?? 0}
                        <span className="ml-1 text-red-600 text-2xl font-bold">pts</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">puntos acumulados</p>
                </div>
            </div>

            {/* Historial inline */}
            <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
                <div className="px-5 py-3 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Historial</h2>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {(["puntos", "canjes"] as const).map(t => (
                        <button key={t} onClick={() => { setTab(t); setPage(1); setPageCanjes(1); }}
                            className={`flex-1 py-2.5 text-sm font-semibold transition capitalize ${tab === t ? "border-b-2 border-red-600 text-red-600" : "text-gray-500 hover:text-gray-700"}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Puntos */}
                {tab === "puntos" && (
                    loadingPuntos ? <div className="py-10 flex justify-center"><Loader size={32} /></div>
                    : items.length === 0 ? <p className="py-8 text-center text-gray-400 text-sm">Sin movimientos aún.</p>
                    : (
                        <div>
                            {pagedItems.map(tx => {
                                const Icon = tx.source === "consumo" ? UtensilsCrossed : Settings;
                                const isOpen = expandedId === tx._id;
                                const hasDetail = !!(tx.meta?.consumoARS !== undefined || tx.notes);
                                return (
                                    <div key={tx._id} className="border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3 px-5 py-3">
                                            <Icon className="w-5 h-5 text-red-600 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 text-sm">{tx.source === "consumo" ? "Consumo" : "Ajuste"}</p>
                                                <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                                            </div>
                                            <span className="text-base font-extrabold text-red-600 shrink-0">{tx.amount >= 0 ? "+" : ""}{tx.amount} pts</span>
                                            {hasDetail && (
                                                <button onClick={() => setExpandedId(isOpen ? null : tx._id)} className="text-gray-400 hover:text-red-600 p-1">
                                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            )}
                                        </div>
                                        {isOpen && hasDetail && (
                                            <div className="px-5 pb-3 text-xs text-gray-500 space-y-0.5 bg-gray-50">
                                                {tx.meta?.consumoARS !== undefined && <p>Consumo: ${tx.meta.consumoARS.toLocaleString("es-AR")}</p>}
                                                {tx.notes && <p>{tx.notes}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-gray-100">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-gray-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                                    <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 text-gray-400 disabled:opacity-30"><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* Canjes */}
                {tab === "canjes" && (
                    loadingCanjes ? <div className="py-10 flex justify-center"><Loader size={32} /></div>
                    : canjes.length === 0 ? <p className="py-8 text-center text-gray-400 text-sm">Sin canjes aún.</p>
                    : (
                        <div>
                            {pagedCanjes.map(c => (
                                <div key={c._id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                                    <Gift className="w-5 h-5 text-red-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{c.rewardId?.titulo}</p>
                                        <p className="text-xs text-gray-400">{formatDate(c.createdAt)} · {c.estado}</p>
                                    </div>
                                    <span className="text-sm font-bold text-red-600 shrink-0">−{c.puntosGastados} pts</span>
                                </div>
                            ))}
                            {totalPagesC > 1 && (
                                <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-gray-100">
                                    <button onClick={() => setPageCanjes(p => Math.max(1, p - 1))} disabled={pageCanjes === 1} className="p-1 text-gray-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                                    <span className="text-xs text-gray-500">{pageCanjes} / {totalPagesC}</span>
                                    <button onClick={() => setPageCanjes(p => Math.min(totalPagesC, p + 1))} disabled={pageCanjes === totalPagesC} className="p-1 text-gray-400 disabled:opacity-30"><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
