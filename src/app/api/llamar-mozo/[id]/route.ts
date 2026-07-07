import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { LlamadaMozo } from "@/models/LlamadaMozo";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        jwt.verify(token, SECRET);
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();
    await LlamadaMozo.findByIdAndUpdate(params.id, { vista: true });
    return NextResponse.json({ ok: true });
}
