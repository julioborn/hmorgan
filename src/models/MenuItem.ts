import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true },
        descripcion: { type: String },
        precio: { type: Number, required: true },
        categoria: { type: String, required: true },
        imagen: { type: String },
        activo: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const MenuItem =
    mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema);
