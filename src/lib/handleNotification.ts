export function handleNotification(data: any) {
    console.log("📩 Notificación recibida:", data);

    // Si viene de Firebase (Android nativo)
    if (data?.notification?.title) {
        alert(`🔥 ${data.notification.title}\n${data.notification.body}`);
    }

    // Si viene del service worker (PWA)
    if (data?.title && data?.body) {
        alert(`🕊️ ${data.title}\n${data.body}`);
    }
}
