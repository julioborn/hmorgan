import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusherServer";

export async function POST(req: Request, { params }: { params: { pedidoId: string } }) {
    const { pedidoId } = params;
    const { remitente } = await req.json();

    await pusherServer.trigger(`pedido-${pedidoId}`, "usuario-escribiendo", { remitente });

    return NextResponse.json({ ok: true });
}
