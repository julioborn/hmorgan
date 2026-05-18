import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        const { transactionId } = await req.json();
        if (!transactionId) return NextResponse.json({ error: "Falta transactionId" }, { status: 400 });

        await connectMongoDB();

        await PointTransaction.updateOne({ _id: transactionId }, { $set: { pendingReview: false } });
        await User.updateOne({ _id: payload.sub }, { $set: { needsReview: false } });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
