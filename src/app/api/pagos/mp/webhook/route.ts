import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (body.type !== "payment") {
            return NextResponse.json({ ok: true });
        }

        const paymentId = body.data?.id;
        if (!paymentId) return NextResponse.json({ ok: true });

        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: paymentId });

        const pedidoId = paymentData.external_reference;
        if (!pedidoId) return NextResponse.json({ ok: true });

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

        // Registrar en caja si el pago fue aprobado y hay sesión abierta
        if (mpEstadoPago === "aprobado" && pedido) {
            const sesionAbierta = await CajaSession.findOne({ estado: "abierta" });
            if (sesionAbierta) {
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

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("MP webhook error:", err);
        return NextResponse.json({ ok: true }); // siempre 200 para evitar reintentos de MP
    }
}
