import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌ MONGODB_URI no encontrada en .env"); process.exit(1); }

// ─────────────────────────────────────────────────────────────────
// Layout basado en la referencia visual del salón (canvas 3:2)
//
//  ┌──────────────────────────────────────────────────────────────┐
//  │ [422-428 top row]                                            │
//  │ [407-409]                    [PUERTA ESCALERA]               │
//  │ [421] [406]  │  [215]        [332][322][312]                 │
//  │ [420] [405] PUERTA [221][214][331][321][311]                 │
//  │ [419] [404]  │  [220][213]   [330][320][310]                 │
//  │ [418] [403]  │       [212] [133][123][113]                   │
//  │ [417] [402] PUERTA   [211] [132][122][112]  [1][2][3][4][5] │
//  │ [416] [401]  │       [210] [131][121][111]  [   BARRA   ]   │
//  │ [415]        │            [130][120][110]                    │
//  │ [414][413][412][411][410]                                    │
//  └──────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────

const MESAS = [
    // ── Sillas de la barra (1-5, redondas) ──────────────────────
    { nombre: "1", forma: "round", capacidad: 1, x: 60, y: 65 },
    { nombre: "2", forma: "round", capacidad: 1, x: 65, y: 65 },
    { nombre: "3", forma: "round", capacidad: 1, x: 70, y: 65 },
    { nombre: "4", forma: "round", capacidad: 1, x: 75, y: 65 },
    { nombre: "5", forma: "round", capacidad: 1, x: 80, y: 65 },

    // ── Afuera — fila superior (422-428) ────────────────────────
    { nombre: "422", forma: "rect", capacidad: 2, x:  3, y:  4 },
    { nombre: "423", forma: "rect", capacidad: 2, x:  9, y:  4 },
    { nombre: "424", forma: "rect", capacidad: 2, x: 15, y:  4 },
    { nombre: "425", forma: "rect", capacidad: 2, x: 21, y:  4 },
    { nombre: "426", forma: "rect", capacidad: 2, x: 27, y:  4 },
    { nombre: "427", forma: "rect", capacidad: 2, x: 33, y:  4 },
    { nombre: "428", forma: "rect", capacidad: 2, x: 39, y:  4 },

    // ── Afuera — segunda fila (407-409) ─────────────────────────
    { nombre: "407", forma: "rect", capacidad: 2, x:  3, y: 11 },
    { nombre: "408", forma: "rect", capacidad: 2, x:  9, y: 11 },
    { nombre: "409", forma: "rect", capacidad: 2, x: 15, y: 11 },

    // ── Afuera — columna izquierda 1 (421 → 410, x=5) ──────────
    { nombre: "421", forma: "rect", capacidad: 4, x:  5, y: 18 },
    { nombre: "420", forma: "rect", capacidad: 4, x:  5, y: 24 },
    { nombre: "419", forma: "rect", capacidad: 4, x:  5, y: 30 },
    { nombre: "418", forma: "rect", capacidad: 4, x:  5, y: 36 },
    { nombre: "417", forma: "rect", capacidad: 4, x:  5, y: 42 },
    { nombre: "416", forma: "rect", capacidad: 4, x:  5, y: 48 },
    { nombre: "415", forma: "rect", capacidad: 4, x:  5, y: 54 },
    { nombre: "414", forma: "rect", capacidad: 4, x:  5, y: 60 },
    { nombre: "413", forma: "rect", capacidad: 4, x:  5, y: 66 },
    { nombre: "412", forma: "rect", capacidad: 4, x:  5, y: 72 },
    { nombre: "411", forma: "rect", capacidad: 4, x:  5, y: 78 },
    { nombre: "410", forma: "rect", capacidad: 4, x:  5, y: 84 },

    // ── Afuera — columna izquierda 2 (406 → 401, x=13) ─────────
    { nombre: "406", forma: "rect", capacidad: 4, x: 13, y: 24 },
    { nombre: "405", forma: "rect", capacidad: 4, x: 13, y: 36 },
    { nombre: "404", forma: "rect", capacidad: 4, x: 13, y: 48 },
    { nombre: "403", forma: "rect", capacidad: 4, x: 13, y: 60 },
    { nombre: "402", forma: "rect", capacidad: 4, x: 13, y: 72 },
    { nombre: "401", forma: "rect", capacidad: 4, x: 13, y: 84 },

    // ── Living izquierdo — columna rect (215 → 210, x=32) ───────
    { nombre: "215", forma: "rect", capacidad: 4, x: 32, y: 24 },
    { nombre: "214", forma: "rect", capacidad: 4, x: 32, y: 35 },
    { nombre: "213", forma: "rect", capacidad: 4, x: 32, y: 46 },
    { nombre: "212", forma: "rect", capacidad: 4, x: 32, y: 57 },
    { nombre: "211", forma: "rect", capacidad: 4, x: 32, y: 68 },
    { nombre: "210", forma: "rect", capacidad: 4, x: 32, y: 79 },

    // ── Living izquierdo — ovaladas (221, 220) ───────────────────
    { nombre: "221", forma: "oval", capacidad: 6, x: 23, y: 39 },
    { nombre: "220", forma: "oval", capacidad: 6, x: 23, y: 59 },

    // ── Living derecho — columna 130-133 (x=41) ─────────────────
    { nombre: "133", forma: "rect", capacidad: 4, x: 41, y: 57 },
    { nombre: "132", forma: "rect", capacidad: 4, x: 41, y: 67 },
    { nombre: "131", forma: "rect", capacidad: 4, x: 41, y: 77 },
    { nombre: "130", forma: "rect", capacidad: 4, x: 41, y: 87 },

    // ── Living derecho — columna 120-123 (x=51) ─────────────────
    { nombre: "123", forma: "rect", capacidad: 4, x: 51, y: 57 },
    { nombre: "122", forma: "rect", capacidad: 4, x: 51, y: 67 },
    { nombre: "121", forma: "rect", capacidad: 4, x: 51, y: 77 },
    { nombre: "120", forma: "rect", capacidad: 4, x: 51, y: 87 },

    // ── Living derecho — columna 110-113 (x=61) ─────────────────
    { nombre: "113", forma: "rect", capacidad: 4, x: 61, y: 57 },
    { nombre: "112", forma: "rect", capacidad: 4, x: 61, y: 67 },
    { nombre: "111", forma: "rect", capacidad: 4, x: 61, y: 77 },
    { nombre: "110", forma: "rect", capacidad: 4, x: 61, y: 87 },

    // ── Zona 3xx — fila superior (332, 322, 312) ─────────────────
    { nombre: "332", forma: "rect", capacidad: 4, x: 70, y: 42 },
    { nombre: "322", forma: "rect", capacidad: 4, x: 77, y: 42 },
    { nombre: "312", forma: "rect", capacidad: 4, x: 84, y: 42 },

    // ── Zona 3xx — fila media (331, 321, 311) ────────────────────
    { nombre: "331", forma: "rect", capacidad: 4, x: 70, y: 52 },
    { nombre: "321", forma: "rect", capacidad: 4, x: 77, y: 52 },
    { nombre: "311", forma: "rect", capacidad: 4, x: 84, y: 52 },

    // ── Zona 3xx — fila inferior (330, 320, 310) ─────────────────
    { nombre: "330", forma: "rect", capacidad: 4, x: 70, y: 62 },
    { nombre: "320", forma: "rect", capacidad: 4, x: 77, y: 62 },
    { nombre: "310", forma: "rect", capacidad: 4, x: 84, y: 62 },
];

