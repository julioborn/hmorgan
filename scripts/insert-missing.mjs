import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://julioborn:Estudiob123@hmorgancluster.d2ncm2w.mongodb.net/hmorgan?retryWrites=true&w=majority&appName=hmorgancluster";

const nuevos = [
    // PICADAS (donde viven las frituras)
    { nombre: "MILANESA TERNERA", precio: 11500, categoria: "PICADAS", descripcion: "", activo: true, ruleta: false },
    { nombre: "PIZZANESA", precio: 21000, categoria: "PICADAS", descripcion: "Toppings a elección: versión gratinada, henry morgan, napolitana, a caballo, etc.", activo: true, ruleta: false },

    // SANDWICHES
    { nombre: "SANDWICH DE BIFE DE CHORIZO", precio: 19000, categoria: "SANDWICHES", descripcion: "Bife de chorizo a la parrilla, provoleta, morrones asados", activo: true, ruleta: false },

    // CERVEZAS
    { nombre: "CORONA 710cc", precio: 10000, categoria: "CERVEZAS", descripcion: "", activo: true, ruleta: false },

    // VINOS
    { nombre: "PADRILLOS", precio: 21000, categoria: "VINOS", descripcion: "Malbec", activo: true, ruleta: false },
    { nombre: "ALAMOS", precio: 15000, categoria: "VINOS", descripcion: "Malbec, malbec rosé", activo: true, ruleta: false },
    { nombre: "D.V. CATENA CHARDONNAY", precio: 30000, categoria: "VINOS", descripcion: "", activo: true, ruleta: false },
    { nombre: "D.V. CATENA MALBEC-MALBEC", precio: 39000, categoria: "VINOS", descripcion: "", activo: true, ruleta: false },
    { nombre: "NICASIA", precio: 24000, categoria: "VINOS", descripcion: "Malbec grand blend", activo: true, ruleta: false },
    { nombre: "TILIA", precio: 20000, categoria: "VINOS", descripcion: "Chenin blanc", activo: true, ruleta: false },
    { nombre: "PRÓFUGO", precio: 13000, categoria: "VINOS", descripcion: "Chenin dulce", activo: true, ruleta: false },

    // GASEOSAS
    { nombre: "SABORIZADA CHICA", precio: 4000, categoria: "GASEOSAS", descripcion: "", activo: true, ruleta: false },
    { nombre: "SABORIZADA 1LT", precio: 6000, categoria: "GASEOSAS", descripcion: "Naranja, manzana", activo: true, ruleta: false },

    // COCKTAILS
    { nombre: "GIN TONIC GORDON", precio: 6000, categoria: "COCKTAILS", descripcion: "Gin, tonica, cítrico", activo: true, ruleta: false },

    // JARROS
    { nombre: "GIN GORDON JARRO", precio: 9000, categoria: "JARROS", descripcion: "Gin tonic gordon, tonica, cítrico", activo: true, ruleta: false },
];

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado a MongoDB\n");

    const col = mongoose.connection.db.collection("menuitems");
    let insertados = 0;
    let omitidos = [];

    for (const item of nuevos) {
        const existe = await col.findOne({ nombre: { $regex: new RegExp(`^${item.nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
        if (existe) {
            omitidos.push(item.nombre);
            console.log(`⚠️  Ya existe: ${item.nombre}`);
        } else {
            await col.insertOne({ ...item, createdAt: new Date(), updatedAt: new Date() });
            console.log(`✅ Insertado: ${item.nombre} — $${item.precio.toLocaleString("es-AR")} (${item.categoria})`);
            insertados++;
        }
    }

    console.log(`\nInsertados: ${insertados}`);
    if (omitidos.length) console.log(`Omitidos (ya existían): ${omitidos.join(", ")}`);

    await mongoose.disconnect();
}

main().catch(console.error);
