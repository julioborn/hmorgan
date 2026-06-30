import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";
import { Canje } from "@/models/Canje";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

// GET — cliente: sus propios canjes | caja/admin: todos los pendientes
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    const esCaja = ["cajero", "admin", "superadmin"].includes(payload.role);

    if (esCaja) {
        const canjes = await Canje.find({ estado: "pendiente" })
            .populate("userId", "nombre apellido puntos")
            .populate("rewardId", "titulo descripcion puntos")
            .sort({ createdAt: 1 })
            .lean();
        return NextResponse.json(canjes);
    }

    const canjes = await Canje.find({ userId: payload.sub })
        .populate("rewardId", "titulo descripcion puntos")
        .sort({ createdAt: -1 })
        .lean();
    return NextResponse.json(canjes);
}

// POST — cliente solicita un canje (queda pendiente, sin descontar puntos)
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    if (payload.role !== "cliente") return NextResponse.json({ message: "Solo clientes" }, { status: 403 });

    const { rewardId } = await req.json();
    if (!rewardId) return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });

    await connectMongoDB();

    const [user, reward] = await Promise.all([
        User.findById(payload.sub),
        Reward.findById(rewardId),
    ]);
    if (!user) return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    if (!reward || !reward.activo) return NextResponse.json({ message: "Canje no disponible" }, { status: 404 });

    if ((user.puntos ?? 0) < reward.puntos)
        return NextResponse.json({ message: "Puntos insuficientes" }, { status: 400 });

    // Evitar canjes duplicados pendientes del mismo reward
    const yaPendiente = await Canje.findOne({ userId: user._id, rewardId: reward._id, estado: "pendiente" });
    if (yaPendiente)
        return NextResponse.json({ message: "Ya tenés un canje pendiente para este premio" }, { status: 400 });

    const canje = await Canje.create({
        userId: user._id,
        rewardId: reward._id,
        puntosGastados: reward.puntos,
        estado: "pendiente",
    });

    return NextResponse.json({ ok: true, canje });
}
