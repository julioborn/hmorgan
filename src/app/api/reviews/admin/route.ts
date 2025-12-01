import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Review } from "@/models/Review";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        await connectMongoDB();

        const reviews = await Review.find()
            .populate("userId", "nombre apellido telefono")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ reviews });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
