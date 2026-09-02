import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    return jwt.verify(token, SECRET) as any;
  } catch { return null; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { numero: string } }
) {
  const payload = getPayload(req);
  if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (payload.role !== "cliente") return NextResponse.json({ error: "Solo clientes pueden unirse" }, { status: 403 });

  await connectMongoDB();
  const { numero } = params;

  const comanda = await Pedido.findOne({
    mesa: numero,
    estado: { $in: ["pendiente", "preparando", "listo"] },
    fuente: "empleado",
  });

  if (!comanda) {
    return NextResponse.json(
      { error: "No hay comanda activa en esta mesa. Pedí al mozo que te abra una." },
      { status: 404 }
    );
  }

  const userId = payload.sub;
  const yaEsComensal = comanda.comensalesIds.some(
    (id: any) => id.toString() === userId
  );
  if (!yaEsComensal) {
    comanda.comensalesIds.push(userId as any);
    await comanda.save();
  }

  return NextResponse.json({
    ok: true,
    yaEstaba: yaEsComensal,
    comanda: { _id: comanda._id, mesa: comanda.mesa },
  });
}
