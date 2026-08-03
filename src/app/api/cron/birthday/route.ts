import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Canje } from "@/models/Canje";
import { Reward } from "@/models/Reward";
import { sendPushToSubscriptions } from "@/lib/push-server";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

const BIRTHDAY_REWARD_TEMA = "cumpleanos";
const BIRTHDAY_REWARD_TITULO = "Cena de Cumpleaños para 4 · 20% off";
const BIRTHDAY_REWARD_DESC = "Una cena especial para vos y 3 amigos con 20% de descuento. ¡Feliz cumpleaños!";

async function getBirthdayReward() {
    let reward = await Reward.findOne({ tema: BIRTHDAY_REWARD_TEMA });
    if (!reward) {
        reward = await Reward.create({
            titulo: BIRTHDAY_REWARD_TITULO,
            descripcion: BIRTHDAY_REWARD_DESC,
            puntos: 0,
            activo: true,
            tema: BIRTHDAY_REWARD_TEMA,
        });
    }
    return reward;
}

export async function GET(req: NextRequest) {
    // Verificar el secret del cron
    const auth = req.headers.get("authorization");
    if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();

    // Calcular día y mes de hoy en Argentina
    const hoy = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const mes = Number(hoy.find(p => p.type === "month")?.value ?? "0");
    const dia = Number(hoy.find(p => p.type === "day")?.value ?? "0");

    // Buscar clientes cuyo cumpleaños es hoy (mismo día y mes)
    const usuarios = await User.find({
        role: "cliente",
        fechaNacimiento: { $exists: true, $ne: null },
        $expr: {
            $and: [
                { $eq: [{ $dayOfMonth: "$fechaNacimiento" }, dia] },
                { $eq: [{ $month: "$fechaNacimiento" }, mes] },
            ],
        },
    }).select("_id nombre pushSubscriptions fcmTokens tokenFCM").lean<any[]>();

    if (usuarios.length === 0) {
        return NextResponse.json({ ok: true, procesados: 0 });
    }

    const reward = await getBirthdayReward();
    const anioActual = new Date().getFullYear();
    const inicioPeriodo = new Date(`${anioActual}-01-01T00:00:00.000Z`);

    let procesados = 0;

    for (const u of usuarios) {
        // No crear el canje si ya existe uno de cumpleaños este año
        const yaExiste = await Canje.findOne({
            userId: u._id,
            tipo: "cumpleanos",
            createdAt: { $gte: inicioPeriodo },
        });

        if (!yaExiste) {
            await Canje.create({
                userId: u._id,
                rewardId: reward._id,
                puntosGastados: 0,
                estado: "pendiente",
                tipo: "cumpleanos",
            });
        }

        // Enviar push notification (web push)
        const nombre = u.nombre || "Cumpleañero";
        const payload = {
            title: `¡Feliz cumpleaños, ${nombre}! 🎂`,
            body: "Tenés un regalo especial esperándote: una cena para 4 con 20% off. ¡Abrí la app para verlo!",
            url: "/cliente/canjes",
            icon: "/icon-192.png",
            badge: "/icon-badge-96x96.png",
        };

        if (u.pushSubscriptions?.length) {
            await sendPushToSubscriptions(u.pushSubscriptions, payload);
        }

        // FCM
        const fcmTokens = new Set<string>(u.fcmTokens ?? []);
        if (u.tokenFCM) fcmTokens.add(u.tokenFCM);
        for (const token of fcmTokens) {
            try {
                await enviarNotificacionFCM(token, payload.title, payload.body, payload.url);
            } catch (err) {
                if (isFCMTokenInvalid(err)) {
                    await User.updateOne({ _id: u._id }, { $pull: { fcmTokens: token } });
                }
            }
        }

        procesados++;
    }

    return NextResponse.json({ ok: true, procesados });
}
