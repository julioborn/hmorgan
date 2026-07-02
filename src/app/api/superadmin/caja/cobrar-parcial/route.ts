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
    if (!["superadmin", "admin", "cajero"].includes(payload.role))
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();

    const { pedidoId, items, metodoPago, montoPagado } = await req.json();
    if (!pedidoId || !items?.length || !metodoPago)
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const pedido = await Pedido.findById(pedidoId).populate("items.menuItemId", "nombre precio");
    if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (pedido.estado === "cerrado") return NextResponse.json({ error: "Ya cerrado" }, { status: 400 });

    // Subtract partial quantities from the order
    for (const { itemId, cantidad } of (items as { itemId: string; cantidad: number }[])) {
        const list = pedido.items as any[];
        const idx = list.findIndex(i => i._id.toString() === itemId);
        if (idx === -1) continue;
        list[idx].cantidad -= cantidad;
        if (list[idx].cantidad <= 0) list.splice(idx, 1);
    }

    // Recalculate total from remaining items (menuItemId is populated)
    pedido.total = (pedido.items as any[]).reduce((acc: number, it: any) => {
        return acc + (it.menuItemId?.precio || 0) * it.cantidad;
    }, 0);

    // If no items remain, close the order
    if ((pedido.items as any[]).length === 0) {
        pedido.estado = "cerrado";
        pedido.metodoPago = metodoPago;
        pedido.montoPagado = Number(montoPagado) || 0;
    }

    await pedido.save();

    // Register movement in open caja session
    const sesion = await CajaSession.findOne({ estado: "abierta" });
    if (sesion) {
        const loc = (pedido as any).mesa
            ? `Mesa ${(pedido as any).mesa}`
            : (pedido as any).nombreComanda || "Sin mesa";
        await CajaMovement.create({
            sesionId: sesion._id,
            tipo: "ingreso",
            concepto: `Cobro parcial · ${loc}`,
            monto: Number(montoPagado) || 0,
            metodoPago,
            pedidoId: pedido._id,
            userId: payload.sub,
        });
    }

    return NextResponse.json({ ok: true, pedido });
}
