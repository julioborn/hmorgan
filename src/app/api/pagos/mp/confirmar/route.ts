import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";

export async function POST(req: NextRequest) {
    try {
        const { pedidoId, paymentId } = await req.json();
        if (!pedidoId || !paymentId) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: paymentId });

        // Verificar que el external_reference coincide con el pedido
        if (paymentData.external_reference !== pedidoId) {
            return NextResponse.json({ error: "Referencia no coincide" }, { status: 400 });
        }

        const mpEstadoPago =
            paymentData.status === "approved" ? "aprobado"
            : paymentData.status === "rejected" ? "rechazado"
            : "en_proceso";

        const monto = paymentData.transaction_amount ?? 0;

        await connectMongoDB();
        const pedido = await Pedido.findByIdAndUpdate(
            pedidoId,
            { mpPaymentId: paymentId.toString(), mpEstadoPago, montoPagado: monto },
            { new: true }
        );

        if (mpEstadoPago === "aprobado" && pedido) {
            const sesionAbierta = await CajaSession.findOne({ estado: "abierta" });
            if (sesionAbierta) {
                const yaRegistrado = await CajaMovement.findOne({ pedidoId: pedido._id });
                if (!yaRegistrado) {
                    const numero = pedido.numeroDia ? ` #${pedido.numeroDia}` : "";
                    await CajaMovement.create({
                        sesionId:   sesionAbierta._id,
                        tipo:       "ingreso",
                        concepto:   `Pago Mercado Pago - Delivery${numero}`,
                        monto,
                        metodoPago: "mercadopago",
                        pedidoId:   pedido._id,
                        userId:     pedido.userId,
                        items:      pedido.items?.map((it: any) => ({
                            nombre:   it.menuItemId?.nombre ?? "Ítem",
                            cantidad: it.cantidad,
                            precio:   it.menuItemId?.precio ?? 0,
                        })) ?? [],
                    });
                }
            }
        }

        return NextResponse.json({ ok: true, mpEstadoPago });
    } catch (err) {
        console.error("MP confirmar error:", err);
        return NextResponse.json({ error: "Error al confirmar" }, { status: 500 });
    }
}
