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
        const { consumoARS, userIds, mesa } = await req.json();
        if (!consumoARS || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        await connectMongoDB();

        const ratio = await getPointsRatio();
        const puntos = Math.floor(consumoARS * ratio);
        if (puntos <= 0) {
            return NextResponse.json({ ok: true, message: "Consumo bajo, 0 puntos" });
        }

        // --- Usuarios válidos ---
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return NextResponse.json({ error: "Algunos usuarios no existen" }, { status: 400 });
        }

        // --- Cada usuario recibe los puntos completos del consumo ---
        for (const u of users) {
            await PointTransaction.create({
                userId: u._id,
                source: "consumo",
                amount: puntos,
                notes: `Mesa ${mesa || "-"}`,
                meta: { consumoARS, mesa: mesa || null, mozoId: payload.sub },

                pendingReview: true,   // 🔥 AGREGADO
            });

            u.puntos += puntos;

            // 🔥 Nuevo: cuando un usuario recibe puntos → pedimos reseña
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
                        title: "¡Puntos sumados!",
                        body: `Se acreditaron ${puntos} puntos por tu consumo 🍻`,
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
                            "¡Puntos sumados!",
                            `Se acreditaron ${puntos} puntos. ¡Gracias por venir!`,
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
            puntos,
            usuarios: userIds.length,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error finalizando mesa" }, { status: 500 });
    }
}
