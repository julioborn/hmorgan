import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

// Requiere sesión (cualquier usuario). Borra ese endpoint en TODOS los usuarios.
export async function POST(req: NextRequest) {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    await connectMongoDB();
    const res = await User.updateMany(
        {},
        { $pull: { pushSubscriptions: { endpoint } } }
    );

    return NextResponse.json({ ok: true, modifiedCount: res.modifiedCount });
}
