import mongoose, { Schema, model } from "mongoose";

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

try { mongoose.deleteModel("LlamadaMozo"); } catch {}
export const LlamadaMozo = model("LlamadaMozo", LlamadaMozoSchema);
