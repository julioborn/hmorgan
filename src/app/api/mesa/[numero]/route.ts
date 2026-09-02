import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Mesa } from "@/models/Mesa";
import { Pedido } from "@/models/Pedido";

export async function GET(
  _req: NextRequest,
  { params }: { params: { numero: string } }
) {
  await connectMongoDB();
  const { numero } = params;

  const mesa = await Mesa.findOne({ nombre: numero }).lean();
  if (!mesa) return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });

  const comanda = await Pedido.findOne({
    mesa: numero,
    estado: { $in: ["pendiente", "preparando", "listo"] },
    fuente: "empleado",
  })
    .select("_id mesa nombreComanda estado comensales comensalesIds")
    .lean();

  return NextResponse.json({ mesa, comanda: comanda ?? null });
}
