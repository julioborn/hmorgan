// src/app/api/canjes/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";
import { Canje } from "@/models/Canje";
import { User } from "@/models/User";

export async function POST(req: Request) {
    try {
        await connectMongoDB();
        const { rewardId, qrToken } = await req.json();

        if (!rewardId || !qrToken) {
            return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
        }

        // Buscar usuario por qrToken
        const user = await User.findOne({ qrToken });
        if (!user) {
            return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
        }

        // Buscar recompensa
        const reward = await Reward.findById(rewardId);
        if (!reward) {
            return NextResponse.json({ message: "Recompensa no encontrada" }, { status: 404 });
        }

        // Aseguramos números
        const userPoints = Number(user.puntos ?? 0);
        const rewardPoints = Number(reward.puntos ?? 0);

        console.log("DEBUG canje:", {
            usuario: user.nombre,
            userPoints,
            reward: reward.titulo,
            rewardPoints,
        });

        // Verificar puntos
        if (userPoints < rewardPoints) {
            return NextResponse.json(
                { message: `Puntos insuficientes. Tenés ${userPoints}, necesitas ${rewardPoints}` },
                { status: 400 }
            );
        }

        // Descontar puntos al usuario
        user.puntos = userPoints - rewardPoints;
        await user.save();

        // Crear registro de canje
        const canje = await Canje.create({
            userId: user._id,
            rewardId: reward._id,
            estado: "aprobado",
        });

        return NextResponse.json({ ok: true, canje });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

export async function GET() {
    await connectMongoDB();
    const canjes = await Canje.find()
        .populate("userId", "nombre apellido dni puntos")
        .populate("rewardId", "titulo puntos")
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json(canjes);
}