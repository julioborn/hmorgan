// lib/alert.ts
import Swal from "sweetalert2";

export const Alert = Swal.mixin({
    background: "#0f172a", // bg-slate-900
    color: "#fff",
    showClass: {
        popup: "animate__animated animate__fadeInDown",
    },
    hideClass: {
        popup: "animate__animated animate__fadeOutUp",
    },
    customClass: {
        popup: "rounded-2xl shadow-lg",
        title: "text-xl font-bold",
        confirmButton:
            "bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold",
        cancelButton:
            "bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-semibold",
    },
    buttonsStyling: false, // 👈 importante para que use tus clases
});
