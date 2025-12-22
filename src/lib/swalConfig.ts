import Swal from "sweetalert2";

export const swalBase = Swal.mixin({
    background: "#0b0b0b",
    color: "#fff",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#666",

    customClass: {
        popup: "rounded-2xl shadow-xl border border-red-600/20 z-[100000]",
        title: "text-white font-semibold",
        htmlContainer: "text-gray-300",
        confirmButton:
            "bg-red-600 text-white rounded-lg px-5 py-2 font-semibold hover:bg-red-500",
        cancelButton:
            "bg-gray-700 text-white rounded-lg px-5 py-2 font-semibold hover:bg-gray-600",
    },

    didOpen: () => {
        // 🔥 FORZAR Z-INDEX (popup + backdrop)
        const popup = document.querySelector(".swal2-popup") as HTMLElement | null;
        const backdrop = document.querySelector(".swal2-backdrop") as HTMLElement | null;

        if (popup) popup.style.zIndex = "100000";
        if (backdrop) backdrop.style.zIndex = "99999";

        // 🔥 Limpiar ícono success
        document
            .querySelectorAll(
                ".swal2-success-circular-line-left, .swal2-success-circular-line-right, .swal2-success-fix"
            )
            .forEach((el) => ((el as HTMLElement).style.display = "none"));

        const smallCheck = document.querySelector(".swal2-success-ring");
        if (smallCheck) (smallCheck as HTMLElement).style.display = "none";

        const icon = document.querySelector(".swal2-success") as HTMLElement | null;
        if (icon) icon.style.transform = "scale(0.8)";
    },
});
