"use client";
import useSWR from "swr";
import { useState } from "react";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import Loader from "@/components/Loader";

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
                <Loader size={40} />
            </div>
        );
    }

    if (items.length === 0)
        return (
            <p className="p-6 text-center text-gray-600">
                No hay cocktails en la ruleta.
            </p>
        );

    const maxItems = 15;
    const rojoBase = "#dc2626"; // 🔴 rojo principal Morgan

    const getFontSize = (text: string) => {
        if (text.length > 18) return 10;
        if (text.length > 12) return 12;
        return 16;
    };

    const data = items.slice(0, maxItems).map((i: any, index: number) => {
        let backgroundColor = rojoBase;
        let textColor = "#fff";

        // Si ya hay ganador, se apaga el resto
        if (winnerIndex !== null) {
            backgroundColor = winnerIndex === index ? rojoBase : "#e5e7eb"; // gris claro para el resto
            textColor = winnerIndex === index ? "#fff" : "#9ca3af"; // texto gris en apagados
        }

        const text =
            i.nombre.length > 20 ? i.nombre.slice(0, 20) + "…" : i.nombre;

        return {
            option: text,
            style: {
                backgroundColor,
                textColor,
                fontWeight: winnerIndex === index ? "bold" : "normal",
                fontSize: getFontSize(text),
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
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#dc2626", "#f87171", "#ffffff"],
            });

            console.log("Ganador:", ganador);
        }
    };

    return (
        <div className="p-6 text-center space-y-6 bg-white min-h-screen">
            <h1 className="text-4xl font-extrabold mb-10 text-center text-black">
                Ruleta de <span className="text-red-600">Tragos</span>
            </h1>

            <div className="flex justify-center">
                <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl aspect-square flex items-center justify-center">
                    <Wheel
                        mustStartSpinning={mustSpin}
                        prizeNumber={prizeNumber ?? 0}
                        data={data}
                        onStopSpinning={handleStop}
                        outerBorderWidth={6}
                        innerRadius={20}
                        radiusLineWidth={2}
                        perpendicularText={false}
                        pointerProps={{
                            style: { transform: "scale(0.7)" },
                        }}
                    />
                </div>
            </div>

            <button
                onClick={handleSpin}
                disabled={mustSpin}
                className="mt-6 px-8 py-3 rounded-xl bg-red-600 text-white font-semibold text-lg shadow-md hover:bg-red-500 disabled:opacity-50 transition"
            >
                {mustSpin ? "Girando..." : "Girar"}
            </button>

        </div>
    );
}
