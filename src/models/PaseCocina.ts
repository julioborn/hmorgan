import { Schema, model, models } from "mongoose";

const ItemPaseSchema = new Schema({
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nombre:     { type: String, required: true },
    cantidad:   { type: Number, required: true },
    nota:       { type: String },
    listo:      { type: Boolean, default: false },
}, { _id: true });

const PaseCocinaSchema = new Schema({
    pedidoId:         { type: Schema.Types.ObjectId, ref: "Pedido", required: true },
    mesa:             { type: String },
    nombreComanda:    { type: String },
    numeroPase:       { type: Number, default: 1 },
    fuente:           { type: String, enum: ["empleado", "cliente", "autoservicio"], default: "empleado" },
    tipoEntrega:      { type: String },
    deliveryNumero:   { type: Number },
    numeroDia:        { type: Number },
    direccion:        { type: String },
    telefonoContacto: { type: String },
    eventoId:         { type: Schema.Types.ObjectId },
    items:            { type: [ItemPaseSchema], required: true },
    estado:           { type: String, enum: ["pendiente", "listo"], default: "pendiente" },
}, { timestamps: true });

export const PaseCocina = models.PaseCocina || model("PaseCocina", PaseCocinaSchema);
