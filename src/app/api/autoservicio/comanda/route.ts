import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { AutoservicioSesion } from "@/models/AutoservicioSesion";
import { Pedido } from "@/models/Pedido";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

// GET — devuelve todos los pedidos activos de autoservicio de la sesión del usuario (todos los comensales)
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, SECRET) as any;

        await connectMongoDB();

        const sesion = await AutoservicioSesion.findOne({
            usuariosIds: payload.sub,
            estado: "activa",
        }).lean() as any;

        if (!sesion) return NextResponse.json({ pedidos: [], totalGeneral: 0 });

        const mesa = (sesion.mesasNombres as string[]).join(", ");

        const pedidos = await Pedido.find({
            fuente: "autoservicio",
            mesa,
            estado: { $nin: ["cerrado", "cancelado", "cobrado"] },
        })
            .populate("userId", "nombre apellido")
            .populate("items.menuItemId", "nombre precio")
            .sort({ createdAt: 1 })
            .lean();

        const totalGeneral = pedidos.reduce((s: number, p: any) => s + (p.total || 0), 0);

        return NextResponse.json({ pedidos, totalGeneral });
    } catch (err) {
        console.error("[autoservicio/comanda GET]", err);
        return NextResponse.json({ pedidos: [], totalGeneral: 0 }, { status: 500 });
    }
}
