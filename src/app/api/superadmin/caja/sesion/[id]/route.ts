import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
// These imports register the models needed for the nested populate chain:
// CajaMovement.pedidoId → Pedido → eventoId (Evento), userId/clienteId (User)
import "@/models/Pedido";
import "@/models/Evento";
import "@/models/User";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authStaff(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin", "cajero"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

// Returns full movement detail for one session (with nested populates + product aggregation).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    if (!authStaff(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();

    const sesion = await CajaSession.findById(params.id)
        .populate("abiertaPor", "nombre apellido")
        .populate("cerradaPor", "nombre apellido")
        .lean<any>();
    if (!sesion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const movimientos = await CajaMovement.find({ sesionId: sesion._id })
        .populate("userId", "nombre apellido")
        .populate({
            path: "pedidoId",
            select: "mesa nombreComanda fuente items total eventoId userId clienteId tipoEntrega",
            populate: [
                { path: "items.menuItemId", select: "nombre precio categoria" },
                { path: "userId",    select: "nombre apellido" },
                { path: "clienteId", select: "nombre apellido telefono" },
                { path: "eventoId",  select: "nombre" },
            ],
        })
        .sort({ createdAt: 1 })
        .lean<any[]>();

    // Aggregate products from movements
    const productosMap: Record<string, { nombre: string; categoria: string; cantidad: number; total: number }> = {};
    const pedidosContados = new Set<string>();
    for (const m of movimientos) {
        const pedido = m.pedidoId as any;
        const pid = pedido?._id ? String(pedido._id) : null;
        const isParcial = (m.concepto || "").toLowerCase().includes("parcial");

        if (pid && !isParcial && !pedidosContados.has(pid)) {
            pedidosContados.add(pid);
            for (const it of (pedido.items ?? [])) {
                const mi = it.menuItemId as any;
                if (!mi) continue;
                const k = String(mi._id);
                if (!productosMap[k]) productosMap[k] = { nombre: mi.nombre || "Ítem", categoria: mi.categoria || "", cantidad: 0, total: 0 };
                productosMap[k].cantidad += it.cantidad;
                productosMap[k].total += (mi.precio || 0) * it.cantidad;
            }
        } else if (Array.isArray(m.items) && m.items.length > 0) {
            for (const it of m.items) {
                const k = it.nombre;
                if (!productosMap[k]) productosMap[k] = { nombre: it.nombre, categoria: it.categoria || "", cantidad: 0, total: 0 };
                productosMap[k].cantidad += it.cantidad;
                productosMap[k].total += (it.precio || 0) * it.cantidad;
            }
        }
    }

    // Compute totals from movements
    const totales = movimientos.reduce((acc: Record<string, { ingreso: number; egreso: number; excedente: number }>, m: any) => {
        if (!acc[m.metodoPago]) acc[m.metodoPago] = { ingreso: 0, egreso: 0, excedente: 0 };
        acc[m.metodoPago][m.tipo as "ingreso" | "egreso"] += m.monto;
        if (m.excedente) acc[m.metodoPago].excedente += m.excedente;
        return acc;
    }, {});

    const totalIngreso = movimientos.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const totalEgreso  = movimientos.filter(m => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0);

    return NextResponse.json({
        sesion,
        movimientos,
        productos: productosMap,
        totales,
        totalIngreso,
        totalEgreso,
        neto: totalIngreso - totalEgreso,
        cantMovimientos: movimientos.length,
    });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["superadmin", "admin"].includes(payload.role))
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    await connectMongoDB();
    const sesion = await CajaSession.findById(params.id);
    if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const body = await req.json();

    if (body.accion === "editarCierre") {
        const montoCierre = Number(body.montoCierre);
        if (isNaN(montoCierre) || montoCierre < 0)
            return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

        const movimientos = await CajaMovement.find({ sesionId: sesion._id }).lean<any[]>();
        const efectivoIngreso = movimientos.filter(m => m.tipo === "ingreso" && m.metodoPago === "efectivo").reduce((s, m) => s + m.monto, 0);
        const efectivoEgreso  = movimientos.filter(m => m.tipo === "egreso"  && m.metodoPago === "efectivo").reduce((s, m) => s + m.monto, 0);
        const efectivoSistema = (sesion.montoInicial || 0) + efectivoIngreso - efectivoEgreso;
        const diferencia      = montoCierre - efectivoSistema;

        sesion.montoCierre = montoCierre;
        if (body.notas !== undefined) sesion.notas = body.notas;
        await sesion.save();

        return NextResponse.json({ ok: true, sesion, efectivoSistema, diferencia });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
