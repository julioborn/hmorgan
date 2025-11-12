"use client";

import { useEffect } from "react";
import { App, BackButtonListenerEvent } from "@capacitor/app";

export function useAndroidBackButton() {
    useEffect(() => {
        const listener = App.addListener(
            "backButton",
            (event: BackButtonListenerEvent) => {
                const currentPath = window.location.pathname;

                // ❌ Evita volver a /login o /register si el usuario ya está dentro de la app
                if (["/login", "/register"].includes(currentPath)) {
                    App.exitApp();
                    return;
                }

                // ✅ Si hay historial, retrocede
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            }
        );

        return () => {
            listener.then((l) => l.remove());
        };
    }, []);
}
