// src/app/api/scan/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { sendPushAndCollectInvalid } from "@/lib/push-server";
import jwt from "jsonwebtoken";
import { getPointsRatio } from "@/lib/getPointsRatio";
import { enviarNotificacionFCM, isFCMTokenInvalid } from "@/lib/firebase-admin";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        // --- Auth admin ---
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (!["admin", "empleado"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        // --- Body ---
        const { consumoARS, userIds, mesa, comensales } = await req.json();
        if (!consumoARS || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        const totalPersonas = Math.max(1, Number(comensales) || userIds.length);

        await connectMongoDB();

        const ratio = await getPointsRatio();
        const puntosTotal = Math.floor(consumoARS * ratio);
        // Cada comensal recibe su parte proporcional aunque no tenga la app
        const puntosParaUsuario = Math.floor(puntosTotal / totalPersonas);
        const consumoFormateado = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(consumoARS);
        if (puntosParaUsuario <= 0) {
            return NextResponse.json({ ok: true, message: "Consumo bajo, 0 puntos" });
        }

        // --- Usuarios válidos ---
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return NextResponse.json({ error: "Algunos usuarios no existen" }, { status: 400 });
        }

        // --- Cada usuario recibe su parte (puntosTotal / totalPersonas) ---
        for (const u of users) {
            await PointTransaction.create({
                userId: u._id,
                source: "consumo",
                amount: puntosParaUsuario,
                notes: `Mesa ${mesa || "-"} · ${userIds.length}/${totalPersonas} con app`,
                meta: { consumoARS, mesa: mesa || null, mozoId: payload.sub, totalPersonas, puntosTotal },
                pendingReview: true,
            });

            u.puntos += puntosParaUsuario;
            u.needsReview = true;
            await u.save();

            // ---------- 🔔 PUSH WEB (VAPID) ----------
            if (Array.isArray(u.pushSubscriptions) && u.pushSubscriptions.length) {
                try {
                    const uniqueSubs = Array.from(
                        new Map(
                            u.pushSubscriptions.map(
                                (s: { endpoint: string; keys?: { p256dh?: string; auth?: string } }) => [s.endpoint, s]
                            )
                        ).values()
                    ) as { endpoint: string; keys?: { p256dh?: string; auth?: string } }[];

                    const invalid = await sendPushAndCollectInvalid(uniqueSubs, {
                        title: `¡Ganaste ${puntosParaUsuario} puntos! 🍻`,
                        body: `Total de la mesa: ${consumoFormateado}. ¡Gracias por venir!`,
                        url: "/cliente/qr",
                    });

                    if (invalid.length) {
                        await User.updateOne(
                            { _id: u._id },
                            { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } }
                        );
                    }
                } catch (e) {
                    console.error("push error user", u._id, e);
                }
            }

            // ---------- 🔥 PUSH NATIVO (FCM) ----------
            {
                const userFcmTokens = new Set<string>(u.fcmTokens ?? []);
                if (u.tokenFCM) userFcmTokens.add(u.tokenFCM);
                for (const fcmToken of userFcmTokens) {
                    try {
                        await enviarNotificacionFCM(
                            fcmToken,
                            `¡Ganaste ${puntosParaUsuario} puntos! 🍻`,
                            `Total de la mesa: ${consumoFormateado}. ¡Gracias por venir!`,
                            "/cliente/qr"
                        );
                    } catch (err) {
                        if (isFCMTokenInvalid(err)) await User.updateOne({ _id: u._id }, { $pull: { fcmTokens: fcmToken } });
                        else console.error("❌ Error al enviar FCM:", err);
                    }
                }
            }
        }

        return NextResponse.json({
            ok: true,
            puntosParaUsuario,
            puntosTotal,
            totalPersonas,
            conApp: userIds.length,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error finalizando mesa" }, { status: 500 });
    }
}
