export function handleNotification(data: any) {
    console.log("📩 Notificación recibida (foreground):", data);

    const title = data?.notification?.title ?? data?.title ?? "";
    const body = data?.notification?.body ?? data?.body ?? "";

    if (title || body) {
        window.dispatchEvent(new CustomEvent("push-notification", { detail: { title, body } }));
    }
}
