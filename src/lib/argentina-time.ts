const TZ = "America/Argentina/Buenos_Aires";

/** Fecha de "hoy" en Argentina, como "YYYY-MM-DD" (independiente del huso horario del server/cliente) */
export function hoyArgentina(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

/** Hora actual en Argentina, como { h, m } */
export function ahoraArgentina(): { h: number; m: number } {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find(p => p.type === "minute")?.value ?? "0");
    return { h, m };
}

/** Formatea una fecha guardada (medianoche UTC = día calendario) sin que se corra de día */
export function formatArgDate(fecha: Date | string, opts: Intl.DateTimeFormatOptions): string {
    return new Date(fecha).toLocaleDateString("es-AR", { timeZone: "UTC", ...opts });
}
