import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["superadmin", "admin"].includes(payload.role))
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();
    const sesion = await CajaSession.findById(params.id);
    if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const body = await req.json();

    if (body.accion === "editarCierre") {
        const montoCierre = Number(body.montoCierre);
        if (isNaN(montoCierre) || montoCierre < 0)
            return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

        const movimientos = await CajaMovement.find({ sesionId: sesion._id }).lean<any[]>();
        const efectivoIngreso = movimientos.filter(m => m.tipo === "ingreso" && m.metodoPago === "efectivo").reduce((s, m) => s + m.monto, 0);
        const efectivoEgreso  = movimientos.filter(m => m.tipo === "egreso"  && m.metodoPago === "efectivo").reduce((s, m) => s + m.monto, 0);
        const efectivoSistema = (sesion.montoInicial || 0) + efectivoIngreso - efectivoEgreso;
        const diferencia      = montoCierre - efectivoSistema;

        sesion.montoCierre = montoCierre;
        if (body.notas !== undefined) sesion.notas = body.notas;
        await sesion.save();

        return NextResponse.json({ ok: true, sesion, efectivoSistema, diferencia });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
