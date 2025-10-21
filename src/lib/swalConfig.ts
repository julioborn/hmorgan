import Swal from "sweetalert2";

export const swalBase = Swal.mixin({
    background: "#0b0b0b", // negro elegante
    color: "#fff",
    confirmButtonColor: "#ef4444", // rojo Tailwind
    cancelButtonColor: "#666",
    customClass: {
        popup: "rounded-2xl shadow-xl border border-red-600/20",
        title: "text-white font-semibold",
        htmlContainer: "text-gray-300",
        confirmButton: "bg-red-600 text-white rounded-lg px-5 py-2 font-semibold hover:bg-red-500",
        cancelButton: "bg-gray-700 text-white rounded-lg px-5 py-2 font-semibold hover:bg-gray-600",
    },
    // 🔥 Al abrir cualquier alerta, eliminamos el ícono de éxito duplicado
    didOpen: () => {
        // Elimina los dos trazos internos del icono de éxito
        document
            .querySelectorAll(
                ".swal2-success-circular-line-left, .swal2-success-circular-line-right, .swal2-success-fix"
            )
            .forEach((el) => ((el as HTMLElement).style.display = "none"));

        // Elimina el ícono cuadrado verde
        const smallCheck = document.querySelector(".swal2-success-ring");
        if (smallCheck) (smallCheck as HTMLElement).style.display = "none";

        // Opcional: reducir el tamaño del ícono principal
        const icon = document.querySelector(".swal2-success") as HTMLElement | null;
        if (icon) icon.style.transform = "scale(0.8)";
    },
});
