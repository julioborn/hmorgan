// src/app/api/scan/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { sendPushAndCollectInvalid } from "@/lib/push-server"; 
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        // --- Auth admin ---
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        // --- Body ---
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

        // --- Reparto equitativo + resto ---
        const base = Math.floor(totalPoints / userIds.length);
        let resto = totalPoints - base * userIds.length;

        // --- Usuarios válidos ---
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return NextResponse.json({ error: "Algunos usuarios no existen" }, { status: 400 });
        }

        // --- Aplicar transacciones y sumar puntos ---
        for (const u of users) {
            if (!u.pushSubscriptions?.length) {
                console.log(`[finalize] user ${u._id} sin pushSubscriptions`);
            }
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

            u.puntos += puntos;
            await u.save();
        }

        // ---------- 🔔 PUSH A LOS CLIENTES (AQUÍ VA LO NUEVO) ----------
        // Construimos un payload simple; podés personalizar por usuario si querés
        const pushPayload = {
            title: "¡Puntos sumados!",
            body: `Se acreditaron ${totalPoints} puntos. ¡Gracias por venir!`,
            url: "/cliente/qr", // al tocar abre su QR
        };

        // Enviar a todas las suscripciones de cada usuario
        await Promise.all(
            users.map(async (u: any) => {
                if (Array.isArray(u.pushSubscriptions) && u.pushSubscriptions.length) {
                    try {
                        const invalid = await sendPushAndCollectInvalid(u.pushSubscriptions, pushPayload);
                        if (invalid.length) {
                            // 🧹 borra de la DB los endpuntos muertos de ESTE usuario
                            await User.updateOne(
                                { _id: u._id },
                                { $pull: { pushSubscriptions: { endpoint: { $in: invalid } } } }
                            );
                        }
                    } catch (e) {
                        console.error("push error user", u._id, e);
                    }
                }
            })
        );
        // ---------- 🔔 FIN PUSH ----------

        return NextResponse.json({
            ok: true,
            totalPoints,
            repartidos: userIds.length,
            porCabeza: base,
            sobranteYaDistribuido: totalPoints - base * userIds.length,
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error finalizando mesa" }, { status: 500 });
    }
}
