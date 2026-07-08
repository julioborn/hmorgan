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
            .populate("mozoId", "nombre apellido username")
            .lean() as any[];
        const resultado = llamadas.map((l: any) => ({
            ...l,
            mozoNombre: l.mozoId
                ? [l.mozoId.nombre, l.mozoId.apellido].filter(Boolean).join(" ") || l.mozoId.username
                : null,
        }));
        return NextResponse.json(resultado);
    }

    // cliente: buscar pedido activo donde es comensal
    const pedido = await Pedido.findOne({
        comensalesIds: payload.sub,
        estado: { $in: ["pendiente", "preparando", "listo"] },
    }).populate("items.menuItemId", "nombre precio").lean() as any;

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

    const { tipo = "mozo" } = await req.json().catch(() => ({}));

    const cliente = await User.findById(payload.sub).select("nombre apellido").lean() as any;
    const clienteNombre = [cliente?.nombre, cliente?.apellido].filter(Boolean).join(" ") || payload.username || "Cliente";

    // Upsert: si ya hay una llamada pendiente del mismo pedido y tipo, actualizar timestamp en vez de crear otra
    const llamada = await LlamadaMozo.findOneAndUpdate(
        { pedidoId: pedido._id, tipo, vista: false },
        { $set: { clienteNombre, mesa: pedido.mesa || pedido.nombreComanda || null, mozoId: pedido.userId, updatedAt: new Date() }, $setOnInsert: { pedidoId: pedido._id, clienteId: payload.sub, tipo } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notificar a todos los mozos que tienen comandas activas en este momento
    const mesaLabel = pedido.mesa ? `mesa ${pedido.mesa}` : pedido.nombreComanda || "su mesa";
    const esCuenta = tipo === "cuenta";
    const title = esCuenta ? "🟢 Piden la cuenta 🟢" : "🔴 Llamada al mozo 🔴";
    const body = esCuenta
        ? `🟢 ${clienteNombre} · ${mesaLabel} pide la cuenta 🟢`
        : `🔴 ${clienteNombre} · ${mesaLabel} llama al mozo 🔴`;

    const comandasActivas = await Pedido.find({
        fuente: "empleado",
        estado: { $in: ["pendiente", "preparando", "listo"] },
    }).select("userId").lean() as any[];

    const mozoIds = [...new Set(comandasActivas.map((c: any) => c.userId?.toString()).filter(Boolean))];

    const mozos = await User.find({ _id: { $in: mozoIds } }).lean() as any[];

    for (const mozo of mozos) {
        if (Array.isArray(mozo.pushSubscriptions) && mozo.pushSubscriptions.length) {
            const invalid = await sendPushAndCollectInvalid(mozo.pushSubscriptions, { title, body, url: "/empleado/anotador" });
            if (invalid.length) await User.updateOne({ _id: mozo._id }, { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } });
        }
        const fcmTokens = new Set<string>([...(mozo.fcmTokens ?? []), ...(mozo.tokenFCM ? [mozo.tokenFCM] : [])]);
        for (const tok of fcmTokens) {
            try {
                await enviarNotificacionFCM(tok, title, body, "/empleado/anotador");
            } catch (err) {
                if (isFCMTokenInvalid(err)) await User.updateOne({ _id: mozo._id }, { $pull: { fcmTokens: tok } });
            }
        }
    }

    return NextResponse.json({ ok: true, llamadaId: llamada._id });
}
