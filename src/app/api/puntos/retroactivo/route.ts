import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { getPointsRatio } from "@/lib/getPointsRatio";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;
const ROLES = ["superadmin", "admin", "cajero", "empleado"];

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ROLES.includes(p.role) ? p : null;
    } catch { return null; }
}

// GET — comandas de bar pagadas sin puntos acreditados (últimos 30 días)
export async function GET(req: NextRequest) {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const pedidos = await Pedido.find({
        fuente: "empleado",
        estado: "cerrado",
        puntosAcreditados: { $ne: true },
        createdAt: { $gte: desde },
    })
        .populate("items.menuItemId", "nombre precio")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    return NextResponse.json(pedidos);
}

// POST — otorgar puntos retroactivos a uno o más usuarios por una comanda
export async function POST(req: NextRequest) {
    const actor = auth(req);
    if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    const { pedidoId, userIds } = await req.json();
    if (!pedidoId || !Array.isArray(userIds) || userIds.length === 0)
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) return NextResponse.json({ error: "Comanda no encontrada" }, { status: 404 });
    if (pedido.estado !== "cerrado") return NextResponse.json({ error: "La comanda no está cerrada" }, { status: 400 });
    if (pedido.puntosAcreditados) return NextResponse.json({ error: "Esta comanda ya tiene puntos acreditados" }, { status: 400 });

    const ratio = await getPointsRatio();
    const puntos = Math.floor((pedido.total || 0) * ratio);
    if (puntos <= 0) return NextResponse.json({ error: "El total no genera puntos" }, { status: 400 });

    const acreditados: string[] = [];

    for (const uid of userIds) {
        const cliente = await User.findById(uid);
        if (!cliente || cliente.role !== "cliente") continue;

        await PointTransaction.create({
            userId: cliente._id,
            source: "consumo",
            amount: puntos,
            notes: `Puntos retroactivos — Mesa ${pedido.mesa || "—"}`,
            meta: { pedidoId: pedido._id, consumoARS: pedido.total },
            pendingReview: false,
        });

        cliente.puntos = (cliente.puntos || 0) + puntos;
        await cliente.save();
        acreditados.push(uid);

        // Notificación push
        if (Array.isArray(cliente.pushSubscriptions) && cliente.pushSubscriptions.length) {
            const invalid = await sendPushAndCollectInvalid(cliente.pushSubscriptions, {
                title: "¡Puntos sumados!",
                body: `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`,
                url: "/cliente/qr",
            });
            if (invalid.length)
                await User.updateOne({ _id: cliente._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
        }

        const fcmTokens = new Set<string>([...(cliente.fcmTokens ?? []), ...(cliente.tokenFCM ? [cliente.tokenFCM] : [])]);
        for (const fcmToken of fcmTokens) {
            try {
                await enviarNotificacionFCM(fcmToken, "¡Puntos sumados!", `Se acreditaron ${puntos} puntos por tu consumo en H. Morgan 🎉`, "/cliente/qr");
            } catch (err) {
                if (isFCMTokenInvalid(err)) await User.updateOne({ _id: cliente._id }, { $pull: { fcmTokens: fcmToken } });
            }
        }
    }

    if (acreditados.length > 0) {
        await Pedido.findByIdAndUpdate(pedidoId, {
            puntosAcreditados: true,
            $addToSet: { comensalesIds: { $each: acreditados } },
        });
    }

    return NextResponse.json({ ok: true, acreditados, puntos });
}
