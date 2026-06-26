import { Schema, model, models } from "mongoose";

const PedidoSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: [
            {
                menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
                cantidad: { type: Number, required: true },
                // false = se agregó después de aceptada y todavía no se imprimió en BARRA/COCINA
                impreso: { type: Boolean, default: true },
            },
        ],
        tipoEntrega: { type: String, enum: ["retira", "envio"], default: "retira" },
        direccion: { type: String },
        total: { type: Number },
        costoEnvio: { type: Number, default: 0 },
        estado: {
            type: String,
            enum: ["pendiente", "preparando", "listo", "entregado", "cancelado", "cerrado"],
            default: "pendiente",
        },
        cancelableUntil: { type: Date },
        repartidorAfuera: { type: Boolean, default: false },
        fuente: { type: String, enum: ["cliente", "empleado"], default: "cliente" },
        numeroDia: { type: Number },
        mesa: { type: String },
        comensales: { type: Number, default: 0 },
        nombreComanda: { type: String },
        notaEmpleado: { type: String },
        notaCliente: { type: String },
        puntosAcreditados: { type: Boolean, default: false },
        metodoPago: { type: String },
        montoPagado: { type: Number },
        clienteId:      { type: Schema.Types.ObjectId, ref: "User" },
        eventoId:       { type: Schema.Types.ObjectId, ref: "Evento" },
        comensalesIds:  [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

export const Pedido = models.Pedido || model("Pedido", PedidoSchema);
