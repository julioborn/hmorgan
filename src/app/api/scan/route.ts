import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";
import { getPointsRatio } from "@/lib/getPointsRatio";

// Rate-limit simple por IP
const hits = new Map<string, { count: number, ts: number }>();
function checkRate(ip: string) {
  const now = Date.now();
  const windowMs = 3000;
  const h = hits.get(ip);
  if (!h || now - h.ts > windowMs) {
    hits.set(ip, { count: 1, ts: now });
    return true;
  }
  if (h.count < 5) { h.count++; return true; }
  return false;
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
  const ip = (req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown").toString();
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
    if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { qrToken, consumoARS } = await req.json();
    if (!qrToken || typeof consumoARS !== "number") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await connectMongoDB();

    const user = await User.findOne({ qrToken });
    if (!user) return NextResponse.json({ error: "QR inválido" }, { status: 404 });

    const ratio = await getPointsRatio();
    const puntos = Math.floor(consumoARS * ratio);
    if (puntos <= 0) {
      return NextResponse.json({ ok: true, message: "Consumo muy bajo, 0 puntos" });
    }

    await PointTransaction.create({
      userId: user._id,
      source: "consumo",
      amount: puntos,
      meta: { consumoARS, mozoId: payload.sub },
      pendingReview: true
    });

    user.puntos += puntos;
    await user.save();

    return NextResponse.json({ ok: true, puntosSumados: puntos, total: user.puntos });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al escanear" }, { status: 500 });
  }
}
