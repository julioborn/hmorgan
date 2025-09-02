// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { IUser, User } from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No auth" }, { status: 401 });

    let payload: any;
    try {
        const jwt = (await import("jsonwebtoken")).default;
        payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }

    const userId = (payload as any).userId || (payload as any).sub || (payload as any).id;
    if (!userId) return NextResponse.json({ error: "No user id in token" }, { status: 400 });

    await connectMongoDB();

    // 👇 TIPADO ESTRICTO: un doc o null (no array)
    const user = await User.findById(userId).lean<IUser | null>();

    return NextResponse.json({
        count: user?.pushSubscriptions?.length ?? 0,
        subs: user?.pushSubscriptions ?? [],
    });
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No auth" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }

    const sub = await req.json(); // { endpoint, keys:{p256dh, auth} }
    if (!sub?.endpoint) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });

    await connectMongoDB();

    const userId = payload.userId || payload.sub || payload.id;
    if (!userId) return NextResponse.json({ error: "No user id in token" }, { status: 400 });

    // 👇 1) BORRAR este endpoint de cualquier OTRO usuario (migración/“claim”)
    await User.updateMany(
        { "pushSubscriptions.endpoint": sub.endpoint, _id: { $ne: userId } },
        { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
    );

    // 👇 2) AÑADIRLO (si no está) al usuario actual
    await User.updateOne(
        { _id: userId },
        {
            $addToSet: {
                pushSubscriptions: {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
                },
            },
        }
    );

    return NextResponse.json({ ok: true });
}
