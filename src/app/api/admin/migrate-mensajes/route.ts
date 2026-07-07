import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import Mensaje from "@/models/Mensaje";
import jwt from "jsonwebtoken";
import { OWNER_USER_ID } from "@/lib/owner";

const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
    if (payload.role !== "admin" && payload.sub !== OWNER_USER_ID) return NextResponse.json({ error: "Solo admin" }, { status: 403 });

    await connectMongoDB();

    const totalMensajes = await Mensaje.countDocuments();
    const sinDeleteAt = await Mensaje.countDocuments({ deleteAt: null });
    console.log(`📊 Total mensajes: ${totalMensajes}, sin deleteAt: ${sinDeleteAt}`);

    // Pedidos en estado final
    const pedidosFinales = await Pedido.find({
        estado: { $in: ["entregado", "cancelado"] },
    }).select("_id").lean();

    const idsPedidosFinales = pedidosFinales.map((p) => p._id);

    // Mensajes de pedidos finalizados sin deleteAt
    const resFinales = await Mensaje.updateMany(
        { pedidoId: { $in: idsPedidosFinales }, deleteAt: null },
        { deleteAt: new Date(Date.now() + TRES_DIAS_MS) }
    );

    // Mensajes huérfanos (pedido ya no existe) → borrar en 1 día
    const todosLosPedidosIds = (await Pedido.find().select("_id").lean()).map((p) => p._id);
    const resHuerfanos = await Mensaje.updateMany(
        { pedidoId: { $nin: todosLosPedidosIds }, deleteAt: null },
        { deleteAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    );

    return NextResponse.json({
        ok: true,
        totalMensajes,
        sinDeleteAt,
        mensajesFinalizados: resFinales.modifiedCount,
        mensajesHuerfanos: resHuerfanos.modifiedCount,
    });
}
