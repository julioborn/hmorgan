// models/Mensaje.ts
import mongoose, { Schema, model, models } from "mongoose";

const MensajeSchema = new Schema(
    {
        pedidoId: { type: Schema.Types.ObjectId, ref: "Pedido", required: true },
        remitente: { type: String, enum: ["cliente", "admin"], required: true },
        texto: { type: String, required: true },
        leido: { type: Boolean, default: false },
        deleteAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// MongoDB borra el documento automáticamente cuando llega la fecha deleteAt
MensajeSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

export default models.Mensaje || model("Mensaje", MensajeSchema);
