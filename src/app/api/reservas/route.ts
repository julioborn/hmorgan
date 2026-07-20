import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reserva } from "@/models/Reserva";
import { User } from "@/models/User";
import { Mesa } from "@/models/Mesa";
import Config from "@/models/Config";
import jwt from "jsonwebtoken";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";
import { hoyArgentina, ahoraArgentina, formatArgDate } from "@/lib/argentina-time";
export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

function isStaff(role: string) { return role === "admin" || role === "superadmin" || role === "cajero" || role === "empleado"; }

function formatFecha(fecha: Date | string) {
    return formatArgDate(fecha, { weekday: "long", day: "numeric", month: "long" });
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

// POST — cliente o staff crea reserva
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

    const body = await req.json();
    const { fecha, hora, comensales, zona, notas } = body;
    if (!fecha || !hora || !comensales) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    // Validar que la fecha no sea pasada (se permite hoy), usando el huso horario de Argentina
    const fechaStr = String(fecha).slice(0, 10);
    const hoyStr = hoyArgentina();
    if (fechaStr < hoyStr) return NextResponse.json({ error: "No podés reservar en una fecha pasada" }, { status: 400 });

    // Las reservas solo se aceptan hasta las 22:00
    const [horaH] = String(hora).split(":").map(Number);
    if (horaH > 22 || String(hora) > "22:00") {
        return NextResponse.json({ error: "Las reservas se aceptan hasta las 22:00" }, { status: 400 });
    }

    // Si la reserva es para hoy, el horario no puede haber pasado ya
    if (fechaStr === hoyStr) {
        const [h, m] = String(hora).split(":").map(Number);
        const { h: hNow, m: mNow } = ahoraArgentina();
        if ((h || 0) * 60 + (m || 0) < hNow * 60 + mNow) {
            return NextResponse.json({ error: "Ese horario ya pasó, elegí otro" }, { status: 400 });
        }
    }

    // Determinar datos del contacto
    let reservaUserId: string | undefined;
    let nombreContacto: string | undefined;
    let telefonoContacto: string | undefined;

    if (isStaff(payload.role)) {
        if (body.userId) {
            reservaUserId = body.userId;
        } else {
            nombreContacto = body.nombreContacto?.trim();
            telefonoContacto = body.telefonoContacto?.trim() || undefined;
            if (!nombreContacto) return NextResponse.json({ error: "Nombre de contacto requerido" }, { status: 400 });
        }
    } else {
        reservaUserId = payload.sub;
    }

    const reserva = await Reserva.create({
        userId: reservaUserId || undefined,
        nombreContacto,
        telefonoContacto,
        fecha: new Date(fecha),
        hora,
        comensales: Number(comensales),
        zona: zona || "indiferente",
        notas: notas || undefined,
    });

    // Notificar al admin/superadmin solo cuando crea un cliente
    if (payload.role === "cliente") {
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

    // Notificar al cliente cuando cambia el estado (solo si tiene cuenta en la app)
    if (updates.estado && updates.estado !== prevEstado && reserva.userId) {
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

// PUT — cliente edita su propia reserva (vuelve a pendiente, libera mesa)
export async function PUT(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "cliente")
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    await connectMongoDB();

    const { id, fecha, hora, comensales, notas } = await req.json();
    if (!id || !fecha || !hora || !comensales)
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const reserva = await Reserva.findOne({ _id: id, userId: payload.sub });
    if (!reserva) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    if (reserva.estado === "cancelada")
        return NextResponse.json({ error: "No podés editar una reserva cancelada" }, { status: 400 });

    const fechaStr = String(fecha).slice(0, 10);
    const hoyStr = hoyArgentina();
    if (fechaStr < hoyStr)
        return NextResponse.json({ error: "No podés reservar en una fecha pasada" }, { status: 400 });

    if (fechaStr === hoyStr) {
        const [h, m] = String(hora).split(":").map(Number);
        const { h: hNow, m: mNow } = ahoraArgentina();
        if ((h || 0) * 60 + (m || 0) < hNow * 60 + mNow)
            return NextResponse.json({ error: "Ese horario ya pasó, elegí otro" }, { status: 400 });
    }

    reserva.fecha = new Date(fecha);
    reserva.hora = hora;
    reserva.comensales = Number(comensales);
    reserva.notas = notas?.trim() || undefined;
    reserva.estado = "pendiente";
    (reserva as any).mesaId = undefined;
    await reserva.save();

    // Notificar admins del cambio
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } });
    const pushBody = `${comensales} personas · ${formatFecha(new Date(fecha))} · ${hora}hs`;
    for (const admin of admins) {
        if (admin.pushSubscriptions?.length) {
            await sendPushToSubscriptions(admin.pushSubscriptions, {
                title: "Reserva modificada",
                body: pushBody,
                url: "/admin/reservas",
                icon: "/icon-192.png",
            });
        }
        const tokens = new Set<string>([...(admin.fcmTokens ?? []), ...(admin.tokenFCM ? [admin.tokenFCM] : [])]);
        for (const t of tokens) {
            try { await enviarNotificacionFCM(t, "Reserva modificada", pushBody, "/admin/reservas"); }
            catch (e) { if (isFCMTokenInvalid(e)) await User.updateOne({ _id: admin._id }, { $pull: { fcmTokens: t } }); }
        }
    }

    return NextResponse.json(reserva);
}

// DELETE — admin cancela
export async function DELETE(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || !isStaff(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    await connectMongoDB();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const reserva = await Reserva.findByIdAndDelete(id);
    if (reserva && reserva.userId) {
        await notificarUsuario(
            reserva.userId.toString(),
            "Reserva cancelada",
            `Tu reserva del ${formatFecha(reserva.fecha)} fue cancelada.`
        );
    }
    return NextResponse.json({ ok: true });
}