// ─── Elementos decorativos ────────────────────────────────────────
const ELEMENTOS = [
    // Puertas (pared divisoria x≈18%)
    { tipo: "puerta",  label: "PUERTA",          x: 18, y: 26, ancho:  5, alto: 4, color: "#fef3c7" },
    { tipo: "puerta",  label: "PUERTA",          x: 18, y: 68, ancho:  5, alto: 4, color: "#fef3c7" },
    // Puerta escalera (esquina superior derecha)
    { tipo: "puerta",  label: "PUERTA ESCALERA", x: 79, y: 14, ancho: 16, alto: 8, color: "#fed7aa" },
    // Barra (arrastrable)
    { tipo: "barra",   label: "BARRA",           x: 72, y: 78, ancho: 25, alto: 9, color: "#b45309" },
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

    // Modo aditivo: crea solo lo que NO existe (no toca posiciones ya guardadas)
    let mesasCreadas = 0;
    for (const def of MESAS) {
        const exists = await Mesa.findOne({ nombre: def.nombre });
        if (!exists) {
            await Mesa.create({ ...def, activa: true });
            console.log(`  + Mesa ${def.nombre}`);
            mesasCreadas++;
        }
    }
    console.log(`✅ ${mesasCreadas} mesas nuevas creadas (${MESAS.length - mesasCreadas} ya existían)\n`);

    let elCreados = 0;
    for (const def of ELEMENTOS) {
        const exists = await SalonElement.findOne({ tipo: def.tipo, label: def.label });
        if (!exists) {
            await SalonElement.create(def);
            console.log(`  + Elemento "${def.label}"`);
            elCreados++;
        }
    }
    console.log(`✅ ${elCreados} elementos nuevos creados`);

    console.log("\n🎉 Listo! Abrí el plano en /superadmin/mesas\n");
    await mongoose.disconnect();
}

main().catch(console.error);
