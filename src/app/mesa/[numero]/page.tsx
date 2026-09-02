"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { QrCode, Users, CheckCircle, AlertCircle } from "lucide-react";
import Loader from "@/components/Loader";
import Link from "next/link";

type MesaInfo = { _id: string; nombre: string; zona?: string; capacidad?: number };
type ComandaInfo = { _id: string; mesa: string; estado: string; comensales: number; comensalesIds: string[] };

export default function MesaLandingPage() {
  const { numero } = useParams<{ numero: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mesa, setMesa] = useState<MesaInfo | null>(null);
  const [comanda, setComanda] = useState<ComandaInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!numero) return;
    fetch(`/api/mesa/${encodeURIComponent(numero)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setMesa(d.mesa);
        setComanda(d.comanda);
      })
      .catch(() => setError("No se pudo cargar la mesa"))
      .finally(() => setFetching(false));
  }, [numero]);

  async function handleUnirse() {
    if (!user) { router.push(`/login?redirect=/mesa/${numero}`); return; }
    setJoining(true);
    setError("");
    try {
      const r = await fetch(`/api/mesa/${encodeURIComponent(numero)}/unirse`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "No se pudo unir"); return; }
      setJoined(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("Error de conexión");
    } finally {
      setJoining(false);
    }
  }

  if (fetching || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size={56} />
      </div>
    );
  }

  if (error && !mesa) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-500" />
        <p className="font-bold text-gray-800">{error}</p>
        <Link href="/" className="inline-block bg-gray-900 text-white font-bold px-6 py-3 rounded-xl">
          Ir al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <QrCode size={32} className="text-white" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">H. Morgan Bar</p>
        <h1 className="text-4xl font-black text-gray-900">Mesa {numero}</h1>
        {mesa?.zona && <p className="text-sm text-gray-500">{mesa.zona}</p>}
      </div>

      {/* Estado comanda */}
      <div className={`rounded-2xl px-5 py-4 text-center border-2 ${
        comanda
          ? "bg-green-50 border-green-200"
          : "bg-gray-50 border-gray-200"
      }`}>
        {comanda ? (
          <>
            <p className="font-black text-green-700 text-sm uppercase tracking-wide">Comanda abierta</p>
            {(comanda.comensalesIds?.length ?? 0) > 0 && (
              <p className="text-green-600 text-xs mt-1 flex items-center justify-center gap-1">
                <Users size={12} />
                {comanda.comensalesIds.length} {comanda.comensalesIds.length === 1 ? "comensal" : "comensales"} vinculados
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">Sin comanda abierta en este momento</p>
        )}
      </div>

      {/* Acción principal */}
      {joined ? (
        <div className="bg-green-500 text-white rounded-2xl px-5 py-5 text-center space-y-2">
          <CheckCircle size={32} className="mx-auto" />
          <p className="font-black text-lg">¡Listo! Estás en la mesa</p>
          <p className="text-green-100 text-sm">Tus puntos se acreditarán automáticamente.</p>
        </div>
      ) : comanda ? (
        <div className="space-y-3">
          <button
            onClick={handleUnirse}
            disabled={joining}
            className="w-full bg-black text-white font-black py-5 rounded-2xl text-base transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {joining ? (
              <span className="flex items-center gap-2"><Loader size={20} /> Uniéndote...</span>
            ) : user ? (
              "Unirme a esta mesa"
            ) : (
              "Iniciá sesión para unirte"
            )}
          </button>
          {!user && (
            <p className="text-center text-xs text-gray-400">
              Al unirte ganás puntos por los pedidos de la mesa
            </p>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-gray-600 text-sm leading-relaxed">
            Cuando el mozo abra tu comanda, podés unirte para ganar puntos automáticamente por todo lo que pedís.
          </p>
          <Link href="/" className="block bg-gray-900 text-white font-black py-4 rounded-2xl text-base">
            Abrir la app
          </Link>
        </div>
      )}

      {/* Explainer */}
      {!joined && (
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">
            Escaneá el QR en cada visita para acumular puntos y canjearlos por premios.
          </p>
        </div>
      )}
    </div>
  );
}
