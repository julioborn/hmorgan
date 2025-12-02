import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Review } from "@/models/Review";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

        const { rating, comment, transactionId } = await req.json();

        if (!rating || !transactionId) {
            return NextResponse.json(
                { error: "Faltan datos (rating o transactionId)" },
                { status: 400 }
            );
        }

        await connectMongoDB();

        await Review.create({
            userId: payload.sub,
            rating,          // ✅ AHORA SÍ COINCIDE CON EL MODELO
            comment: comment || "",
        });

        await PointTransaction.updateOne(
            { _id: transactionId },
            { $set: { pendingReview: false } }
        );

        await User.updateOne(
            { _id: payload.sub },
            { $set: { needsReview: false } }
        );

        return NextResponse.json({ ok: true });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error guardando reseña" }, { status: 500 });
    }
}
