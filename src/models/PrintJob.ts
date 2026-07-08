import mongoose, { Schema } from "mongoose";

const PrintJobSchema = new Schema({
    tipo:      { type: String, enum: ["ticket", "comanda"], required: true },
    impresora: { type: String, enum: ["Barra", "Cocina"], default: "Barra" },
    payload:   { type: Schema.Types.Mixed, required: true },
    estado:    { type: String, enum: ["pendiente", "impreso", "error"], default: "pendiente" },
}, { timestamps: true });

// Auto-eliminar trabajos impresos/con error después de 10 minutos
PrintJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

export const PrintJob = mongoose.models.PrintJob || mongoose.model("PrintJob", PrintJobSchema);
