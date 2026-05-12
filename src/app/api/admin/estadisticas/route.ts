import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Pedido } from "@/models/Pedido";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

        await connectMongoDB();

        const pedidos = await Pedido.find({})
            .populate("items.menuItemId", "nombre precio categoria")
            .lean();

        const entregados = pedidos.filter((p: any) => p.estado === "entregado");
        const cancelados = pedidos.filter((p: any) => p.estado === "cancelado");
        const totalIngresos = entregados.reduce((acc: number, p: any) => acc + (p.total || 0), 0);

        const conteos = {
            pendiente: pedidos.filter((p: any) => p.estado === "pendiente").length,
            preparando: pedidos.filter((p: any) => p.estado === "preparando").length,
            listo: pedidos.filter((p: any) => p.estado === "listo").length,
            entregado: entregados.length,
            cancelado: cancelados.length,
        };

        // Items más pedidos
        const itemsMap: Record<string, { nombre: string; cantidad: number; categoria: string }> = {};
        for (const pedido of pedidos) {
            for (const item of (pedido as any).items) {
                const id = item.menuItemId?._id?.toString();
                if (!id || !item.menuItemId?.nombre) continue;
                if (!itemsMap[id]) {
                    itemsMap[id] = { nombre: item.menuItemId.nombre, cantidad: 0, categoria: item.menuItemId.categoria };
                }
                itemsMap[id].cantidad += item.cantidad;
            }
        }
        const itemsPopulares = Object.values(itemsMap)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 8);

        // Pedidos e ingresos por día (últimos 7 días)
        const pedidosPorDia = [];
        const ingresosPorDia = [];

        for (let i = 6; i >= 0; i--) {
            const inicio = new Date();
            inicio.setHours(0, 0, 0, 0);
            inicio.setDate(inicio.getDate() - i);
            const fin = new Date(inicio.getTime() + 86_400_000);

            const del_dia = pedidos.filter((p: any) => {
                const f = new Date(p.createdAt);
                return f >= inicio && f < fin;
            });
            const ingreso = del_dia
                .filter((p: any) => p.estado === "entregado")
                .reduce((acc: number, p: any) => acc + (p.total || 0), 0);

            const label = inicio.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
            pedidosPorDia.push({ fecha: label, cantidad: del_dia.length });
            ingresosPorDia.push({ fecha: label, total: ingreso });
        }

        const totalUsuarios = await User.countDocuments({ role: "cliente" });
        const puntosAgg = await User.aggregate([
            { $match: { role: "cliente" } },
            { $group: { _id: null, total: { $sum: "$puntos" } } },
        ]);
        const totalPuntos = puntosAgg[0]?.total || 0;

        const pedidosEmpleado = pedidos.filter((p: any) => p.fuente === "empleado").length;
        const pedidosCliente = pedidos.length - pedidosEmpleado;

        return NextResponse.json({
            totalIngresos,
            totalPedidos: pedidos.length,
            conteos,
            itemsPopulares,
            pedidosPorDia,
            ingresosPorDia,
            totalUsuarios,
            totalPuntos,
            pedidosEmpleado,
            pedidosCliente,
        });
    } catch (error) {
        console.error("Error estadísticas:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
