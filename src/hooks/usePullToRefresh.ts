"use client";

import { useEffect, useRef } from "react";

const THRESHOLD = 72;  // px de arrastre para disparar el reload
const DAMPEN   = 0.45; // resistencia al arrastre

export function usePullToRefresh() {
    const startY   = useRef(0);
    const pulling  = useRef(false);
    const dist     = useRef(0);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.innerWidth > 768) return; // solo mobile

        const content   = document.getElementById("app-content");
        const indicator = document.getElementById("pull-indicator");
        const arrow     = document.getElementById("pull-arrow");

        function reset() {
            pulling.current = false;
            dist.current = 0;

            if (content) {
                content.style.transition = "transform 0.25s ease-out";
                content.style.transform  = "translateX(0)";
            }
            if (indicator) {
                indicator.style.transition = "opacity 0.2s, transform 0.25s ease-out";
                indicator.style.opacity    = "0";
                indicator.style.transform  = "translateX(-50%) translateY(-56px)";
            }
        }

        const onTouchStart = (e: TouchEvent) => {
            // No activar si la página está scrolleada hacia abajo
            if (window.scrollY > 2) return;
            // No pisar la zona de swipe-back (borde izquierdo)
            if (e.touches[0].clientX < 28) return;

            pulling.current = true;
            startY.current  = e.touches[0].clientY;
            dist.current    = 0;

            if (content)   { content.style.transition   = "none"; }
            if (indicator) { indicator.style.transition = "none"; }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!pulling.current) return;

            const dy = e.touches[0].clientY - startY.current;
            if (dy <= 0) { pulling.current = false; return; }

            dist.current = Math.min(dy * DAMPEN, THRESHOLD + 24);

            const progress = Math.min(dist.current / THRESHOLD, 1);
            const deg      = progress * 270;

            if (content) {
                content.style.transform = `translateY(${dist.current}px)`;
            }

            if (indicator) {
                indicator.style.opacity   = String(progress);
                indicator.style.transform = `translateX(-50%) translateY(${dist.current - 52}px)`;
            }

            if (arrow) {
                // Rota el ícono a medida que se arrastra
                arrow.style.transform = progress >= 1
                    ? "rotate(0deg)"   // listo para soltar
                    : `rotate(${deg}deg)`;
                arrow.style.opacity = progress >= 1 ? "1" : "0.7";
            }

            if (dist.current > 6) e.preventDefault();
        };

        const onTouchEnd = () => {
            if (!pulling.current) return;

            const d = dist.current;
            reset();

            if (d >= THRESHOLD) {
                if (navigator.vibrate) navigator.vibrate(12);
                setTimeout(() => window.location.reload(), 160);
            }
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove",  onTouchMove,  { passive: false });
        document.addEventListener("touchend",   onTouchEnd);

        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove",  onTouchMove);
            document.removeEventListener("touchend",   onTouchEnd);
        };
    }, []);
}
