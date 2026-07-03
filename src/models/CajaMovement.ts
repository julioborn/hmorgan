import { Schema, model, models } from "mongoose";

const CajaMovementSchema = new Schema({
    sesionId:   { type: Schema.Types.ObjectId, ref: "CajaSession", required: true },
    tipo:       { type: String, enum: ["ingreso", "egreso"], required: true },
    concepto:   { type: String, required: true },
    monto:      { type: Number, required: true },
    excedente:  { type: Number, default: 0 },
    descuento:  { type: Number, default: 0 },
    metodoPago: { type: String, default: "efectivo" },
    pedidoId:   { type: Schema.Types.ObjectId, ref: "Pedido" },
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [{
        nombre:    { type: String },
        cantidad:  { type: Number },
        precio:    { type: Number },
        categoria: { type: String },
        _id: false,
    }],
}, { timestamps: true });

export const CajaMovement = models.CajaMovement || model("CajaMovement", CajaMovementSchema);
