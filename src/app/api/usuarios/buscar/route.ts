import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;
const ROLES_PERMITIDOS = ["empleado", "cajero", "admin", "superadmin"];

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { const p = jwt.verify(token, SECRET) as any; if (!ROLES_PERMITIDOS.includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 }); }
    catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json([]);

    const regex = new RegExp(q, "i");
    const users = await User.find({
        role: "cliente",
        $or: [
            { nombre: regex },
            { apellido: regex },
            { username: regex },
            { telefono: regex },
        ],
    }, "nombre apellido username telefono puntos").limit(8).lean();

    return NextResponse.json(users);
}
