import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Evento } from "@/models/Evento";
import { User } from "@/models/User";
import { PointTransaction } from "@/models/PointTransaction";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import { getPointsRatio } from "@/lib/getPointsRatio";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();
    const evento = await Evento.findById(params.id).lean();
    if (!evento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(evento);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["cajero", "admin", "superadmin", "empleado"].includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();
    const evento = await Evento.findById(params.id);
    if (!evento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();

    if (body.accion === "updateMesas") {
        evento.mesas = Array.isArray(body.mesas) ? body.mesas : [];
        await evento.save();
        return NextResponse.json({ ok: true, evento });
    }

    if (body.accion === "agregarTarjetas") {
        const cantidad = Number(body.cantidad);
        if (!cantidad || cantidad < 1) return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
        const metodoPago = body.metodoPago || "efectivo";
        evento.tarjetas.push({ cantidad, metodoPago });
        await evento.save();
        const precioTarjeta = (evento as any).precioTarjeta ?? 0;
        const totalTarjetas = cantidad * precioTarjeta;
        if (totalTarjetas > 0) {
            const sesion = await CajaSession.findOne({ estado: "abierta" });
            if (sesion) {
                await CajaMovement.create({
                    sesionId: sesion._id, tipo: "ingreso",
                    concepto: `Entradas evento: ${evento.nombre} (${cantidad}×)`,
                    monto: totalTarjetas, metodoPago, userId: payload.sub,
                });
            }
        }
        return NextResponse.json({ ok: true, evento });
    }

    if (body.accion === "eliminarTarjeta") {
        const { tarjetaId } = body;
        if (!tarjetaId) return NextResponse.json({ error: "tarjetaId requerido" }, { status: 400 });
        const tarjetas = evento.tarjetas as any[];
        const idx = tarjetas.findIndex((t: any) => t._id.toString() === tarjetaId);
        if (idx === -1) return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
        tarjetas.splice(idx, 1);
        await evento.save();
        return NextResponse.json({ ok: true, evento });
    }

    if (body.accion === "cerrar") {
        if (evento.estado === "cerrado") {
            return NextResponse.json({ error: "El evento ya está cerrado" }, { status: 400 });
        }
        evento.estado = "cerrado";
        if (body.cierreData) {
            const cd = body.cierreData;
            (evento as any).cierreData = {
                fecha:                  new Date(),
                ventasEfectivo:         Number(cd.ventasEfectivo)         || 0,
                ventasTransferencia:    Number(cd.ventasTransferencia)    || 0,
                ventasTarjeta:          Number(cd.ventasTarjeta)          || 0,
                entradasCantidad:       Number(cd.entradasCantidad)       || 0,
                entradasPrecio:         Number(cd.entradasPrecio)         || 0,
                entradasTotal:          Number(cd.entradasTotal)          || 0,
                comandasEfectivo:       Number(cd.comandasEfectivo)       || 0,
                comandasTransferencia:  Number(cd.comandasTransferencia)  || 0,
                comandasTarjeta:        Number(cd.comandasTarjeta)        || 0,
                comandasSinCobrar:      Number(cd.comandasSinCobrar)      || 0,
                totalEfectivo:          Number(cd.totalEfectivo)          || 0,
                totalTransferencia:     Number(cd.totalTransferencia)     || 0,
                totalTarjeta:           Number(cd.totalTarjeta)           || 0,
                totalGeneral:           Number(cd.totalGeneral)           || 0,
            };
        }
        await evento.save();
        return NextResponse.json({ ok: true, evento });
    }

    if (body.accion === "eliminarVenta") {
        const { ventaId } = body;
        if (!ventaId) return NextResponse.json({ error: "ventaId requerido" }, { status: 400 });
        await Evento.findByIdAndUpdate(params.id, { $pull: { ventas: { _id: ventaId } } });
        const updated = await Evento.findById(params.id);
        return NextResponse.json({ ok: true, evento: updated });
    }

    if (body.accion === "agregarVenta") {
        const { items, metodoPago, nota, comensalesIds } = body;
        if (!items?.length || !metodoPago) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        if (evento.estado === "cerrado") {
            return NextResponse.json({ error: "El evento está cerrado" }, { status: 400 });
        }
        const total = items.reduce((acc: number, i: any) => acc + i.precio * i.cantidad, 0);
        evento.ventas.push({
            items, total, metodoPago,
            nota: nota || undefined,
            comensalesIds: Array.isArray(comensalesIds) && comensalesIds.length > 0 ? comensalesIds : [],
        });
        await evento.save();

        const sesion = await CajaSession.findOne({ estado: "abierta" });
        if (sesion) {
            await CajaMovement.create({
                sesionId: sesion._id, tipo: "ingreso",
                concepto: `Venta directa evento: ${evento.nombre}`,
                monto: total, metodoPago, userId: payload.sub,
            });
        }

        // Acreditar puntos a cada comensal registrado
        if (Array.isArray(comensalesIds) && comensalesIds.length > 0 && total > 0) {
            const ratio = await getPointsRatio();
            const puntos = Math.floor(total * ratio);
            if (puntos > 0) {
                for (const uid of comensalesIds) {
                    const cliente = await User.findById(uid);
                    if (cliente && cliente.role === "cliente") {
                        await PointTransaction.create({
                            userId: cliente._id, source: "consumo", amount: puntos,
                            notes: `Venta en evento: ${evento.nombre}`,
                            meta: { eventoId: evento._id, consumoARS: total }, pendingReview: true,
                        });
                        cliente.puntos = (cliente.puntos || 0) + puntos;
                        cliente.needsReview = true;
                        await cliente.save();
                    }
                }
            }
        }

        return NextResponse.json({ ok: true, evento });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
