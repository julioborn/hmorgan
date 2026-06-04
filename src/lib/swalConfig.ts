import Swal from "sweetalert2";

export const swalBase = Swal.mixin({
    background: "#ffffff",
    color: "#111111",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#ffffff",

    customClass: {
        popup: "rounded-2xl shadow-xl border-2 border-black z-[100000]",
        title: "text-black font-bold",
        htmlContainer: "text-gray-700",
        confirmButton:
            "bg-red-600 text-white rounded-lg px-5 py-2 font-semibold hover:bg-red-700",
        cancelButton:
            "bg-white text-black border border-gray-400 rounded-lg px-5 py-2 font-semibold hover:bg-gray-100",
    },

    buttonsStyling: false,

    didOpen: () => {
        const container = document.querySelector(".swal2-container") as HTMLElement | null;
        if (container) container.style.zIndex = "999999";
    },
});
