import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";
import { Review } from "@/models/Review";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        const userId = payload.sub;

        const { transactionId, stars, comment } = await req.json();

        if (!transactionId || !stars)
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

        await connectMongoDB();

        // Confirmamos que exista esa transacción y esté pendiente
        const tx = await PointTransaction.findOne({
            _id: transactionId,
            userId,
            pendingReview: true
        });

        if (!tx)
            return NextResponse.json(
                { error: "Transacción no válida o ya evaluada" },
                { status: 400 }
            );

        // Crear reseña
        await Review.create({
            userId,
            transactionId,
            stars,
            comment: comment || ""
        });

        // Marcar como evaluado
        tx.pendingReview = false;
        await tx.save();

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
