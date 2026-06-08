import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();
    const sesion = await CajaSession.findOne({ estado: "abierta" }).lean();
    return NextResponse.json({ abierta: !!sesion });
}
