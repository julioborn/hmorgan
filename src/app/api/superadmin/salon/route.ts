import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { SalonElement } from "@/models/SalonElement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authSuper(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["superadmin", "admin"].includes(p.role) ? p : null;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    // Lectura pública para cualquier sesión válida (el plano no es dato sensible)
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    await connectMongoDB();
    const elements = await SalonElement.find({}).lean();
    return NextResponse.json(elements);
}

export async function POST(req: NextRequest) {
    if (!authSuper(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const el = await SalonElement.create(body);
    return NextResponse.json(el, { status: 201 });
}

export async function PATCH(req: NextRequest) {
    if (!authSuper(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { id, ...updates } = await req.json();
    const el = await SalonElement.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json(el);
}

export async function DELETE(req: NextRequest) {
    if (!authSuper(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await SalonElement.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}
