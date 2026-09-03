import { PaseCocina } from "@/models/PaseCocina";
import { MenuItem } from "@/models/MenuItem";

const BEBIDAS_CATS = new Set(["CERVEZAS", "VINOS", "GASEOSAS", "JARROS", "COCKTAILS", "WHISKY", "MEDIDAS"]);

type ItemInput = { menuItemId: string; cantidad: number; nota?: string };

export async function crearPaseCocina({
    pedidoId, mesa, nombreComanda, items,
    fuente, tipoEntrega, deliveryNumero, numeroDia,
    direccion, telefonoContacto, eventoId,
}: {
    pedidoId: string;
    mesa?: string;
    nombreComanda?: string;
    items: ItemInput[];
    fuente?: string;
    tipoEntrega?: string;
    deliveryNumero?: number;
    numeroDia?: number;
    direccion?: string;
    telefonoContacto?: string;
    eventoId?: string;
}) {
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }, "nombre categoria").lean<any[]>();
    const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]));

    const itemsComida = items
        .map(i => {
            const m = menuMap.get(i.menuItemId.toString());
            if (!m) return null;
            if (BEBIDAS_CATS.has((m.categoria || "").toUpperCase())) return null;
            return { menuItemId: i.menuItemId, nombre: m.nombre, cantidad: i.cantidad, nota: i.nota };
        })
        .filter(Boolean);

    if (itemsComida.length === 0) return null;

    // Número de pase para esta comanda
    const pasesExistentes = await PaseCocina.countDocuments({ pedidoId });
    const numeroPase = pasesExistentes + 1;

    const pase = await PaseCocina.create({
        pedidoId, mesa, nombreComanda, numeroPase,
        fuente: fuente || "empleado",
        tipoEntrega, deliveryNumero, numeroDia,
        direccion, telefonoContacto,
        eventoId: eventoId || undefined,
        items: itemsComida,
    });

    return pase;
}
