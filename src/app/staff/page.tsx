import Link from "next/link";

export default function StaffPage() {
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold">Panel del Staff</h1>
            <p className="opacity-80">
                Ingresá con tu usuario de administrador o mozo para escanear QR y sumar puntos.
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
                <div className="flex gap-2">
                    <Link href="/login" className="px-4 py-2 rounded bg-white/10 hover:bg-white/15">
                        Ingresar
                    </Link>
                    <Link href="/admin/scan" className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-500">
                        Ir a escanear
                    </Link>
                </div>
            </div>
        </div>
    );
}
