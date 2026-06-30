import { Schema, model, models } from "mongoose";

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

const EventoSchema = new Schema(
    {
        nombre:    { type: String, required: true },
        estado:    { type: String, enum: ["activo", "cerrado"], default: "activo" },
        ventas:    [VentaSchema],
        mesas:     [{ type: String }],
        creadoPor: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export const Evento = models.Evento || model("Evento", EventoSchema);
