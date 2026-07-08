import { Schema, model, models } from "mongoose";

const LlamadaMozoSchema = new Schema(
    {
        pedidoId:      { type: Schema.Types.ObjectId, ref: "Pedido", required: true },
        clienteId:     { type: Schema.Types.ObjectId, ref: "User",   required: true },
        clienteNombre: { type: String, required: true },
        mesa:          { type: String },
        mozoId:        { type: Schema.Types.ObjectId, ref: "User" },
        tipo:          { type: String, enum: ["mozo", "cuenta"], default: "mozo" },
        vista:         { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const LlamadaMozo = models.LlamadaMozo || model("LlamadaMozo", LlamadaMozoSchema);
