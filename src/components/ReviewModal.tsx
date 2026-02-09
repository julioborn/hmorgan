"use client";

import { useState } from "react";

interface ModalReviewProps {
    open: boolean;
    onClose: () => void;

    // ⬇️ Ahora onSubmit puede recibir datos adicionales
    onSubmit: (data: { rating: number; comment: string }) => void;
}

export default function ModalReview({ open, onClose, onSubmit }: ModalReviewProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-36">
            {/* Fondo oscuro */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            ></div>

            {/* Contenido */}
            <div className="relative z-50 bg-white rounded-xl p-5 w-[90%] max-w-sm shadow-xl">
                <h2 className="text-lg font-semibold text-center mb-3">
                    ¡Calificá tu experiencia!
                </h2>

                {/* Estrellas */}
                <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <svg
                            key={n}
                            onMouseEnter={() => setHover(n)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => setRating(n)}
                            className={`w-8 h-8 cursor-pointer transition ${(hover || rating) >= n ? "text-yellow-400" : "text-gray-300"
                                }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.286 3.967c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.286-3.967a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                        </svg>
                    ))}
                </div>

                {/* Comentario */}
                <textarea
                    placeholder="¿Querés dejar un comentario?"
                    className="w-full border rounded-lg p-2 text-sm"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                {/* Botones */}
                <div className="flex justify-between mt-5">
                    <button
                        className="px-4 py-2 rounded-lg bg-gray-200"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        className="px-4 py-2 rounded-lg bg-black text-white"
                        onClick={() => {
                            if (rating === 0) return alert("Selecciona una calificación");
                            onSubmit({ rating, comment });
                        }}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
