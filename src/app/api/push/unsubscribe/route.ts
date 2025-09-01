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

    const sub = await req.json(); // { endpoint, keys }
    if (!sub?.endpoint) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });

    await connectMongoDB();
    await User.updateOne(
        { _id: payload.sub },
        { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
    );

    return NextResponse.json({ ok: true });
}
