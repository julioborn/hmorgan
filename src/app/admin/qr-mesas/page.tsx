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
    async function generateAndDownload() {
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

      // descargar ZIP automáticamente al terminar
      const zip = new JSZip();
      for (const { sector, numeros } of MESAS) {
        const carpeta = zip.folder(sector)!;
        for (const num of numeros) {
          if (result[num]) carpeta.file(`mesa-${num}.svg`, result[num]);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qr-mesas-hmorgan.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    }
    generateAndDownload();
  }, []);

  async function descargarZip() {
    setDescargando(true);
    try {
      const zip = new JSZip();
      for (const { sector, numeros } of MESAS) {
        const carpeta = zip.folder(sector)!;
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

  if (loading) return <div className="flex justify-center py-20"><Loader size={56} /></div>;
  if (!user || !["admin", "superadmin"].includes(user.role)) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-6 text-center">
      <h1 className="text-2xl font-black text-gray-900">QR de Mesas</h1>
      {generating ? (
        <>
          <Loader size={48} />
          <p className="text-gray-500 text-sm">Generando SVGs y preparando el ZIP…</p>
        </>
      ) : (
        <>
          <p className="text-gray-600 text-sm">El ZIP se descargó automáticamente.<br/>Si no, hacé clic en el botón.</p>
          <button
            onClick={descargarZip}
            disabled={descargando}
            className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-50"
          >
            {descargando ? "Generando ZIP…" : "Descargar ZIP de nuevo"}
          </button>
        </>
      )}
    </div>
  );
}
