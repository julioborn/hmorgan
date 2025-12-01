import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token)
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

        await connectMongoDB();

        const tx = await PointTransaction.findOne({
            userId: payload.sub,
            pendingReview: true,
        })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ tx });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
