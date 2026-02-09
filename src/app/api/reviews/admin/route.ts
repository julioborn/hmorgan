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
        if (payload.role !== "admin")
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        await connectMongoDB();

        const { searchParams } = new URL(req.url);

        const page = Math.max(1, Number(searchParams.get("page") || 1));
        const limit = Math.min(50, Number(searchParams.get("limit") || 10));
        const rating = searchParams.get("rating"); // 1..5
        const q = searchParams.get("q"); // nombre / apellido

        const filter: any = {};

        if (rating) filter.rating = Number(rating);

        const reviewsQuery = Review.find(filter)
            .populate("userId", "nombre apellido telefono")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const countQuery = Review.countDocuments(filter);

        const [reviews, total] = await Promise.all([
            reviewsQuery,
            countQuery,
        ]);

        const avgResult = await Review.aggregate([
            { $group: { _id: null, avg: { $avg: "$rating" } } }
        ]);

        return NextResponse.json({
            reviews,
            total,
            page,
            pages: Math.ceil(total / limit),
            avgRating: avgResult[0]?.avg ?? 0,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
