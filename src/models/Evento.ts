import mongoose, { Schema, model, models } from "mongoose";

const VentaSchema = new Schema(
    {
        items: [
            {
                menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem" },
                nombre:     { type: String, required: true },
                precio:     { type: Number, required: true },
                categoria:  { type: String, required: true },
                cantidad:   { type: Number, required: true },
            },
        ],
        total:         { type: Number, required: true },
        metodoPago:    { type: String, enum: ["efectivo", "transferencia", "tarjeta"], required: true },
        nota:          { type: String },
        comensalesIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

const TarjetaSchema = new Schema(
    {
        cantidad:   { type: Number, required: true },
        metodoPago: { type: String, enum: ["efectivo", "transferencia", "tarjeta"], default: "efectivo" },
    },
    { timestamps: true }
);

const CierreSchema = new Schema(
    {
        fecha:                  { type: Date, default: Date.now },
        // Ventas directas por método
        ventasEfectivo:         { type: Number, default: 0 },
        ventasTransferencia:    { type: Number, default: 0 },
        ventasTarjeta:          { type: Number, default: 0 },
        // Tarjetas de entrada
        entradasCantidad:       { type: Number, default: 0 },
        entradasPrecio:         { type: Number, default: 0 },
        entradasTotal:          { type: Number, default: 0 },
        // Comandas cobradas por método
        comandasEfectivo:       { type: Number, default: 0 },
        comandasTransferencia:  { type: Number, default: 0 },
        comandasTarjeta:        { type: Number, default: 0 },
        // Comandas no cobradas al momento del cierre
        comandasSinCobrar:      { type: Number, default: 0 },
        // Totales consolidados (ventas + comandas cobradas)
        totalEfectivo:          { type: Number, default: 0 },
        totalTransferencia:     { type: Number, default: 0 },
        totalTarjeta:           { type: Number, default: 0 },
        totalGeneral:           { type: Number, default: 0 },
    },
    { _id: false }
);

const EventoSchema = new Schema(
    {
        nombre:         { type: String, required: true },
        estado:         { type: String, enum: ["activo", "cerrado"], default: "activo" },
        ventas:         [VentaSchema],
        mesas:          [{ type: String }],
        precioTarjeta:  { type: Number, default: 0 },
        tarjetas:       [TarjetaSchema],
        creadoPor:      { type: Schema.Types.ObjectId, ref: "User" },
        cierreData:     { type: CierreSchema, default: null },
    },
    { timestamps: true }
);

try { mongoose.deleteModel("Evento"); } catch {}
export const Evento = model("Evento", EventoSchema);
