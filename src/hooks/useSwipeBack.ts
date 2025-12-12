"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function useSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ⛔️ No permitir swipe en home
    if (pathname === "/") return;

    // 📱 Solo mobile
    if (typeof window !== "undefined" && window.innerWidth > 768) return;

    let startX = 0;
    let currentX = 0;
    let swiping = false;

    const threshold = 90;

    const content = document.getElementById("app-content");
    const backdrop = document.getElementById("swipe-backdrop");

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 24) {
        swiping = true;
        startX = e.touches[0].clientX;
        if (backdrop) backdrop.style.opacity = "1";
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!swiping || !content) return;

      currentX = e.touches[0].clientX - startX;
      if (currentX < 0) currentX = 0;

      content.style.transition = "none";
      content.style.transform = `translateX(${currentX}px)`;
      content.style.boxShadow = `-12px 0 30px rgba(0,0,0,0.15)`;
    };

    const onTouchEnd = () => {
      if (!swiping || !content) return;

      content.style.transition = "transform 0.2s ease-out";

      if (currentX > threshold) {
        // ✅ IMPORTANTE: volver a 0 ANTES de navegar
        content.style.transform = "translateX(0)";
        content.style.boxShadow = "none";

        if (navigator.vibrate) navigator.vibrate(10);

        setTimeout(() => {
          router.back();
        }, 60);
      } else {
        // 🔁 Cancelado → vuelve normal
        content.style.transform = "translateX(0)";
        content.style.boxShadow = "none";
      }

      if (backdrop) backdrop.style.opacity = "0";

      swiping = false;
      startX = 0;
      currentX = 0;
    };

    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, pathname]);
}
