// src/app/debug/push/page.tsx
"use client";

import { useEffect, useState } from "react";
import { registerSW, subscribeUser } from "@/lib/push-client";

type WhoAmI = { user?: { _id: string; nombre: string; role: string } } | null;

export default function PushDebugPage() {
    const [who, setWho] = useState<WhoAmI>(null);
    const [perm, setPerm] = useState<NotificationPermission>("default");
    const [subEndpoint, setSubEndpoint] = useState<string | null>(null);
    const [postStatus, setPostStatus] = useState<string>("");
    const [count, setCount] = useState<number | null>(null);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                // 1) quién soy
                const me = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" }).then(r => r.json()).catch(() => null);
                setWho(me);

                // 2) permiso
                setPerm(Notification.permission);

                // 3) registrar SW
                const reg = await registerSW();
                if (!reg) { setError("Service Worker no disponible."); return; }

                // 4) pedir permiso si hace falta
                if (Notification.permission === "default") {
                    const p = await Notification.requestPermission();
                    setPerm(p);
                    if (p !== "granted") { setError("Permiso de notificaciones no concedido."); return; }
                } else if (Notification.permission !== "granted") {
                    setError("Permiso de notificaciones denegado en el navegador.");
                    return;
                }

                // 5) suscribirme y SIEMPRE postear al backend
                try {
                    const sub = await subscribeUser(reg);
                    const endpoint = sub?.endpoint || null;
                    setSubEndpoint(endpoint);
                } catch (e: any) {
                    setError("Fallo subscribeUser: " + (e?.message || "desconocido"));
                    return;
                }

                // 6) leer conteo desde el backend (GET /api/push/subscribe)
                const debug = await fetch("/api/push/subscribe", { cache: "no-store", credentials: "same-origin" });
                const dbgJson = await debug.json().catch(() => ({}));
                setCount(dbgJson?.count ?? 0);
                setPostStatus(`GET /api/push/subscribe => ${debug.status} ${JSON.stringify(dbgJson)}`);
            } catch (e: any) {
                setError(e?.message || "Error inesperado");
            }
        })();
    }, []);

    return (
        <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
            <h1 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Debug Push</h1>

            <div style={{ marginBottom: 8 }}>
                <div><b>Auth:</b> {who?.user ? `${who.user.nombre} (${who.user.role})` : "NO LOGUEADO"}</div>
                <div><b>Permiso:</b> {perm}</div>
                <div><b>Endpoint sub:</b> {subEndpoint || "(sin suscripción en navegador)"} </div>
                <div><b>Backend count:</b> {count === null ? "…" : count}</div>
                <div><b>Estado:</b> {postStatus || "…"} </div>
                {error && <div style={{ color: "#ef4444" }}><b>Error:</b> {error}</div>}
            </div>

            <small style={{ opacity: 0.7 }}>
                Tips: este panel usa <code>/api/auth/me</code>, <code>registerSW()</code>, <code>subscribeUser()</code> y <code>GET /api/push/subscribe</code>.
                Si estás en HTTP (no localhost) o en otro dominio/subdominio, la cookie de sesión no viaja y el POST al subscribe dará 401.
            </small>
        </div>
    );
}
