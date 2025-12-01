import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Review } from "@/models/Review";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

        const { rating, comentario } = await req.json();

        if (!rating) {
            return NextResponse.json({ error: "Falta rating" }, { status: 400 });
        }

        await connectMongoDB();

        await Review.create({
            userId: payload.sub,
            stars: rating,
            comment: comentario || "",
        });

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
