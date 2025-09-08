"use client";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Settings } from "lucide-react";

type Tx = {
  _id: string;
  source: "consumo" | "ajuste";
  amount: number;
  meta?: { consumoARS?: number };
  createdAt: string;
};

export default function PuntosPage() {
  const [items, setItems] = useState<Tx[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/puntos");
      const data = await res.json();
      setItems(data.items || []);
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
        Historial de Puntos
      </h1>

      {items.length === 0 ? (
        <div className="p-6 text-center opacity-70 bg-white/5 rounded-xl border border-white/10">
          Sin movimientos aún.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((tx) => {
            const Icon = tx.source === "consumo" ? UtensilsCrossed : Settings;

            return (
              <div
                key={tx._id}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-900/60 border border-white/10 hover:scale-[1.01] transition-all"
              >
                {/* Icono + info */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10 border border-white/10">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-base">
                      {tx.source === "consumo" ? "Consumo" : "Ajuste"}
                    </div>
                    <div className="text-sm opacity-70">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                    {tx.meta?.consumoARS !== undefined && (
                      <div className="text-sm opacity-80">
                        Consumo: ${tx.meta.consumoARS}
                      </div>
                    )}
                  </div>
                </div>

                {/* Monto */}
                <div
                  className={`text-xl font-extrabold ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
