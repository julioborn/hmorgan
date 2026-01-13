import Link from "next/link";

export default function SoportePage() {
    return (
        <main className="min-h-screen bg-gray-50 flex items-start justify-center px-4 mt-10">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Soporte – HMorgan
                </h1>

                <p className="text-gray-700 mb-4">
                    Si tenés problemas con la app, consultas o necesitás ayuda relacionada con
                    HMorgan, podés contactarnos a través de los siguientes medios.
                </p>

                <div className="bg-gray-100 rounded-xl p-4 mb-6">
                    <p className="text-gray-800 font-medium">Correo de contacto</p>
                    <a
                        href="mailto:juliobornes10@gmail.com"
                        className="text-red-600 hover:underline break-all"
                    >
                        julio@estudioborn.com.ar
                    </a>
                </div>

                <p className="text-gray-700 mb-6">
                    Intentamos responder los mensajes lo antes posible. Este canal está
                    destinado exclusivamente a consultas relacionadas con el uso de la app.
                </p>

                <div className="border-t pt-4 flex flex-col sm:flex-row gap-4 text-sm">
                    <Link
                        href="/politica-de-privacidad"
                        className="text-red-600 hover:underline"
                    >
                        Política de privacidad
                    </Link>
                    <Link
                        href="/eliminar-cuenta"
                        className="text-red-600 hover:underline"
                    >
                        Eliminación de cuenta
                    </Link>
                </div>
            </div>
        </main>
    );
}
