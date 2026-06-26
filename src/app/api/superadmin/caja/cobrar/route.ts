import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { getPointsRatio } from "@/lib/getPointsRatio";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["superadmin", "admin", "cajero"].includes(payload.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

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

    // Acreditar puntos (una sola vez)
    if (!pedido.puntosAcreditados && pedido.total > 0) {
        const ratio = await getPointsRatio();
        const puntos = Math.floor(pedido.total * ratio);
        const comensalesIds: string[] = (pedido as any).comensalesIds ?? [];

        if (comensalesIds.length > 0 && puntos > 0) {
            // Acreditar a cada comensal identificado
            for (const uid of comensalesIds) {
                const cliente = await User.findById(uid);
                if (cliente && cliente.role === "cliente") {
                    await PointTransaction.create({
                        userId: cliente._id, source: "consumo", amount: puntos,
                        notes: `Cobrado en caja (comensal)`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total }, pendingReview: true,
                    });
                    cliente.puntos = (cliente.puntos || 0) + puntos;
                    cliente.needsReview = true;
                    await cliente.save();
                }
            }
            await Pedido.findByIdAndUpdate(pedidoId, { puntosAcreditados: true });
        } else {
            // Fallback: clienteId único o pedido de la app
            const clienteRef = (pedido as any).clienteId
                ? (pedido as any).clienteId
                : pedido.fuente === "cliente" ? pedido.userId : null;
            if (clienteRef && puntos > 0) {
                const clienteDoc = await User.findById(clienteRef);
                if (clienteDoc && clienteDoc.role === "cliente") {
                    await PointTransaction.create({
                        userId: clienteDoc._id, source: "consumo", amount: puntos,
                        notes: `Cobrado en caja${pedido.fuente === "empleado" ? " (comanda)" : " (pedido app)"}`,
                        meta: { pedidoId: pedido._id, consumoARS: pedido.total }, pendingReview: true,
                    });
                    clienteDoc.puntos = (clienteDoc.puntos || 0) + puntos;
                    clienteDoc.needsReview = true;
                    await clienteDoc.save();
                    await Pedido.findByIdAndUpdate(pedidoId, { puntosAcreditados: true });
                }
            }
        }
    }

    return NextResponse.json({ ok: true, pedido });
}
