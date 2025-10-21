import Swal from "sweetalert2";

export const swalBase = Swal.mixin({
    background: "#fff", // fondo negro elegante
    color: "#121212", // texto blanco
    confirmButtonColor: "#ef4444", // rojo intenso (Tailwind red-500)
    cancelButtonColor: "#444", // gris oscuro
    showConfirmButton: true,
    buttonsStyling: false,
    customClass: {
        popup: "rounded-2xl shadow-xl border border-gray-700",
        title: "text-lg font-bold text-white",
        htmlContainer: "text-sm text-gray-200",
        confirmButton:
            "bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg mx-2",
        cancelButton:
            "bg-gray-800 hover:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg mx-2",
    },
});
