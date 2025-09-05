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

        // Revisar si ya tiene un canje igual en los últimos 30s (antiflood)
        const reciente = await Canje.findOne({
            userId: user._id,
            rewardId: reward._id,
            createdAt: { $gte: new Date(Date.now() - 30 * 1000) }
        });

        if (reciente) {
            return NextResponse.json({ message: "Este canje ya fue procesado recientemente" }, { status: 400 });
        }

        // Verificar puntos
        if ((user.puntos || 0) < reward.puntos) {
            return NextResponse.json({ message: "Puntos insuficientes" }, { status: 400 });
        }

        // Descontar puntos al usuario
        user.puntos = (user.puntos || 0) - reward.puntos;
        await user.save();

        // Crear registro de canje
        const canje = await Canje.create({
            userId: user._id,
            rewardId: reward._id,
            puntosGastados: reward.puntos,
            estado: "completado",
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
