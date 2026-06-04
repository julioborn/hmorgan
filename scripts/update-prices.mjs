import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://julioborn:Estudiob123@hmorgancluster.d2ncm2w.mongodb.net/hmorgan?retryWrites=true&w=majority&appName=hmorgancluster";

const MenuItemSchema = new mongoose.Schema({
    nombre: String,
    precio: Number,
    categoria: String,
    descripcion: String,
    activo: Boolean,
    ruleta: Boolean,
}, { timestamps: true });

const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema, "menuitems");

// Nombre del producto en Maxirest → precio nuevo
const precios = [
    // PARRILLA
    ["COSTILLA", 26500],
    ["ENTRAÑA", 26500],
    ["BIFE CHORIZO", 26500],
    // PIZZAS
    ["PIZZA RUCULA", 18000],
    ["PIZZA DE ANANA", 19000],
    ["PIZZA DE PERAS", 18000],
    ["PIZZA 4 QUESOS", 18000],
    ["PIZZA MOZZARELLA", 17000],
    ["PIZZA NAPOLITANA", 17500],
    ["PIZZA ESPECIAL", 17000],
    ["PIZZA CEBOLLADA", 17000],
    ["PIZZA CAPRESE", 19000],
    ["PIZZA CHAMPIGNONES", 19500],
    ["PIZZA POLLO", 18000],
    ["1/2 PIZZA RUCULA", 10000],
    ["1/2 PIZZA DE PERAS", 10000],
    ["1/2 PIZZA 4 QUESOS", 9500],
    ["1/2 PIZZA ANANA", 10000],
    ["1/2 PIZZA MOZZARELLA", 9000],
    ["1/2 PIZZA NAPOLITANA", 9000],
    ["1/2 PIZZA ESPECIAL", 9200],
    ["1/2 PIZZA CAPRESE", 10000],
    ["1/2 PIZZA CHAMPIGNONES", 10300],
    ["1/2 PIZZA POLLO", 9500],
    // HAMBURGUESAS
    ["HAMB. GRATINADA", 11000],
    ["HAMB. ESPECIAL", 11500],
    ["HAMB. HENRY MORGAN", 12500],
    ["HAMB. COMUN", 9500],
    ["HAMB. COMPLETA", 12000],
    ["CARNE EXTRA", 3500],
    // PICADAS
    ["PICADA 2/3 PERSONAS", 29500],
    ["PICADA SALAMIN", 11000],
    ["CAZUELA DE MONDONGO", 3500],
    ["CAZUELA DE SALCHICHAS", 3500],
    ["CAZUELA DE ACEITUNAS", 4500],
    ["CAZUELA DE QUESO HOLANDA", 6500],
    // FRITURAS
    ["MILANESA TERNERA", 11500],
    ["POLLO FRITO", 9500],
    ["FRITAS", 6000],
    ["FRITAS CON CHEDDAR", 8000],
    ["BASTONES DE MOZZARELLA", 5500],
    ["PIZZANESA", 21000],
    // SANDWICHES
    ["SANDWICHS SIMPLE", 7500],
    ["SANDWICHS TRIPLE", 9500],
    ["TOSTADO", 8500],
    ["CARLITO", 8500],
    ["TRIPLE DE POLLO", 11000],
    ["SANDWICH DE BIFE DE CHORIZO", 19000],
    ["TOSTADO POLLO", 11000],
    // ENSALADAS
    ["ENSAL. CESAR CON POLLO", 13000],
    ["ENS. MIXTA", 5500],
    ["ENSAL. MORGAN", 13000],
    // CERVEZAS
    ["ARTESANAL 500cc", 6000],
    ["AMSTEL 1LT", 8000],
    ["SANTA FE 1LT", 7000],
    ["HEINEKEN 1LT", 11000],
    ["CORONA 330cc", 6000],
    ["CORONA 710cc", 10000],
    ["HEINEKEN 330cc", 6000],
    // VINOS
    ["PADRILLOS", 21000],
    ["ALAMOS", 15000],
    ["D.V. CATENA CHARDONNAY", 30000],
    ["D.V. CATENA MALBEC-MALBEC", 39000],
    ["NICASIA", 24000],
    ["SALENTEIN", 17000],
    ["SANTA JULIA", 13000],
    ["SAINT FELICIEN", 23000],
    ["TILIA", 20000],
    ["COPA VINO", 5500],
    ["PRÓFUGO", 13000],
    // GASEOSAS
    ["AGUA S/GAS 500cc", 3000],
    ["AGUA C/GAS 500cc", 3500],
    ["SABORIZADA CHICA", 4000],
    ["COCA 1LTS", 6000],
    ["SPRITE 1LTS", 6000],
    ["SABORIZADA 1LT", 6000],
    ["SPRITE 500cc", 4000],
    ["COCA/COCA ZERO 500cc", 4000],
    ["FANTA 500cc", 4000],
    ["LIMONADA", 3500],
    ["SODA EN PINTA", 2500],
    ["SPEED", 6000],
    ["EXPRIMIDO DE NARANJA", 4500],
    // COCKTAILS
    ["FERNET", 5000],
    ["GANCIA", 5000],
    ["GIN TONIC BEEFEATER", 8000],
    ["GIN TONIC GORDON", 6000],
    ["GIN TONIC TANQUERAY", 9000],
    ["GIN TONIC PINK", 9000],
    ["CYNARD JULEP", 6000],
    ["CAIPIROSKA", 6000],
    ["MOJITO", 6000],
    ["PISCO SOUR", 6000],
    ["NEGRONI", 7000],
    ["APEROL SPRITZ", 7000],
    ["DRY MARTINI", 6000],
    ["CAMPARI", 7000],
    ["SEX ON THE BEACH", 6000],
    ["TOM COLLINS", 6000],
    ["PERLA NEGRA", 9000],
    ["CUBA LIBRE", 5000],
    ["JOHNNIE LEMON", 8000],
    ["VERMUT", 4500],
    // JARROS
    ["FERNET JARRO", 9000],
    ["GANCIA JARRO", 9000],
    ["GIN GORDON JARRO", 9000],
    ["VODKA JARRO", 9000],
    ["MELON JARRO", 9000],
    // ESPUMANTES
    ["CHANDON", 36000],
    ["NIETO SENETINER", 27000],
    ["BARON B", 80000],
    ["COPA CHAMPAGNE", 5500],
    // MEDIDAS
    ["MEDIDA GANCIA", 2000],
    ["MEDIDA VODKA", 2000],
    ["MEDIDA FERNET", 3000],
    ["MEDIDA JAGER", 7000],
    // WHISKY
    ["WHISKY JOHNNIE BLACK", 9000],
    ["WHISKY JOHNNIE RED", 7000],
    ["WHISKY JOHNNIE DOBLE BLACK", 11000],
    ["WHISKY JOHNNIE 18 AÑOS", 36000],
    ["WHISKY JACK DANIELS TENESSE", 11000],
    ["WHISKY VAT 69", 3000],
    // POSTRE Y CAFE
    ["POSTRE", 7000],
    ["CAFE", 3000],
];

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado a MongoDB\n");

    let actualizados = 0;
    let noEncontrados = [];

    for (const [nombre, precio] of precios) {
        // Búsqueda case-insensitive con acento flexible
        const resultado = await MenuItem.findOneAndUpdate(
            { nombre: { $regex: new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: { precio } },
            { new: true }
        );

        if (resultado) {
            console.log(`✅ ${resultado.nombre}: $${resultado.precio.toLocaleString("es-AR")}`);
            actualizados++;
        } else {
            noEncontrados.push(nombre);
        }
    }

    console.log(`\n--- RESUMEN ---`);
    console.log(`Actualizados: ${actualizados}`);
    if (noEncontrados.length > 0) {
        console.log(`\nNo encontrados en DB (revisar nombre):`);
        noEncontrados.forEach(n => console.log(`  ❌ ${n}`));
    }

    await mongoose.disconnect();
}

main().catch(console.error);
