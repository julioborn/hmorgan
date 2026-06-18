"use strict";
const express = require("express");
const printer = require("@thiagoelg/node-printer");

const app = express();
const PORT = 3001;

// ─── Configuración de impresoras ─────────────────────────────────────────────
// Deben coincidir EXACTAMENTE con los nombres en Windows:
// Inicio → Configuración → Bluetooth y dispositivos → Impresoras y escáneres
const IMPRESORA_COCINA = "COCINA";
const IMPRESORA_BARRA  = "BARRA";
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());

// CORS — localhost solo es accesible desde la misma PC, * es seguro aquí
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin",  "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// ─── GET /estado — para que la app sepa si el servidor está corriendo ────────
app.get("/estado", (_req, res) => {
    res.json({ ok: true, version: "1.0.0" });
});

// ─── GET /impresoras — lista las impresoras instaladas en este sistema ────────
app.get("/impresoras", (_req, res) => {
    try {
        const lista = printer.getPrinters().map(p => ({
            nombre:          p.name,
            estado:          p.status,
            predeterminada:  p.isDefault,
        }));
        res.json(lista);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESC/POS helpers — protocolo nativo de las impresoras térmicas
// ═══════════════════════════════════════════════════════════════════════════════
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

// Quita tildes y caracteres no-ASCII para compatibilidad con el código de página
// del firmware de la impresora
function norm(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\x00-\x7E]/g, "?");
}

// Formato peso argentino: $5.600
function $$(n) {
    return "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));
}

// Línea de 32 caracteres con texto izquierda y precio derecha
function padLine(izq, der, ancho = 32) {
    const pad = ancho - izq.length - der.length;
    if (pad <= 1) return izq.substring(0, ancho - der.length - 1) + " " + der;
    return izq + " ".repeat(pad) + der;
}

// ─── Comanda (cocina o barra) ─────────────────────────────────────────────────
function buildComanda({ titulo, mesa, cliente, hora, items, nota }) {
    const SEP = "-".repeat(32);
    const b   = [];
    const add = (...bytes) => b.push(...bytes);
    const txt = (s) => b.push(...Buffer.from(norm(s), "ascii"));

    // Inicializar impresora
    add(ESC, 0x40);

    // Título grande y centrado
    add(ESC, 0x61, 0x01);   // centrar
    add(ESC, 0x21, 0x30);   // doble ancho + doble alto
    txt(titulo); add(LF);
    add(ESC, 0x21, 0x00);   // tamaño normal
    add(ESC, 0x61, 0x00);   // alinear izquierda

    // Separador y datos del pedido
    txt(SEP); add(LF);
    txt(norm(mesa)); add(LF);
    txt("Cliente: " + norm(cliente)); add(LF);
    txt("Hora:    " + hora); add(LF);
    txt(SEP); add(LF);

    // Ítems en texto alto (más fácil de leer en cocina/barra)
    add(ESC, 0x21, 0x10);   // doble alto
    for (const item of items) {
        txt(item.cantidad + "x " + norm(item.nombre)); add(LF);
    }
    add(ESC, 0x21, 0x00);   // tamaño normal

    txt(SEP); add(LF);

    // Nota del pedido (si hay)
    if (nota) {
        txt(">> " + norm(nota)); add(LF);
        txt(SEP); add(LF);
    }

    // Avanzar papel y cortar
    add(LF, LF, LF);
    add(GS, 0x56, 0x42, 0x03); // corte parcial con avance de 3 líneas

    return Buffer.from(b);
}

// ─── Ticket de cobro ──────────────────────────────────────────────────────────
function buildTicket({ mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, vuelto }) {
    const SEP      = "-".repeat(32);
    const b        = [];
    const add      = (...bytes) => b.push(...bytes);
    const txt      = (s) => b.push(...Buffer.from(norm(s), "ascii"));
    const metLabel = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transf." };

    // Inicializar
    add(ESC, 0x40);

    // Encabezado centrado
    add(ESC, 0x61, 0x01);
    add(ESC, 0x45, 0x01);   // bold on
    txt("TICKET"); add(LF);
    add(ESC, 0x45, 0x00);   // bold off
    txt("H. Morgan Bar"); add(LF);
    txt("Mesa " + norm(String(mesa))); add(LF);
    txt(fecha + "  " + hora); add(LF);

    // Ítems con precios
    add(ESC, 0x61, 0x00);   // alinear izquierda
    txt(SEP); add(LF);
    for (const item of items) {
        const izq = item.cantidad + "x " + norm(item.nombre);
        const der = $$(item.precio * item.cantidad);
        txt(padLine(izq, der)); add(LF);
    }
    if (costoEnvio > 0) {
        txt(padLine("Envio a domicilio", $$(costoEnvio))); add(LF);
    }

    // Total en grande
    txt(SEP); add(LF);
    add(ESC, 0x21, 0x10);   // doble alto
    add(ESC, 0x45, 0x01);   // bold on
    txt(padLine("TOTAL", $$(total))); add(LF);
    add(ESC, 0x45, 0x00);
    add(ESC, 0x21, 0x00);

    // Método de pago y vuelto
    txt(padLine(metLabel[metodoPago] || metodoPago, $$(montoPagado))); add(LF);
    if (vuelto > 0) {
        txt(padLine("Vuelto", $$(vuelto))); add(LF);
    }

    // Pie centrado
    txt(SEP); add(LF);
    add(ESC, 0x61, 0x01);
    txt("Gracias por su visita!"); add(LF);
    txt("Comprobante no valido como factura"); add(LF);

    // Avanzar y cortar
    add(LF, LF, LF);
    add(GS, 0x56, 0x42, 0x03);

    return Buffer.from(b);
}

// ─── Función auxiliar para imprimir ──────────────────────────────────────────
function imprimir(buffer, nombreImpresora, res, etiqueta) {
    printer.printDirect({
        data:    buffer,
        printer: nombreImpresora,
        type:    "RAW",
        success: (jobID) => {
            console.log(`[OK] ${etiqueta} → "${nombreImpresora}" (job ${jobID})`);
            res.json({ ok: true, jobID });
        },
        error: (err) => {
            console.error(`[ERR] ${etiqueta}:`, err);
            res.status(500).json({ error: String(err) });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

// POST /imprimir/comanda
// Body: { impresora: "Cocina"|"Barra", mesa, cliente, hora, items: [{cantidad, nombre}], nota? }
app.post("/imprimir/comanda", (req, res) => {
    const { impresora, mesa, cliente, hora, items, nota } = req.body;
    const nombreImpresora = impresora === "Cocina" ? IMPRESORA_COCINA : IMPRESORA_BARRA;
    const titulo          = impresora === "Cocina" ? "COMANDA COCINA" : "COMANDA BARRA";

    try {
        const buf = buildComanda({ titulo, mesa, cliente, hora, items, nota });
        imprimir(buf, nombreImpresora, res, titulo);
    } catch (err) {
        console.error("[ERR] buildComanda:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /imprimir/ticket
// Body: { mesa, fecha, hora, items: [{cantidad, nombre, precio}], total, costoEnvio, metodoPago, montoPagado, vuelto }
app.post("/imprimir/ticket", (req, res) => {
    const { mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, vuelto } = req.body;

    try {
        const buf = buildTicket({ mesa, fecha, hora, items, total, costoEnvio: costoEnvio || 0, metodoPago, montoPagado, vuelto: vuelto || 0 });
        imprimir(buf, IMPRESORA_BARRA, res, "Ticket");
    } catch (err) {
        console.error("[ERR] buildTicket:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   H. Morgan  ·  Print Server  v1.0  ║");
    console.log("╚══════════════════════════════════════╝\n");
    console.log(`Escuchando en  http://localhost:${PORT}`);
    console.log(`Impresora Cocina : "${IMPRESORA_COCINA}"`);
    console.log(`Impresora Barra  : "${IMPRESORA_BARRA}"\n`);

    try {
        const lista = printer.getPrinters();
        console.log("Impresoras detectadas en este sistema:");
        lista.forEach(p => console.log(`  ${p.isDefault ? "→" : " "} ${p.name}`));
    } catch {
        console.log("(No se pudieron listar las impresoras)");
    }

    console.log("\nCtrl+C para detener\n");
});
