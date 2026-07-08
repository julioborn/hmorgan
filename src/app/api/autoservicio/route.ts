import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { AutoservicioSesion } from "@/models/AutoservicioSesion";
import { User } from "@/models/User";
import { Mesa } from "@/models/Mesa";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const STAFF = ["cajero", "empleado", "admin", "superadmin"];

function getPayload(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return null;
        return jwt.verify(token, SECRET) as any;
    } catch { return null; }
}

// GET — cliente: sesión activa propia | staff: todas las sesiones activas
export async function GET(req: NextRequest) {
    const p = getPayload(req);
    if (!p) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    if (STAFF.includes(p.role)) {
        const sesiones = await AutoservicioSesion.find({ estado: "activa" })
            .populate("usuariosIds", "nombre apellido username")
            .populate("creadoPor", "nombre apellido")
            .lean();
        return NextResponse.json(sesiones);
    }

    const sesion = await AutoservicioSesion.findOne({
        usuariosIds: p.sub,
        estado: "activa",
    }).populate("usuariosIds", "nombre apellido username").lean();

    return NextResponse.json({ sesion: sesion ?? null });
}

// POST — mozo/caja crea sesión de autoservicio (multi-mesa)
export async function POST(req: NextRequest) {
    const p = getPayload(req);
    if (!p || !STAFF.includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { mesasNombres, usernames } = await req.json();
    if (!Array.isArray(mesasNombres) || mesasNombres.length === 0 || !Array.isArray(usernames) || usernames.length === 0)
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    await connectMongoDB();

    const mesas = await Mesa.find({ nombre: { $in: mesasNombres } }).lean() as any[];
    if (mesas.length === 0) return NextResponse.json({ error: "Mesas no encontradas" }, { status: 404 });

    // Verificar que ninguna mesa tenga sesión activa
    const ocupadas = await AutoservicioSesion.findOne({
        mesasNombres: { $in: mesasNombres },
        estado: "activa",
    });
    if (ocupadas) return NextResponse.json({ error: "Una o más mesas ya tienen sesión activa" }, { status: 409 });

    const usuarios = await User.find({
        username: { $in: usernames.map((u: string) => u.toLowerCase().trim()) },
        role: "cliente",
    }).select("_id nombre apellido username").lean() as any[];

    if (usuarios.length === 0)
        return NextResponse.json({ error: "No se encontró ningún usuario válido" }, { status: 404 });

    const sesion = await AutoservicioSesion.create({
        mesasIds: mesas.map((m: any) => m._id),
        mesasNombres,
        usuariosIds: usuarios.map((u: any) => u._id),
        creadoPor: p.sub,
    });

    return NextResponse.json({ ok: true, sesion, usuarios }, { status: 201 });
}
