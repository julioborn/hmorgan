import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (payload.role !== "superadmin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();

    const { pedidoId, metodoPago, montoPagado, notas } = await req.json();
    if (!pedidoId || !metodoPago) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const pedido = await Pedido.findById(pedidoId)
        .populate("items.menuItemId", "nombre precio");
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (pedido.estado === "cerrado") return NextResponse.json({ error: "Ya cerrado" }, { status: 400 });

    // Cerrar el pedido
    pedido.estado = "cerrado";
    pedido.metodoPago = metodoPago;
    pedido.montoPagado = Number(montoPagado) || pedido.total || 0;
    await pedido.save();

    // Registrar ingreso en caja si hay sesión abierta
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (sesion) {
        await CajaMovement.create({
            sesionId: sesion._id,
            tipo: "ingreso",
            concepto: `Cobro Mesa ${pedido.mesa || "—"} (Pedido #${pedido._id.toString().slice(-6)})`,
            monto: pedido.total || 0,
            metodoPago,
            pedidoId: pedido._id,
            userId: payload.sub,
        });
    }

    return NextResponse.json({ ok: true, pedido });
}
