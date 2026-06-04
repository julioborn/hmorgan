import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://julioborn:Estudiob123@hmorgancluster.d2ncm2w.mongodb.net/hmorgan?retryWrites=true&w=majority&appName=hmorgancluster";

const updates = [
    ["BIFE DE CHORIZO", 26500],
    ["PIZZA DE RUCULA", 18000],
    ["PIZZA DE CHAMPIGNONES", 19500],
    ["PIZZA DE POLLO", 18000],
    ["1/2 PIZZA DE RUCULA", 10000],
    ["1/2 PIZZA DE ANANA", 10000],
    ["1/2 PIZZA DE MOZZARELLA", 9000],
    ["1/2 PIZZA DE CHAMPIGNONES", 10300],
    ["1/2 PIZZA DE POLLO", 9500],
    ["HAMBURGUESA GRATINADA", 11000],
    ["HAMBURGUESA ESPECIAL", 11500],
    ["HAMBURGUESA HENRY MORGAN", 12500],
    ["HAMBURGUESA COMUN", 9500],
    ["HAMBURGUESA COMPLETA", 12000],
    ["SANDWICH SIMPLE", 7500],
    ["SANDWICH TRIPLE", 9500],
    ["ENSALADA CESAR CON POLLO", 13000],
    ["ENSALADA MIXTA", 5500],
    ["ENSALADA MORGAN", 13000],
    ["AMSTEL", 8000],
    ["SANTA FE", 7000],
    ["HEINEKEN", 11000],
    ["SPRITE 1.5LTS", 6000],
    ["VINO SANTA JULIA", 13000],
];

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado a MongoDB\n");

    const col = mongoose.connection.db.collection("menuitems");
    let ok = 0;
    const fail = [];

    for (const [nombre, precio] of updates) {
        const escaped = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const r = await col.findOneAndUpdate(
            { nombre: { $regex: new RegExp(`^${escaped}$`, "i") } },
            { $set: { precio } }
        );
        if (r) {
            console.log(`✅ ${nombre}: $${precio.toLocaleString("es-AR")}`);
            ok++;
        } else {
            fail.push(nombre);
        }
    }

    console.log(`\nActualizados: ${ok}`);
    if (fail.length) {
        console.log("No encontrados:");
        fail.forEach(n => console.log(`  ❌ ${n}`));
    }

    await mongoose.disconnect();
}

main().catch(console.error);
