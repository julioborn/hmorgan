import Configuracion from "@/models/Configuracion";
import { connectMongoDB } from "./mongodb";

export async function getPointsRatio() {
    try {
        await connectMongoDB();
        const conf = await Configuracion.findOne({ clave: "pointsPerARS" });
        if (conf?.valor && typeof conf.valor === "number") return conf.valor;
    } catch (e) {
        console.error("⚠️ Error obteniendo ratio dinámico:", e);
    }
    // Fallback al .env si no hay registro en la DB
    return Number(process.env.POINTS_PER_ARS ?? 0.001);
}
