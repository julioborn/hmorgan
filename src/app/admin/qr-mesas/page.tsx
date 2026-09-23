"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import QRCode from "qrcode";
import JSZip from "jszip";

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
  const [qrSvgs, setQrSvgs] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(true);
  const [descargando, setDescargando] = useState(false);

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
          const svg = await QRCode.toString(url, {
            type: "svg",
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          result[num] = svg;
        }
      }
      setQrSvgs(result);
      setGenerating(false);
    }
    generateAll();
  }, []);

  async function descargarZip() {
    setDescargando(true);
    try {
      const zip = new JSZip();
      for (const { sector, numeros } of MESAS) {
        const nombreCarpeta = sector.replace(/[/\\:*?"<>|]/g, "-");
        const carpeta = zip.folder(nombreCarpeta)!;
        for (const num of numeros) {
          if (qrSvgs[num]) carpeta.file(`mesa-${num}.svg`, qrSvgs[num]);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qr-mesas-hmorgan.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDescargando(false);
    }
  }

  async function descargarDxfZip() {
    setDescargando(true);
    try {
      const zip = new JSZip();
      for (const { sector, numeros } of MESAS) {
        const nombreCarpeta = sector.replace(/[/\\:*?"<>|]/g, "-");
        const carpeta = zip.folder(nombreCarpeta)!;
        for (const num of numeros) {
          const url = `${BASE_URL}/mesa/${num}`;
          const qr = (QRCode as any).create(url, { errorCorrectionLevel: "M" });
          const { data, size } = qr.modules as { data: Uint8Array; size: number };
          const mm = 1;     // 1mm por módulo
          const margin = 4; // zona silenciosa de 4 módulos

          let dxf =
            "0\nSECTION\n2\nHEADER\n" +
            "9\n$ACADVER\n1\nAC1009\n" +
            "9\n$INSUNITS\n70\n4\n" +
            "0\nENDSEC\n" +
            // Capa "ENGRAVE" con color 1 (rojo) — visible en cualquier software de láser
            "0\nSECTION\n2\nTABLES\n" +
            "0\nTABLE\n2\nLAYER\n70\n1\n" +
            "0\nLAYER\n2\nENGRAVE\n70\n0\n62\n1\n6\nCONTINUOUS\n" +
            "0\nENDTAB\n" +
            "0\nENDSEC\n" +
            "0\nSECTION\n2\nENTITIES\n";

          for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
              if (data[row * size + col]) {
                const x1 = (col + margin) * mm;
                const y1 = (size - row - 1 + margin) * mm;
                const x2 = x1 + mm;
                const y2 = y1 + mm;
                // SOLID en capa ENGRAVE con color 1 (rojo — siempre visible en láser)
                dxf +=
                  `0\nSOLID\n8\nENGRAVE\n62\n1\n` +
                  `10\n${x1}\n20\n${y1}\n30\n0.0\n` +
                  `11\n${x2}\n21\n${y1}\n31\n0.0\n` +
                  `12\n${x1}\n22\n${y2}\n32\n0.0\n` +
                  `13\n${x2}\n23\n${y2}\n33\n0.0\n`;
              }
            }
          }

          dxf += "0\nENDSEC\n0\nEOF\n";
          carpeta.file(`mesa-${num}.dxf`, dxf);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qr-mesas-hmorgan-dxf.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDescargando(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader size={56} /></div>;
  if (!user || !["admin", "superadmin"].includes(user.role)) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">QR de Mesas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{MESAS.reduce((t, s) => t + s.numeros.length, 0)} mesas · {MESAS.length} sectores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarZip}
            disabled={generating || descargando}
            className="bg-gray-200 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-300 transition disabled:opacity-50"
          >
            {descargando ? "…" : "SVG (.zip)"}
          </button>
          <button
            onClick={descargarDxfZip}
            disabled={generating || descargando}
            className="bg-gray-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {descargando ? "Generando…" : "DXF para láser (.zip)"}
          </button>
        </div>
      </div>

      {generating && (
        <div className="flex items-center gap-3 text-gray-500">
          <Loader size={22} />
          <span className="text-sm">Generando QR codes…</span>
        </div>
      )}

      <div className="space-y-8">
        {MESAS.map(({ sector, numeros }) => (
          <div key={sector}>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">{sector}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {numeros.map(num => (
                <div key={num} className="flex flex-col items-center bg-white border border-gray-200 rounded-2xl p-3 gap-2 shadow-sm">
                  {qrSvgs[num] ? (
                    <div dangerouslySetInnerHTML={{ __html: qrSvgs[num] }} className="w-full max-w-[120px]" />
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
    </div>
  );
}
