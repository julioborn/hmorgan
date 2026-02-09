import { Star } from "lucide-react";

export default function ReviewCard({ review }: any) {
    const { rating, comment, createdAt, userId } = review; // ✅ rating

    const date = new Date(createdAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-lg">
                    {userId?.nombre} {userId?.apellido}
                </h2>

                <span className="text-sm text-gray-500">{date}</span>
            </div>

            {/* ⭐ Estrellas */}
            <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                        key={n}
                        size={20}
                        className={
                            n <= rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                        }
                    />
                ))}
            </div>

            {/* Comentario */}
            {comment && (
                <p className="text-gray-700 text-sm whitespace-pre-line">
                    {comment}
                </p>
            )}
        </div>
    );
}
