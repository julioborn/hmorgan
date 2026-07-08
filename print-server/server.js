"use strict";
const express        = require("express");
const { spawnSync }  = require("child_process");
const fs             = require("fs");
const os             = require("os");
const path           = require("path");
const https          = require("https");

const app    = express();
const PORT   = 3001;
const PS1    = path.join(__dirname, "print-raw.ps1");

// ─── Configuración de impresoras ─────────────────────────────────────────────
const IMPRESORA_COCINA = "COCINA";
const IMPRESORA_BARRA  = "BARRA";
// ─── Cloud polling ───────────────────────────────────────────────────────────
const APP_URL   = "https://hmorgan.vercel.app";
const PRINT_KEY = "hmorganprint2024";
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
    res.json({ ok: true, version: "1.2.0" });
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

function buildComanda({ titulo, mesa, cliente, direccion, mozo, hora, items, nota, horarioPreferido }) {
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

    add(ESC, 0x21, 0x10);
    txt(norm(mesa)); add(LF);
    txt("Cliente: " + norm(cliente || "-")); add(LF);
    if (direccion) {
        txt("Dir: " + norm(direccion)); add(LF);
    }
    add(ESC, 0x21, 0x00);

    txt(SEP); add(LF);
    txt("Mozo: " + norm(mozo || "-")); add(LF);
    txt("Hora pedido: " + hora); add(LF);
    if (horarioPreferido) {
        add(ESC, 0x21, 0x10);
        txt("ENTREGAR: " + norm(horarioPreferido)); add(LF);
        add(ESC, 0x21, 0x00);
    }
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

function buildTicket({ mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, descuento, pagos, vuelto, sinPago }) {
    const SEP      = "-".repeat(32);
    const b        = [];
    const add      = (...bytes) => b.push(...bytes);
    const txt      = (s) => b.push(...Buffer.from(norm(s), "ascii"));
    const metLabel = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transf." };

    const descuentoNum = Number(descuento) || 0;
    const totalConDescuento = Math.max(0, total - descuentoNum);
    const pagosArr = !sinPago
        ? (Array.isArray(pagos) && pagos.length > 0
            ? pagos
            : [{ metodo: metodoPago || "efectivo", monto: Number(montoPagado) || total }])
        : [];
    const vueltoNum = Number(vuelto) || 0;

    add(ESC, 0x40);
    add(ESC, 0x61, 0x01);
    add(ESC, 0x45, 0x01);
    txt(sinPago ? "CUENTA" : "TICKET"); add(LF);
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

    if (!sinPago) {
        for (const pago of pagosArr) {
            txt(padLine(metLabel[pago.metodo] || norm(pago.metodo), $$(pago.monto))); add(LF);
        }
        if (vueltoNum > 0) {
            txt(padLine("Vuelto", $$(vueltoNum))); add(LF);
        }
    }
    txt(SEP); add(LF);
    add(ESC, 0x61, 0x01);
    txt("Gracias por su visita!"); add(LF);
    if (!sinPago) txt("Comprobante no valido como factura"); add(LF);

    add(LF, LF, LF);
    add(GS, 0x56, 0x42, 0x03);

    return Buffer.from(b);
}

// ─── Función auxiliar de impresión ───────────────────────────────────────────
function imprimirBuffer(buffer, nombreImpresora, etiqueta) {
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
            return true;
        } else {
            const err = (r.stderr?.toString() || r.stdout?.toString() || "Error desconocido").trim();
            console.error(`[ERR] ${etiqueta}:`, err);
            return false;
        }
    } catch (err) {
        try { fs.unlinkSync(tmpFile); } catch {}
        console.error(`[ERR] ${etiqueta}:`, err.message);
        return false;
    }
}

function imprimir(buffer, nombreImpresora, res, etiqueta) {
    const ok = imprimirBuffer(buffer, nombreImpresora, etiqueta);
    if (ok) res.json({ ok: true });
    else res.status(500).json({ error: "Error de impresión" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cloud polling — busca trabajos pendientes cada 3 segundos
// ═══════════════════════════════════════════════════════════════════════════════
function httpRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || "GET",
            headers: options.headers || {},
        };
        if (body) {
            const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
            reqOptions.headers["Content-Length"] = Buffer.byteLength(bodyStr);
        }
        const req = https.request(reqOptions, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on("error", reject);
        if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
        req.end();
    });
}

let pollingActivo = false;

async function pollPrintJobs() {
    if (pollingActivo) return;
    pollingActivo = true;
    try {
        const res = await httpRequest(`${APP_URL}/api/print-jobs`, {
            headers: { "x-print-key": PRINT_KEY },
        });
        if (res.status !== 200 || !Array.isArray(res.body)) return;
        const jobs = res.body;
        for (const job of jobs) {
            // Marcar como impreso antes de imprimir para evitar duplicados
            await httpRequest(`${APP_URL}/api/print-jobs/${job._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-print-key": PRINT_KEY },
            }, { estado: "impreso" });

            const impresora = job.impresora === "Cocina" ? IMPRESORA_COCINA : IMPRESORA_BARRA;
            if (job.tipo === "ticket") {
                imprimirBuffer(buildTicket(job.payload), impresora, job.payload.sinPago ? "Cuenta" : "Ticket");
            } else if (job.tipo === "comanda") {
                imprimirBuffer(buildComanda(job.payload), impresora, job.payload.titulo || "Comanda");
            }
        }
    } catch (err) {
        // sin internet o app caída — no spamear logs
    } finally {
        pollingActivo = false;
    }
}

setInterval(pollPrintJobs, 3000);

// ═══════════════════════════════════════════════════════════════════════════════
// Endpoints locales (usados por la caja en la misma compu)
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/imprimir/comanda", (req, res) => {
    const { impresora, mesa, cliente, direccion, mozo, hora, items, nota, titulo: tituloCustom, horarioPreferido } = req.body;
    const nombreImpresora = impresora === "Cocina" ? IMPRESORA_COCINA : IMPRESORA_BARRA;
    const titulo           = tituloCustom || (impresora === "Cocina" ? "COCINA" : "BARRA");
    try {
        imprimir(buildComanda({ titulo, mesa, cliente, direccion, mozo, hora, items, nota, horarioPreferido }), nombreImpresora, res, titulo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/imprimir/ticket", (req, res) => {
    const { mesa, fecha, hora, items, total, costoEnvio, metodoPago, montoPagado, descuento, pagos, vuelto, sinPago } = req.body;
    try {
        imprimir(buildTicket({ mesa, fecha, hora, items, total, costoEnvio: costoEnvio || 0, metodoPago, montoPagado, descuento: descuento || 0, pagos, vuelto: vuelto || 0, sinPago: !!sinPago }), IMPRESORA_BARRA, res, sinPago ? "Cuenta" : "Ticket");
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   H. Morgan  ·  Print Server  v1.2  ║");
    console.log("╚══════════════════════════════════════╝\n");
    console.log(`Escuchando en  http://localhost:${PORT}`);
    console.log(`Impresora Cocina : "${IMPRESORA_COCINA}"`);
    console.log(`Impresora Barra  : "${IMPRESORA_BARRA}"`);
    console.log(`Cloud polling    : ${APP_URL} (cada 3s)\n`);

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
