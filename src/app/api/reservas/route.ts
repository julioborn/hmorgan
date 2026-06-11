import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reserva } from "@/models/Reserva";
import { User } from "@/models/User";
import { Mesa } from "@/models/Mesa";
import Config from "@/models/Config";
import jwt from "jsonwebtoken";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

function isStaff(role: string) { return role === "admin" || role === "superadmin" || role === "cajero"; }

function formatFecha(fecha: Date) {
    return new Date(fecha).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

async function notificarUsuario(userId: string, title: string, body: string) {
    const user = await User.findById(userId);
    if (!user) return;
    if (user.pushSubscriptions?.length) {
        await sendPushToSubscriptions(user.pushSubscriptions, { title, body, url: "/cliente/reservas", icon: "/icon-192.png", badge: "/icon-badge-96x96.png" });
    }
    const tokens = new Set<string>([...(user.fcmTokens ?? []), ...(user.tokenFCM ? [user.tokenFCM] : [])]);
    for (const t of tokens) {
        try { await enviarNotificacionFCM(t, title, body, "/cliente/reservas"); }
        catch (e) { if (isFCMTokenInvalid(e)) await User.updateOne({ _id: user._id }, { $pull: { fcmTokens: t } }); }
    }
}

// GET — admin: todas; cliente: las suyas
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const query = isStaff(payload.role) ? {} : { userId: payload.sub };
    const reservas = await Reserva.find(query)
        .populate("userId", "nombre apellido telefono email")
        .populate("mesaId", "nombre forma")
        .sort({ fecha: 1, hora: 1 })
        .lean();

    return NextResponse.json(reservas);
}

// POST — cliente crea reserva
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    // Verificar que reservas están activas (solo bloquear clientes)
    if (payload.role === "cliente") {
        const config = await Config.findOne({ _id: "global" });
        if (config && config.reservasActivas === false) {
            return NextResponse.json({ error: "Las reservas están desactivadas temporalmente" }, { status: 403 });
        }
    }

    const { fecha, hora, comensales, zona, notas } = await req.json();
    if (!fecha || !hora || !comensales) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    // Validar que la fecha no sea pasada (se permite hoy)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaReserva = new Date(fecha); fechaReserva.setHours(0, 0, 0, 0);
    if (fechaReserva < hoy) return NextResponse.json({ error: "No podés reservar en una fecha pasada" }, { status: 400 });

    // Si la reserva es para hoy, el horario no puede haber pasado ya
    if (fechaReserva.getTime() === hoy.getTime()) {
        const [h, m] = String(hora).split(":").map(Number);
        const horaReserva = new Date();
        horaReserva.setHours(h || 0, m || 0, 0, 0);
        if (horaReserva < new Date()) {
            return NextResponse.json({ error: "Ese horario ya pasó, elegí otro" }, { status: 400 });
        }
    }

    const reserva = await Reserva.create({
        userId: payload.sub,
        fecha: new Date(fecha),
        hora,
        comensales: Number(comensales),
        zona: zona || "indiferente",
        notas: notas || undefined,
    });

    // Notificar al admin/superadmin
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } });
    for (const admin of admins) {
        if (admin.pushSubscriptions?.length) {
            await sendPushToSubscriptions(admin.pushSubscriptions, {
                title: "Nueva reserva",
                body: `Reserva para ${comensales} personas el ${formatFecha(new Date(fecha))} a las ${hora}hs`,
                url: "/admin/reservas",
                icon: "/icon-192.png",
            });
        }
    }

    return NextResponse.json(reserva, { status: 201 });
}

// PATCH — admin actualiza (estado, mesa, etc.)
export async function PATCH(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || !isStaff(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    await connectMongoDB();

    const { id, ...updates } = await req.json();
    const reserva = await Reserva.findById(id).populate("mesaId", "nombre");
    if (!reserva) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const prevEstado = reserva.estado;
    Object.assign(reserva, updates);
    await reserva.save();

    // Notificar al cliente cuando cambia el estado
    if (updates.estado && updates.estado !== prevEstado) {
        const mesa = updates.mesaId
            ? await Mesa.findById(updates.mesaId).lean() as any
            : reserva.mesaId as any;

        if (updates.estado === "confirmada") {
            await notificarUsuario(
                reserva.userId.toString(),
                "Reserva confirmada",
                `Tu reserva para ${reserva.comensales} personas el ${formatFecha(reserva.fecha)} a las ${reserva.hora}hs fue confirmada.`
            );
        } else if (updates.estado === "cancelada") {
            await notificarUsuario(
                reserva.userId.toString(),
                "Reserva cancelada",
                `Tu reserva del ${formatFecha(reserva.fecha)} a las ${reserva.hora}hs fue cancelada.`
            );
        }
    }

    const updated = await Reserva.findById(id)
        .populate("userId", "nombre apellido telefono")
        .populate("mesaId", "nombre forma");
    return NextResponse.json(updated);
}

// DELETE — admin cancela
export async function DELETE(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || !isStaff(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    await connectMongoDB();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const reserva = await Reserva.findByIdAndDelete(id);
    if (reserva) {
        await notificarUsuario(
            reserva.userId.toString(),
            "Reserva cancelada",
            `Tu reserva del ${formatFecha(reserva.fecha)} fue cancelada.`
        );
    }
    return NextResponse.json({ ok: true });
}
