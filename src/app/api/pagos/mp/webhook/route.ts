import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";

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

        await connectMongoDB();
        await Pedido.findByIdAndUpdate(pedidoId, {
            mpPaymentId: paymentId.toString(),
            mpEstadoPago,
            montoPagado: paymentData.transaction_amount ?? 0,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("MP webhook error:", err);
        return NextResponse.json({ ok: true }); // siempre 200 para evitar reintentos de MP
    }
}
