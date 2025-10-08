import mongoose, { Schema, model, models, Model } from "mongoose";

const MenuItemSchema = new Schema(
    {
        nombre: { type: String, required: true },
        descripcion: String,
        precio: { type: Number, required: true },
        categoria: { type: String, required: true },
        imagen: String,
        activo: { type: Boolean, default: true },
        ruleta: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ✅ Se fuerza la colección exacta "menuitems" para evitar inconsistencias
export const MenuItem: Model<any> =
    models.MenuItem || model("MenuItem", MenuItemSchema, "menuitems");
