export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import { Canje } from "@/models/Canje";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10 });

    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
    const userId = payload.sub;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));

    await connectMongoDB();

    const filter = { userId };

    const [total, items, txAll, canjesCompletados] = await Promise.all([
      PointTransaction.countDocuments(filter),
      PointTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      // Sumar TODAS las transacciones para calcular saldo real
      PointTransaction.aggregate([
        { $match: { userId: require("mongoose").Types.ObjectId.createFromHexString(userId) } },
        { $group: { _id: null, suma: { $sum: "$amount" } } },
      ]),
      // Restar canjes completados
      Canje.aggregate([
        { $match: { userId: require("mongoose").Types.ObjectId.createFromHexString(userId), estado: "completado" } },
        { $group: { _id: null, gastados: { $sum: "$puntosGastados" } } },
      ]),
    ]);

    const sumaTx = txAll[0]?.suma ?? 0;
    const gastados = canjesCompletados[0]?.gastados ?? 0;
    const saldoReal = Math.max(0, sumaTx - gastados);

    // Auto-corregir user.puntos si está desincronizado
    const user = await User.findById(userId).select("puntos").lean() as any;
    if (user && user.puntos !== saldoReal) {
      await User.findByIdAndUpdate(userId, { puntos: saldoReal });
    }

    return NextResponse.json({ items, total, page, pageSize, saldoReal });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10, saldoReal: 0 });
  }
}
