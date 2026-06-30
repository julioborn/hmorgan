"use strict";
const express        = require("express");
const { spawnSync }  = require("child_process");
const fs             = require("fs");
const os             = require("os");
const path           = require("path");

const app    = express();
const PORT   = 3001;
const PS1    = path.join(__dirname, "print-raw.ps1");

// ─── Configuración de impresoras ─────────────────────────────────────────────
const IMPRESORA_COCINA = "COCINA";
const IMPRESORA_BARRA  = "BARRA";
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin",  "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

app.get("/estado", (_req, res) => {
    res.json({ ok: true, version: "1.1.0" });
});

app.get("/impresoras", (_req, res) => {
    const r = spawnSync("powershell", [
        "-NoProfile", "-Command",
        "Get-Printer | Select-Object Name, PrinterStatus, Default | ConvertTo-Json"
    ], { timeout: 5000 });

    try {
        const raw  = JSON.parse(r.stdout.toString());
        const lista = Array.isArray(raw) ? raw : [raw];
        res.json(lista.map(p => ({ nombre: p.Name, estado: p.PrinterStatus, predeterminada: p.Default })));
    } catch {
        res.json([]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESC/POS helpers
// ═══════════════════════════════════════════════════════════════════════════════
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

function norm(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\x00-\x7E]/g, "?");
}

function $$(n) {
    return "$" + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 }).format(Math.round(n));
}

function padLine(izq, der, ancho = 32) {
    const pad = ancho - izq.length - der.length;
    if (pad <= 1) return izq.substring(0, ancho - der.length - 1) + " " + der;
    return izq + " ".repeat(pad) + der;
}

function buildComanda({ titulo, mesa, cliente, direccion, mozo, hora, items, nota }) {
    const SEP = "-".repeat(32);
    const b   = [];
    const add = (...bytes) => b.push(...bytes);
    const txt = (s) => b.push(...Buffer.from(norm(s), "ascii"));

    add(ESC, 0x40);
    add(ESC, 0x61, 0x01);
    add(ESC, 0x21, 0x30);
    txt(titulo); add(LF);
    add(ESC, 0x21, 0x00);
    add(ESC, 0x61, 0x00);

    txt(SEP); add(LF);

    // Datos del cliente en letra grande: Mesa, Nombre, Dirección
    add(ESC, 0x21, 0x10);
    txt(norm(mesa)); add(LF);
    txt("Cliente: " + norm(cliente || "-")); add(LF);
    if (direccion) {
        txt("Dir: " + norm(direccion)); add(LF);
    }
    add(ESC, 0x21, 0x00);

    txt(SEP); add(LF);
    txt("Mozo: " + norm(mozo || "-")); add(LF);
    txt("Hora: " + hora); add(LF);
    txt(SEP); add(LF);

    add(ESC, 0x21, 0x10);
    for (const item of items) {
        txt(item.cantidad + "x " + norm(item.nombre)); add(LF);
        if (item.nota) {
            add(ESC, 0x21, 0x00);
            txt("   -> " + norm(item.nota)); add(LF);
            add(ESC, 0x21, 0x10);
        }
    }
    add(ESC, 0x21, 0x00);

    txt(SEP); add(LF);
    if (nota) {
        txt(">> " + norm(nota)); add(LF);
        txt(SEP); add(LF);
    }

    add(LF, LF, LF);
    add(GS, 0x56, 0x42, 0x03);

    return Buffer.from(b);
}

