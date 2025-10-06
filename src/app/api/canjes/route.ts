// src/app/api/canjes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";
import { Canje } from "@/models/Canje";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic"; // 👈 evita cacheo ISR

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// ✅ GET → listar canjes del usuario
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

        await connectMongoDB();

        const canjes = await Canje.find({ userId: payload.sub })
            .populate("rewardId", "titulo descripcion puntos")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(canjes);
    } catch (error) {
        console.error("Error en GET /api/canjes:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}

// ✅ POST → registrar un nuevo canje
export async function POST(req: NextRequest) {
    try {
        const { rewardId, qrToken } = await req.json();

        if (!rewardId || !qrToken)
            return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });

        await connectMongoDB();

        // Buscar usuario por token del QR (no el logueado)
        const user = await User.findOne({ qrToken });
        if (!user)
            return NextResponse.json({ message: "Usuario no encontrado para este QR" }, { status: 404 });

        // Buscar recompensa
        const reward = await Reward.findById(rewardId);
        if (!reward)
            return NextResponse.json({ message: "Recompensa no encontrada" }, { status: 404 });

        // Anti flood
        const reciente = await Canje.findOne({
            userId: user._id,
            rewardId: reward._id,
            createdAt: { $gte: new Date(Date.now() - 30 * 1000) },
        });
        if (reciente)
            return NextResponse.json(
                { message: "Este canje ya fue procesado recientemente" },
                { status: 400 }
            );

        // Verificar puntos
        if ((user.puntos || 0) < reward.puntos)
            return NextResponse.json({ message: "Puntos insuficientes" }, { status: 400 });

        // Descontar puntos y guardar canje
        user.puntos -= reward.puntos;
        await user.save();

        const canje = await Canje.create({
            userId: user._id,
            rewardId: reward._id,
            puntosGastados: reward.puntos,
            estado: "completado",
        });

        return NextResponse.json({ ok: true, canje });
    } catch (error) {
        console.error("Error en POST /api/canjes:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
