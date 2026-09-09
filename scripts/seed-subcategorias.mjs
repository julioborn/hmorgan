import { MongoClient } from "mongodb";

const URI = "mongodb+srv://julioborn:Estudiob123@hmorgancluster.d2ncm2w.mongodb.net/hmorgan?retryWrites=true&w=majority&appName=hmorgancluster";

const SUBCATS = [
    // bebida
    { tipo: "bebida", nombre: "Cervezas" },
    { tipo: "bebida", nombre: "Gaseosas" },
    { tipo: "bebida", nombre: "Vinos" },
    { tipo: "bebida", nombre: "Espumantes" },
    // cocina
    { tipo: "cocina", nombre: "Lácteos" },
    { tipo: "cocina", nombre: "Fiambres" },
    { tipo: "cocina", nombre: "Verduras" },
    { tipo: "cocina", nombre: "Carnes" },
    { tipo: "cocina", nombre: "Harinas y Rebozador" },
    { tipo: "cocina", nombre: "Condimentos" },
    { tipo: "cocina", nombre: "Aderezos" },
    { tipo: "cocina", nombre: "Repostería" },
    { tipo: "cocina", nombre: "Salsas" },
    { tipo: "cocina", nombre: "Preparados" },
    { tipo: "cocina", nombre: "Rebozados" },
    { tipo: "cocina", nombre: "Otros" },
];

const client = new MongoClient(URI);

try {
    await client.connect();
    const db = client.db("hmorgan");
    const col = db.collection("stocksubcategorias");

    let insertadas = 0;
    let omitidas = 0;

    for (const s of SUBCATS) {
        const existe = await col.findOne({ tipo: s.tipo, nombre: s.nombre });
        if (existe) {
            console.log(`  ⚠  Ya existe: [${s.tipo}] ${s.nombre}`);
            omitidas++;
        } else {
            await col.insertOne({ ...s, createdAt: new Date(), updatedAt: new Date() });
            console.log(`  ✓  Insertada: [${s.tipo}] ${s.nombre}`);
            insertadas++;
        }
    }

    console.log(`\nListo: ${insertadas} insertadas, ${omitidas} ya existían.`);

    // Mostrar qué categorias tienen los stock items actualmente
    const stocks = await db.collection("stocks").distinct("categoria");
    console.log("\nCategorías actuales en los ítems de stock:", stocks);

} finally {
    await client.close();
}
