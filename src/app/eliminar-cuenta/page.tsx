export default function EliminarCuenta() {
    return (
        <main className="max-w-xl mx-auto px-6 py-16 text-gray-900 leading-relaxed">
            <h1 className="text-3xl font-semibold mb-4">
                Eliminación de cuenta – HMorgan
            </h1>

            <p className="mb-6">
                En <strong>HMorgan</strong> respetamos tu privacidad. Podés solicitar la
                eliminación de tu cuenta y de los datos asociados en cualquier momento.
            </p>

            <h2 className="text-xl font-medium mb-2">
                ¿Cómo solicitar la eliminación?
            </h2>

            <p>
                Enviá un correo electrónico desde la dirección asociada a tu cuenta a:
            </p>

            <div className="bg-gray-100 rounded-lg px-4 py-3 my-3 font-medium">
                📧 julio@estudioborn.com.ar
            </div>

            <p className="mb-8">
                Asunto del correo: <strong>Eliminar cuenta HMorgan</strong>
            </p>

            <h2 className="text-xl font-medium mb-2">
                Datos que se eliminan
            </h2>

            <ul className="list-disc list-inside mb-8">
                <li>Cuenta de usuario</li>
                <li>Credenciales de acceso</li>
                <li>Pedidos y datos asociados al usuario</li>
            </ul>

            <h2 className="text-xl font-medium mb-2">
                Retención de datos
            </h2>

            <p>
                No conservamos datos personales una vez procesada la solicitud,
                salvo obligaciones legales.
            </p>

            <p className="mt-2">
                El proceso se completa dentro de un plazo máximo de{" "}
                <strong>30 días</strong>.
            </p>
        </main>
    );
}
