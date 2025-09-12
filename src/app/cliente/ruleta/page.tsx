"use client";
import useSWR from "swr";
import { useState } from "react";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import Loader from "@/components/Loader"; // 👈 importá tu loader

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const Wheel = dynamic(
    () => import("react-custom-roulette").then((mod) => mod.Wheel),
    { ssr: false }
);

export default function RuletaPage() {
    const { data: items } = useSWR("/api/menu?roulette=1", fetcher);
    const [mustSpin, setMustSpin] = useState(false);
    const [prizeNumber, setPrizeNumber] = useState<number | null>(null);
    const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

    if (!items) {
        return (
            <div className="p-12 flex justify-center">
                <Loader size={40} /> {/* 👈 usa tu Loader */}
            </div>
        );
    }

    if (items.length === 0)
        return <p className="p-6">No hay cocktails en la ruleta.</p>;

    const maxItems = 15;
    const baseColors = ["#3b82f6", "#ef4444", "#22c55e", "#8b5cf6"];

    const data = items.slice(0, maxItems).map((i: any, index: number) => {
        let backgroundColor;
        let textColor = "#fff";

        if (winnerIndex !== null) {
            if (winnerIndex === index) {
                backgroundColor = "#10b981"; // emerald ganador
                textColor = "#fff";
            } else {
                backgroundColor = "#4b5563"; // gris apagado
            }
        } else {
            backgroundColor = baseColors[index % baseColors.length];
        }

        return {
            option: i.nombre.length > 20 ? i.nombre.slice(0, 20) + "…" : i.nombre,
            style: {
                backgroundColor,
                textColor,
                fontWeight: winnerIndex === index ? "bold" : "normal",
            },
        };
    });

    const handleSpin = () => {
        const newPrizeNumber = Math.floor(Math.random() * data.length);
        setPrizeNumber(newPrizeNumber);
        setMustSpin(true);
        setWinnerIndex(null);
    };

    const handleStop = () => {
        setMustSpin(false);

        if (prizeNumber !== null) {
            setWinnerIndex(prizeNumber);
            const ganador = data[prizeNumber].option;

            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
            });

            console.log("Ganador:", ganador);
        }
    };

    return (
        <div className="p-6 text-center space-y-6">
            <h1 className="text-3xl font-bold">Ruleta de Tragos</h1>

            <div className="flex justify-center">
                <div style={{ width: 450 }}>
                    <Wheel
                        mustStartSpinning={mustSpin}
                        prizeNumber={prizeNumber ?? 0}
                        data={data}
                        onStopSpinning={handleStop}
                        outerBorderWidth={6}
                        innerRadius={20}
                        radiusLineWidth={2}
                        fontSize={14}
                        perpendicularText={false}
                        pointerProps={{
                            style: { transform: "scale(0.6)" },
                        }}
                    />
                </div>
            </div>

            <button
                onClick={handleSpin}
                disabled={mustSpin}
                className="mt-6 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
                Girar
            </button>
        </div>
    );
}
