import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import jwt from "jsonwebtoken";
import { OWNER_USER_ID } from "@/lib/owner";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authSuper(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin"].includes(p.role) && p.sub !== OWNER_USER_ID) return null;
        return p;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const items = await Stock.find({}).sort({ categoria: 1, nombre: 1 }).lean();
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const item = await Stock.create(body);
    return NextResponse.json(item, { status: 201 });
}
