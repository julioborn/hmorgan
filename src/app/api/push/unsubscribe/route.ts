// src/app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No auth" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    } catch {
        return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }

    const body = await req.json(); // { endpoint }
    if (!body?.endpoint) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });

    await connectMongoDB();

    const userId = payload.userId || payload.sub || payload.id;
    if (!userId) return NextResponse.json({ error: "No user id in token" }, { status: 400 });

    await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: body.endpoint } } }
    );

    return NextResponse.json({ ok: true });
}
