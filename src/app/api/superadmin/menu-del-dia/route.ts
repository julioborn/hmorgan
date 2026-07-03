import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuDelDia } from "@/models/MenuDelDia";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

async function authorize(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return false;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["admin", "superadmin", "cajero"].includes(p.role);
    } catch { return false; }
}

export async function GET(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const doc = await MenuDelDia.findOne().lean();
    return NextResponse.json(doc ?? null);
}

export async function PUT(req: NextRequest) {
    if (!await authorize(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const { titulo, descripcion, precio, activo } = body;

    const doc = await MenuDelDia.findOneAndUpdate(
        {},
        {
            $set: {
                ...(titulo      !== undefined && { titulo }),
                ...(descripcion !== undefined && { descripcion }),
                ...(precio      !== undefined && { precio: precio === "" ? null : Number(precio) }),
                ...(activo      !== undefined && { activo }),
            },
        },
        { upsert: true, new: true }
    ).lean();

    return NextResponse.json(doc);
}
