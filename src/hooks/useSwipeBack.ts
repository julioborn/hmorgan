"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function useSwipeBack() {
    const router = useRouter();
    const startX = useRef(0);
    const currentX = useRef(0);
    const active = useRef(false);
    const threshold = 80; // px necesarios para back
    const edgeZone = 30; // borde izquierdo donde comienza el gesto

    useEffect(() => {
        function onTouchStart(e: TouchEvent) {
            const x = e.touches[0].clientX;

            if (x < edgeZone) {
                active.current = true;
                startX.current = x;
            }
        }

        function onTouchMove(e: TouchEvent) {
            if (!active.current) return;

            currentX.current = e.touches[0].clientX;
            const delta = currentX.current - startX.current;

            if (delta > 0) {
                document.body.style.transform = `translateX(${delta}px)`;
            }
        }

        function onTouchEnd() {
            if (!active.current) return;

            const delta = currentX.current - startX.current;

            // Reinicio del estado
            active.current = false;
            startX.current = 0;
            currentX.current = 0;

            if (delta > threshold) {
                // Swipe válido → ir atrás
                document.body.style.transition = "transform 0.25s ease-out";
                document.body.style.transform = "translateX(100vw)";

                setTimeout(() => {
                    router.back();
                    document.body.style.transition = "";
                    document.body.style.transform = "";
                }, 200);
            } else {
                // Vuelve hacia atrás sin navegar
                document.body.style.transition = "transform 0.25s ease-out";
                document.body.style.transform = "translateX(0)";
                setTimeout(() => {
                    document.body.style.transition = "";
                }, 200);
            }
        }

        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);

        return () => {
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [router]);
}
