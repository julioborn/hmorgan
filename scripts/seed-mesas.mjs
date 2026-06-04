import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌ MONGODB_URI no encontrada en .env"); process.exit(1); }

// ─── Definición de mesas ───────────────────────────────────────────
const MESAS = [
    // ── Sillas barra (1-5, redondas) ─────────────────────────────
    { nombre: "1",   forma: "round", capacidad: 1, x: 63, y: 73 },
    { nombre: "2",   forma: "round", capacidad: 1, x: 67, y: 73 },
    { nombre: "3",   forma: "round", capacidad: 1, x: 71, y: 73 },
    { nombre: "4",   forma: "round", capacidad: 1, x: 75, y: 73 },
    { nombre: "5",   forma: "round", capacidad: 1, x: 79, y: 73 },

    // ── Afuera — fila superior (422-428) ────────────────────────
    { nombre: "422", forma: "rect",  capacidad: 2, x:  5, y:  5 },
    { nombre: "423", forma: "rect",  capacidad: 2, x: 11, y:  5 },
    { nombre: "424", forma: "rect",  capacidad: 2, x: 17, y:  5 },
    { nombre: "425", forma: "rect",  capacidad: 2, x: 23, y:  5 },
    { nombre: "426", forma: "rect",  capacidad: 2, x: 29, y:  5 },
    { nombre: "427", forma: "rect",  capacidad: 2, x: 35, y:  5 },
    { nombre: "428", forma: "rect",  capacidad: 2, x: 41, y:  5 },

    // ── Afuera — segunda fila (407-409) ─────────────────────────
    { nombre: "407", forma: "rect",  capacidad: 2, x:  5, y: 12 },
    { nombre: "408", forma: "rect",  capacidad: 2, x: 11, y: 12 },
    { nombre: "409", forma: "rect",  capacidad: 2, x: 17, y: 12 },

    // ── Afuera — columna izquierda 1 (421 → 410) ────────────────
    { nombre: "421", forma: "rect",  capacidad: 4, x:  4, y: 20 },
    { nombre: "420", forma: "rect",  capacidad: 4, x:  4, y: 26 },
    { nombre: "419", forma: "rect",  capacidad: 4, x:  4, y: 32 },
    { nombre: "418", forma: "rect",  capacidad: 4, x:  4, y: 38 },
    { nombre: "417", forma: "rect",  capacidad: 4, x:  4, y: 44 },
    { nombre: "416", forma: "rect",  capacidad: 4, x:  4, y: 50 },
    { nombre: "415", forma: "rect",  capacidad: 4, x:  4, y: 56 },
    { nombre: "414", forma: "rect",  capacidad: 4, x:  4, y: 62 },
    { nombre: "413", forma: "rect",  capacidad: 4, x:  4, y: 68 },
    { nombre: "412", forma: "rect",  capacidad: 4, x:  4, y: 74 },
    { nombre: "411", forma: "rect",  capacidad: 4, x:  4, y: 80 },
    { nombre: "410", forma: "rect",  capacidad: 4, x:  4, y: 86 },

    // ── Afuera — columna izquierda 2 (406 → 401) ────────────────
    { nombre: "406", forma: "rect",  capacidad: 4, x: 12, y: 28 },
    { nombre: "405", forma: "rect",  capacidad: 4, x: 12, y: 37 },
    { nombre: "404", forma: "rect",  capacidad: 4, x: 12, y: 46 },
    { nombre: "403", forma: "rect",  capacidad: 4, x: 12, y: 55 },
    { nombre: "402", forma: "rect",  capacidad: 4, x: 12, y: 64 },
    { nombre: "401", forma: "rect",  capacidad: 4, x: 12, y: 73 },

    // ── Living izquierdo — columna (215 → 210) ──────────────────
    { nombre: "215", forma: "rect",  capacidad: 4, x: 32, y: 28 },
    { nombre: "214", forma: "rect",  capacidad: 4, x: 32, y: 39 },
    { nombre: "213", forma: "rect",  capacidad: 4, x: 32, y: 50 },
    { nombre: "212", forma: "rect",  capacidad: 4, x: 32, y: 61 },
    { nombre: "211", forma: "rect",  capacidad: 4, x: 32, y: 72 },
    { nombre: "210", forma: "rect",  capacidad: 4, x: 32, y: 83 },

    // ── Living izquierdo — mesas ovaladas ───────────────────────
    { nombre: "221", forma: "oval",  capacidad: 6, x: 22, y: 47 },
    { nombre: "220", forma: "oval",  capacidad: 6, x: 22, y: 66 },

    // ── Living derecho — columna 110-113 ────────────────────────
    { nombre: "113", forma: "rect",  capacidad: 4, x: 51, y: 50 },
    { nombre: "112", forma: "rect",  capacidad: 4, x: 51, y: 61 },
    { nombre: "111", forma: "rect",  capacidad: 4, x: 51, y: 72 },
    { nombre: "110", forma: "rect",  capacidad: 4, x: 51, y: 83 },

    // ── Living derecho — columna 120-123 ────────────────────────
    { nombre: "123", forma: "rect",  capacidad: 4, x: 61, y: 50 },
    { nombre: "122", forma: "rect",  capacidad: 4, x: 61, y: 61 },
    { nombre: "121", forma: "rect",  capacidad: 4, x: 61, y: 72 },
    { nombre: "120", forma: "rect",  capacidad: 4, x: 61, y: 83 },

    // ── Living derecho — columna 130-133 ────────────────────────
    { nombre: "133", forma: "rect",  capacidad: 4, x: 71, y: 50 },
    { nombre: "132", forma: "rect",  capacidad: 4, x: 71, y: 61 },
    { nombre: "131", forma: "rect",  capacidad: 4, x: 71, y: 72 },
    { nombre: "130", forma: "rect",  capacidad: 4, x: 71, y: 83 },
];

