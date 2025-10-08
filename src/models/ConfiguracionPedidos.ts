import mongoose, { Schema } from "mongoose";

const ConfigPedidosSchema = new Schema({
    activo: { type: Boolean, default: false },
});

export const ConfiguracionPedidos =
    mongoose.models.ConfiguracionPedidos ||
    mongoose.model("ConfiguracionPedidos", ConfigPedidosSchema);
