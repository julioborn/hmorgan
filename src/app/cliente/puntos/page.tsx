"use client";
import { useEffect, useState } from "react";

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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-extrabold">Historial de Puntos</h1>
      <div className="card divide-y divide-white/10">
        {items.map(tx => (
          <div key={tx._id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{tx.source === "consumo" ? "Consumo" : "Ajuste"}</div>
              <div className="text-sm opacity-70">{new Date(tx.createdAt).toLocaleString()}</div>
              {tx.meta?.consumoARS !== undefined && (
                <div className="text-sm opacity-80">Consumo: ${tx.meta.consumoARS}</div>
              )}
            </div>
            <div className={`text-lg font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {tx.amount >= 0 ? "+" : ""}{tx.amount}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-4 opacity-70">Sin movimientos aún.</div>}
      </div>
    </div>
  );
}
