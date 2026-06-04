import { Schema, model, models } from "mongoose";

const StockSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    categoria: { type: String, default: "General" },
    unidad: { type: String, default: "unidades" },
    stockActual: { type: Number, default: 0 },
    stockMinimo: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
}, { timestamps: true });

export const Stock = models.Stock || model("Stock", StockSchema);