// ─── Elementos decorativos ────────────────────────────────────────
const ELEMENTOS = [
    { tipo: "puerta",  label: "PUERTA",         x: 20, y: 22, ancho:  5, alto: 4, color: "#fef3c7" },
    { tipo: "puerta",  label: "PUERTA",         x: 20, y: 67, ancho:  5, alto: 4, color: "#fef3c7" },
    { tipo: "puerta",  label: "PUERTA ESCALERA",x: 76, y: 13, ancho: 12, alto: 7, color: "#fed7aa" },
];

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
    const mongoose = (await import("mongoose")).default;

    const MesaSchema = new mongoose.Schema({
        nombre: String, activa: { type: Boolean, default: true },
        x: Number, y: Number, forma: String, capacidad: Number,
    }, { strict: false });

    const SalonElementSchema = new mongoose.Schema({
        tipo: String, label: String,
        x: Number, y: Number, ancho: Number, alto: Number, color: String,
    }, { strict: false });

    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB\n");

    const Mesa = mongoose.models.Mesa || mongoose.model("Mesa", MesaSchema);
    const SalonElement = mongoose.models.SalonElement || mongoose.model("SalonElement", SalonElementSchema);

    // ── Mesas ──
    let creadas = 0, actualizadas = 0;
    for (const def of MESAS) {
        const exists = await Mesa.findOne({ nombre: def.nombre });
        if (exists) {
            await Mesa.updateOne({ nombre: def.nombre }, { $set: def });
            actualizadas++;
        } else {
            await Mesa.create({ ...def, activa: true });
            creadas++;
        }
    }
    console.log(`Mesas: ${creadas} creadas, ${actualizadas} actualizadas`);

    // ── Elementos decorativos ──
    // Solo los crea si no existen (por label+tipo)
    let elCreados = 0;
    for (const def of ELEMENTOS) {
        const exists = await SalonElement.findOne({ tipo: def.tipo, label: def.label, x: def.x });
        if (!exists) {
            await SalonElement.create(def);
            elCreados++;
        }
    }
    console.log(`Elementos: ${elCreados} creados`);

    console.log("\n✅ Listo!\n");
    await mongoose.disconnect();
}

main().catch(console.error);
