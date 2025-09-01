import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
    try {
        // auth admin
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, JWT_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { consumoARS, userIds, mesa } = await req.json();
        if (!consumoARS || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        await connectMongoDB();

        const ratio = Number(process.env.POINTS_PER_ARS ?? (1 / 1000)); // ej 0.001 => 1 punto c/ $1000
        const totalPoints = Math.floor(consumoARS * ratio);
        if (totalPoints <= 0) {
            return NextResponse.json({ ok: true, message: "Consumo bajo, 0 puntos" });
        }

        // reparto equitativo + resto
        const base = Math.floor(totalPoints / userIds.length);
        let resto = totalPoints - base * userIds.length;

        // obtenemos usuarios válidos
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return NextResponse.json({ error: "Algunos usuarios no existen" }, { status: 400 });
        }

        // aplicamos transacciones y sumas
        for (const u of users) {
            const extra = resto > 0 ? 1 : 0; // distribuir el sobrante a los primeros
            if (resto > 0) resto--;

            const puntos = base + extra;

            await PointTransaction.create({
                userId: u._id,
                source: "consumo",
                amount: puntos,
                notes: `Mesa ${mesa || "-"}`,
                meta: { consumoARS, mesa: mesa || null, mozoId: payload.sub, share: userIds.length },
            });

            u.points += puntos;
            await u.save();
        }

        return NextResponse.json({
            ok: true,
            totalPoints,
            repartidos: userIds.length,
            porCabeza: base,
            sobranteYaDistribuido: totalPoints - base * userIds.length
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error finalizando mesa" }, { status: 500 });
    }
}
