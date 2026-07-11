import { Star } from "lucide-react";

function Stars({ rating, size = 20 }: { rating: number; size?: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={size} className={n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
            ))}
        </div>
    );
}

export default function ReviewCard({ review }: any) {
    const { rating, ratingMozo, comment, createdAt, userId, mozoId } = review;

    const date = new Date(createdAt).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const mozoNombre = mozoId
        ? [mozoId.nombre, mozoId.apellido].filter(Boolean).join(" ") || mozoId.username
        : null;

    return (
        <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{userId?.nombre} {userId?.apellido}</h2>
                <span className="text-sm text-gray-500">{date}</span>
            </div>

            {/* Calificación del local */}
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Local</p>
                <Stars rating={rating} />
            </div>

            {/* Calificación del mozo (si existe) */}
            {mozoNombre && ratingMozo != null && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                        Mozo · <span className="text-gray-600 font-bold normal-case">{mozoNombre}</span>
                    </p>
                    <Stars rating={ratingMozo} size={16} />
                </div>
            )}

            {comment && (
                <p className="text-gray-700 text-sm whitespace-pre-line border-t border-gray-100 pt-2">{comment}</p>
            )}
        </div>
    );
}