function buildTicket({ mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, descuento, pagos, vuelto }) {
    const SEP      = "-".repeat(32);
    const b        = [];
    const add      = (...bytes) => b.push(...bytes);
    const txt      = (s) => b.push(...Buffer.from(norm(s), "ascii"));
    const metLabel = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transf." };

    const descuentoNum = Number(descuento) || 0;
    const totalConDescuento = Math.max(0, total - descuentoNum);
    // Soporte formato nuevo (pagos array) y viejo (metodoPago/montoPagado)
    const pagosArr = Array.isArray(pagos) && pagos.length > 0
        ? pagos
        : [{ metodo: metodoPago || "efectivo", monto: Number(montoPagado) || total }];
    const vueltoNum = Number(vuelto) || 0;

    add(ESC, 0x40);
    add(ESC, 0x61, 0x01);
    add(ESC, 0x45, 0x01);
    txt("TICKET"); add(LF);
    add(ESC, 0x45, 0x00);
    txt("H. Morgan Bar"); add(LF);
    txt("Mesa " + norm(String(mesa))); add(LF);
    txt(fecha + "  " + hora); add(LF);

    add(ESC, 0x61, 0x00);
    txt(SEP); add(LF);
    for (const item of items) {
        txt(padLine(item.cantidad + "x " + norm(item.nombre), $$(item.precio * item.cantidad))); add(LF);
    }
    if (costoEnvio > 0) {
        txt(padLine("Envio a domicilio", $$(costoEnvio))); add(LF);
    }

    txt(SEP); add(LF);
    add(ESC, 0x21, 0x10);
    add(ESC, 0x45, 0x01);
    txt(padLine("TOTAL", $$(total))); add(LF);
    add(ESC, 0x45, 0x00);
    add(ESC, 0x21, 0x00);

    if (descuentoNum > 0) {
        txt(padLine("Descuento", "- " + $$(descuentoNum))); add(LF);
        add(ESC, 0x21, 0x10);
        txt(padLine("A COBRAR", $$(totalConDescuento))); add(LF);
        add(ESC, 0x21, 0x00);
    }

    for (const pago of pagosArr) {
        txt(padLine(metLabel[pago.metodo] || norm(pago.metodo), $$(pago.monto))); add(LF);
    }
    if (vueltoNum > 0) {
        txt(padLine("Vuelto", $$(vueltoNum))); add(LF);
    }

    txt(SEP); add(LF);
    add(ESC, 0x61, 0x01);
    txt("Gracias por su visita!"); add(LF);
    txt("Comprobante no valido como factura"); add(LF);

    add(LF, LF, LF);
    add(GS, 0x56, 0x42, 0x03);

    return Buffer.from(b);
}

// ─── Función auxiliar de impresión (vía PowerShell, sin addons nativos) ──────
function imprimir(buffer, nombreImpresora, res, etiqueta) {
    const tmpFile = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
    try {
        fs.writeFileSync(tmpFile, buffer);
        const r = spawnSync("powershell", [
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", PS1,
            "-Printer", nombreImpresora,
            "-DataFile", tmpFile,
        ], { timeout: 15000 });

        try { fs.unlinkSync(tmpFile); } catch {}

        if (r.status === 0) {
            console.log(`[OK] ${etiqueta} → "${nombreImpresora}"`);
            res.json({ ok: true });
        } else {
            const err = (r.stderr?.toString() || r.stdout?.toString() || "Error desconocido").trim();
            console.error(`[ERR] ${etiqueta}:`, err);
            res.status(500).json({ error: err });
        }
    } catch (err) {
        try { fs.unlinkSync(tmpFile); } catch {}
        console.error(`[ERR] ${etiqueta}:`, err.message);
        res.status(500).json({ error: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/imprimir/comanda", (req, res) => {
    const { impresora, mesa, cliente, direccion, mozo, hora, items, nota, titulo: tituloCustom } = req.body;
    const nombreImpresora = impresora === "Cocina" ? IMPRESORA_COCINA : IMPRESORA_BARRA;
    const titulo           = tituloCustom || (impresora === "Cocina" ? "COCINA" : "BARRA");
    try {
        imprimir(buildComanda({ titulo, mesa, cliente, direccion, mozo, hora, items, nota }), nombreImpresora, res, titulo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/imprimir/ticket", (req, res) => {
    const { mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, descuento, pagos, vuelto } = req.body;
    try {
        imprimir(buildTicket({ mesa, fecha, hora, items, total, costoEnvio: costoEnvio || 0, metodoPago, montoPagado, descuento: descuento || 0, pagos, vuelto: vuelto || 0 }), IMPRESORA_BARRA, res, "Ticket");
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   H. Morgan  ·  Print Server  v1.1  ║");
    console.log("╚══════════════════════════════════════╝\n");
    console.log(`Escuchando en  http://localhost:${PORT}`);
    console.log(`Impresora Cocina : "${IMPRESORA_COCINA}"`);
    console.log(`Impresora Barra  : "${IMPRESORA_BARRA}"\n`);

    const r = spawnSync("powershell", [
        "-NoProfile", "-Command",
        "Get-Printer | Select-Object -ExpandProperty Name"
    ], { timeout: 5000 });
    if (r.status === 0) {
        const nombres = r.stdout.toString().trim().split(/\r?\n/).filter(Boolean);
        console.log("Impresoras detectadas:");
        nombres.forEach(n => console.log("  " + n));
    }
    console.log("\nCtrl+C para detener\n");
});
