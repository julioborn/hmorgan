"use client";

import { useState } from "react";

interface ModalReviewProps {
    open: boolean;
    onClose: () => void;
    mozoNombre?: string | null;
    onSubmit: (data: { rating: number; comment: string; ratingMozo?: number }) => void;
}

function StarRow({ value, hover, onHover, onLeave, onClick, size = "w-8 h-8" }: {
    value: number; hover: number;
    onHover: (n: number) => void; onLeave: () => void;
    onClick: (n: number) => void; size?: string;
}) {
    return (
        <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
                <svg
                    key={n}
                    onMouseEnter={() => onHover(n)}
                    onMouseLeave={onLeave}
                    onClick={() => onClick(n)}
                    className={`${size} cursor-pointer transition ${(hover || value) >= n ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.286 3.967c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.286-3.967a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                </svg>
            ))}
        </div>
    );
}

export default function ModalReview({ open, onClose, onSubmit, mozoNombre }: ModalReviewProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [ratingMozo, setRatingMozo] = useState(0);
    const [hoverMozo, setHoverMozo] = useState(0);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-36">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative z-50 bg-white rounded-xl p-5 w-[90%] max-w-sm shadow-xl">
                <h2 className="text-lg font-semibold text-center mb-3">
                    ¡Calificá tu experiencia!
                </h2>

                <StarRow
                    value={rating} hover={hover}
                    onHover={setHover} onLeave={() => setHover(0)}
                    onClick={setRating}
                />

                <textarea
                    placeholder="¿Querés dejar un comentario?"
                    className="w-full border rounded-lg p-2 text-sm mt-4"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                {mozoNombre && (
                    <>
                        <div className="my-4 border-t border-gray-100" />
                        <p className="text-sm text-center text-gray-600 mb-3">
                            ¿Cómo fue la atención de{" "}
                            <span className="font-bold text-gray-900">{mozoNombre}</span>?
                        </p>
                        <StarRow
                            value={ratingMozo} hover={hoverMozo} size="w-7 h-7"
                            onHover={setHoverMozo} onLeave={() => setHoverMozo(0)}
                            onClick={setRatingMozo}
                        />
                        {ratingMozo === 0 && (
                            <p className="text-center text-xs text-gray-400 mt-1">Opcional</p>
                        )}
                    </>
                )}

                <div className="flex justify-between mt-5">
                    <button className="px-4 py-2 rounded-lg bg-gray-200" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg bg-black text-white"
                        onClick={() => {
                            if (rating === 0) return alert("Seleccioná una calificación");
                            onSubmit({
                                rating,
                                comment,
                                ratingMozo: ratingMozo > 0 ? ratingMozo : undefined,
                            });
                        }}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}
