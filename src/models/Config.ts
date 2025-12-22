
import mongoose, { Schema, models, model } from "mongoose";

const ConfigSchema = new Schema(
    {
        _id: {
            type: String,
            default: "global",
        },
        pedidosActivos: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Evita recompilar el modelo en Next.js
const Config = models.Config || model("Config", ConfigSchema, "configs");

export default Config;
