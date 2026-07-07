import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { LlamadaMozo } from "@/models/LlamadaMozo";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const STAFF_ROLES = ["cajero", "empleado", "admin", "superadmin"];

function getPayload(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return null;
        return jwt.verify(token, SECRET) as any;
    } catch { return null; }
}

// GET — cliente: comanda activa como comensal | staff: llamadas pendientes
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    if (STAFF_ROLES.includes(payload.role)) {
        const llamadas = await LlamadaMozo.find({ vista: false })
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(llamadas);
    }

    // cliente: buscar pedido activo donde es comensal
    const pedido = await Pedido.findOne({
        comensalesIds: payload.sub,
        estado: { $in: ["pendiente", "preparando", "listo"] },
    }).lean() as any;

    return NextResponse.json({ pedido: pedido ?? null });
}

// POST — cliente llama al mozo
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "cliente") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();

    const pedido = await Pedido.findOne({
        comensalesIds: payload.sub,
        estado: { $in: ["pendiente", "preparando", "listo"] },
    }).lean() as any;

    if (!pedido) return NextResponse.json({ error: "Sin comanda activa" }, { status: 404 });

    const cliente = await User.findById(payload.sub).select("nombre apellido").lean() as any;
    const clienteNombre = [cliente?.nombre, cliente?.apellido].filter(Boolean).join(" ") || payload.username || "Cliente";

    const llamada = await LlamadaMozo.create({
        pedidoId:      pedido._id,
        clienteId:     payload.sub,
        clienteNombre,
        mesa:          pedido.mesa || pedido.nombreComanda || null,
        mozoId:        pedido.userId,
    });

    // Notificar al staff (cajeros + admins + mozo)
    const staffUsers = await User.find({
        role: { $in: ["cajero", "admin", "empleado"] },
        $or: [
            { pushSubscriptions: { $exists: true, $not: { $size: 0 } } },
            { fcmTokens: { $exists: true, $not: { $size: 0 } } },
            { tokenFCM: { $exists: true, $ne: null } },
        ],
    }).lean() as any[];

    // Incluir al mozo creador si no está ya en la lista
    const mozoId = pedido.userId?.toString();
    const staffIds = new Set(staffUsers.map((u: any) => u._id.toString()));
    let extraMozo = null;
    if (mozoId && !staffIds.has(mozoId)) {
        extraMozo = await User.findById(mozoId).lean() as any;
    }

    const targets = extraMozo ? [...staffUsers, extraMozo] : staffUsers;
    const mesaLabel = pedido.mesa ? `mesa ${pedido.mesa}` : pedido.nombreComanda || "su mesa";
    const title = "🔔 Llamada de cliente";
    const body = `${clienteNombre} te está llamando desde ${mesaLabel}`;

    for (const u of targets) {
        if (Array.isArray(u.pushSubscriptions) && u.pushSubscriptions.length) {
            const invalid = await sendPushAndCollectInvalid(u.pushSubscriptions, { title, body, url: "/caja" });
            if (invalid.length) await User.updateOne({ _id: u._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
        }
        const fcmTokens = new Set<string>([...(u.fcmTokens ?? []), ...(u.tokenFCM ? [u.tokenFCM] : [])]);
        for (const tok of fcmTokens) {
            try {
                await enviarNotificacionFCM(tok, title, body, "/caja");
            } catch (err) {
                if (isFCMTokenInvalid(err)) await User.updateOne({ _id: u._id }, { $pull: { fcmTokens: tok } });
            }
        }
    }

    return NextResponse.json({ ok: true, llamadaId: llamada._id });
}
