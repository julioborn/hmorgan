// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No auth" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }

    const sub = await req.json();
    if (!sub?.endpoint) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });

    await connectMongoDB();

    // 👇 toma la que exista
    const userId = payload.userId || payload.sub || payload.id;
    if (!userId) return NextResponse.json({ error: "No user id in token" }, { status: 400 });

    // Idempotente por endpoint
    await User.updateOne(
        { _id: userId, "pushSubscriptions.endpoint": { $ne: sub.endpoint } },
        {
            $push: {
                pushSubscriptions: {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
                },
            },
        }
    );

    return NextResponse.json({ ok: true });
}
