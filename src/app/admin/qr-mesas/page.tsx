"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import QRCode from "qrcode";

const BASE_URL = "https://hmorgan.vercel.app";

const MESAS: { sector: string; numeros: string[] }[] = [
  { sector: "Barra / Banquetas", numeros: ["1", "2", "3", "4", "5"] },
  { sector: "Sector 1",          numeros: ["110","111","112","113","120","121","122","123","130","131","132","133"] },
  { sector: "Sector 2",          numeros: ["210","211","212","213","214","215","220","221"] },
  { sector: "Sector 3",          numeros: ["310","311","312","320","321","322","330","331","332"] },
  { sector: "Sector 4",          numeros: ["401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","418","419","420","421","422","423","424","425","426","427","428"] },
  { sector: "Sector 5",          numeros: ["500","501","502","503","504","505","506","507"] },
];

export default function QrMesasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(true);
  const [filtroSector, setFiltroSector] = useState<string>("Todos");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user && !["admin", "superadmin"].includes(user.role)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function generateAll() {
      const result: Record<string, string> = {};
      for (const { numeros } of MESAS) {
        for (const num of numeros) {
          const url = `${BASE_URL}/mesa/${num}`;
          result[num] = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        }
      }
      setQrDataUrls(result);
      setGenerating(false);
    }
    generateAll();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader size={56} /></div>;
  if (!user || !["admin", "superadmin"].includes(user.role)) return null;

  const sectoresVisibles = filtroSector === "Todos" ? MESAS : MESAS.filter(s => s.sector === filtroSector);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">QR de Mesas</h1>
          <p className="text-sm text-gray-400 mt-0.5">70 mesas · imprimí y pegá en cada mesa</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-gray-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-700 transition"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Filtro por sector */}
      <div className="flex flex-wrap gap-2">
        {["Todos", ...MESAS.map(s => s.sector)].map(s => (
          <button
            key={s}
            onClick={() => setFiltroSector(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filtroSector === s
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {generating && (
        <div className="flex items-center gap-3 text-gray-500">
          <Loader size={24} />
          <span className="text-sm">Generando QR codes…</span>
        </div>
      )}

      <div ref={printRef} className="space-y-8">
        {sectoresVisibles.map(({ sector, numeros }) => (
          <div key={sector}>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3">{sector}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {numeros.map(num => (
                <div key={num} className="flex flex-col items-center bg-white border border-gray-200 rounded-2xl p-3 gap-2 print:break-inside-avoid shadow-sm">
                  {qrDataUrls[num] ? (
                    <img src={qrDataUrls[num]} alt={`QR Mesa ${num}`} className="w-full max-w-[120px]" />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center">
                      <Loader size={20} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-black text-base text-gray-900">Mesa {num}</p>
                    <p className="text-[10px] text-gray-400">H. Morgan Bar</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
