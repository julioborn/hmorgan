import { Schema, model, models } from "mongoose";

const SuscripcionPushSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        endpoint: { type: String, required: true },
        keys: {
            p256dh: String,
            auth: String,
        },
    },
    { timestamps: true }
);

export const SuscripcionPush =
    models.SuscripcionPush || model("SuscripcionPush", SuscripcionPushSchema);
