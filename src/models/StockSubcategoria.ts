import { Schema, model, models } from "mongoose";

const StockSubcategoriaSchema = new Schema({
    tipo: { type: String, enum: ["cocina", "bebida"], required: true },
    nombre: { type: String, required: true },
}, { timestamps: true });

export const StockSubcategoria = models.StockSubcategoria || model("StockSubcategoria", StockSubcategoriaSchema);
