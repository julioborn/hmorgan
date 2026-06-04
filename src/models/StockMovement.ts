import { Schema, model, models } from "mongoose";

const StockMovementSchema = new Schema({
    stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
    tipo: { type: String, enum: ["entrada", "salida"], required: true },
    cantidad: { type: Number, required: true },
    motivo: { type: String, required: true },
    precioUnitario: { type: Number },
    notas: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const StockMovement = models.StockMovement || model("StockMovement", StockMovementSchema);
