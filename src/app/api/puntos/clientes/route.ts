import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;
const ROLES = ["superadmin", "admin", "cajero", "empleado"];

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!ROLES.includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json([]);

    await connectMongoDB();

    const clientes = await User.find({
        role: "cliente",
        $or: [
            { nombre: { $regex: q, $options: "i" } },
            { apellido: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
            { telefono: { $regex: q, $options: "i" } },
        ],
    })
        .select("_id nombre apellido username telefono puntos")
        .limit(10)
        .lean();

    return NextResponse.json(clientes);
}
