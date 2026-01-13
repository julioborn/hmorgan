export const metadata = {
    title: "Política de Privacidad – HMorgan",
    description: "Política de privacidad de HMorgan.",
};

export default function PoliticaPrivacidadPage() {
    const updatedAt = "13/01/2026"; // cambiá la fecha cuando edites

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto max-w-3xl px-5 py-12">
                {/* Header */}
                <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm">

                    <h1 className="text-3xl font-semibold tracking-tight">
                        Política de Privacidad – HMorgan
                    </h1>

                    <p className="mt-2 text-sm text-zinc-300">
                        Última actualización: <span className="font-medium">{updatedAt}</span>
                    </p>

                    <p className="mt-4 text-zinc-200">
                        En <span className="font-semibold">HMorgan</span> respetamos tu privacidad. Esta
                        política explica qué información recopilamos, cómo la usamos, cómo la protegemos
                        y cómo podés solicitar la eliminación de tu cuenta y datos asociados.
                    </p>
                </div>

                {/* Índice */}
                <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                    <h2 className="text-lg font-semibold">Contenido</h2>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                        {[
                            ["#alcance", "1. Alcance"],
                            ["#datos", "2. Datos que recopilamos"],
                            ["#uso", "3. Cómo usamos los datos"],
                            ["#compartir", "4. Compartición de datos"],
                            ["#seguridad", "5. Seguridad y almacenamiento"],
                            ["#retencion", "6. Retención de datos"],
                            ["#derechos", "7. Tus derechos y eliminación de cuenta"],
                            ["#menores", "8. Menores de edad"],
                            ["#cambios", "9. Cambios a esta política"],
                            ["#contacto", "10. Contacto"],
                        ].map(([href, label]) => (
                            <li key={href}>
                                <a
                                    href={href}
                                    className="underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100"
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Sección 1 */}
                <section
                    id="alcance"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">1. Alcance</h2>
                    <p className="mt-3 text-zinc-200">
                        Esta política aplica al uso de la aplicación móvil y/o web de HMorgan (en adelante,
                        “la App”). Al usar la App, aceptás esta Política de Privacidad.
                    </p>
                </section>

                {/* Sección 2 */}
                <section
                    id="datos"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">2. Datos que recopilamos</h2>

                    <p className="mt-3 text-zinc-200">
                        La App puede recopilar los siguientes datos, según tu uso:
                    </p>

                    <div className="mt-4 grid gap-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                            <h3 className="font-semibold">Información de cuenta</h3>
                            <ul className="mt-2 list-inside list-disc text-sm text-zinc-300">
                                <li>Nombre de usuario</li>
                                <li>Dirección de correo electrónico</li>
                                <li>ID de usuario</li>
                                <li>Credenciales de acceso (almacenadas de forma segura / cifrada)</li>
                            </ul>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                            <h3 className="font-semibold">Datos de uso y funcionamiento</h3>
                            <ul className="mt-2 list-inside list-disc text-sm text-zinc-300">
                                <li>Interacciones dentro de la App (por ejemplo: acciones relacionadas a pedidos)</li>
                                <li>Información necesaria para operar la App y mejorar su estabilidad</li>
                            </ul>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                            <h3 className="font-semibold">Ubicación</h3>
                            <p className="mt-2 text-sm text-zinc-300">
                                HMorgan <span className="font-semibold">no requiere</span> ubicación precisa para
                                funcionar, salvo que en el futuro se incorpore una función específica que lo
                                solicite de forma explícita.
                            </p>
                            <p className="mt-2 text-sm text-zinc-300">
                                Si actualmente no estás usando ubicación en tu app, mantené esto coherente en la
                                sección “Seguridad de los datos”.
                            </p>
                        </div>
                    </div>

                    <p className="mt-4 text-sm text-zinc-300">
                        Nota: HMorgan no solicita datos sensibles (salud, biometría, creencias, orientación
                        sexual, etc.).
                    </p>
                </section>

                {/* Sección 3 */}
                <section
                    id="uso"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">3. Cómo usamos los datos</h2>
                    <p className="mt-3 text-zinc-200">Usamos los datos para:</p>
                    <ul className="mt-3 list-inside list-disc text-zinc-300">
                        <li>Autenticar y administrar cuentas de usuario.</li>
                        <li>Permitir el funcionamiento correcto de la App (por ejemplo, pedidos).</li>
                        <li>Mantener la seguridad, prevenir abusos y mejorar la estabilidad del servicio.</li>
                    </ul>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <p className="text-sm text-zinc-300">
                            HMorgan no utiliza tus datos para publicidad personalizada ni venta de información.
                        </p>
                    </div>
                </section>

                {/* Sección 4 */}
                <section
                    id="compartir"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">4. Compartición de datos</h2>
                    <p className="mt-3 text-zinc-200">
                        HMorgan <span className="font-semibold">no comparte</span> datos personales con terceros
                        para fines comerciales.
                    </p>

                    <p className="mt-3 text-zinc-200">
                        Podríamos utilizar servicios de infraestructura (por ejemplo, hosting y base de datos)
                        para operar la App. Estos proveedores procesan datos únicamente para prestar el servicio
                        y bajo medidas de seguridad adecuadas.
                    </p>
                </section>

                {/* Sección 5 */}
                <section
                    id="seguridad"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">5. Seguridad y almacenamiento</h2>
                    <ul className="mt-3 list-inside list-disc text-zinc-300">
                        <li>
                            Los datos se transmiten mediante conexiones seguras (
                            <span className="font-semibold">HTTPS</span>), lo que implica cifrado en tránsito.
                        </li>
                        <li>
                            Aplicamos medidas de seguridad razonables para proteger los datos contra accesos no
                            autorizados.
                        </li>
                        <li>
                            Las contraseñas no se almacenan en texto plano (se guardan usando hashing seguro).
                        </li>
                    </ul>
                </section>

                {/* Sección 6 */}
                <section
                    id="retencion"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">6. Retención de datos</h2>
                    <p className="mt-3 text-zinc-200">
                        Conservamos los datos solo el tiempo necesario para operar la App y cumplir con
                        obligaciones legales. Cuando solicitás la eliminación de cuenta, eliminamos los datos
                        personales asociados dentro de un plazo máximo de <span className="font-semibold">30 días</span>,
                        salvo que sea necesario conservar cierta información por requerimientos legales.
                    </p>
                </section>

                {/* Sección 7 */}
                <section
                    id="derechos"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">7. Tus derechos y eliminación de cuenta</h2>

                    <p className="mt-3 text-zinc-200">
                        Podés solicitar la eliminación de tu cuenta y datos asociados en cualquier momento.
                    </p>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <p className="text-sm text-zinc-200">
                            📌 Página de eliminación de cuenta:
                        </p>
                        <a
                            className="mt-2 inline-block text-sm font-semibold underline decoration-zinc-700 underline-offset-4 hover:text-white"
                            href="/eliminar-cuenta"
                        >
                            /eliminar-cuenta
                        </a>

                        <div className="mt-4">
                            <p className="text-sm text-zinc-200">
                                También podés escribirnos al correo:
                            </p>
                            <p className="mt-1 text-sm font-semibold text-zinc-100">
                                📧 julio@estudioborn.com.ar
                            </p>
                            <p className="mt-2 text-xs text-zinc-400">
                                Asunto sugerido: “Eliminar cuenta HMorgan”
                            </p>
                        </div>
                    </div>
                </section>

                {/* Sección 8 */}
                <section
                    id="menores"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">8. Menores de edad</h2>
                    <p className="mt-3 text-zinc-200">
                        HMorgan no está dirigida a menores de 13 años. Si sos padre/madre o tutor y creés que
                        un menor nos proporcionó datos personales, contactanos para eliminarlos.
                    </p>
                </section>

                {/* Sección 9 */}
                <section
                    id="cambios"
                    className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">9. Cambios a esta política</h2>
                    <p className="mt-3 text-zinc-200">
                        Podemos actualizar esta política ocasionalmente. Publicaremos la versión vigente en esta
                        misma URL e indicaremos la fecha de actualización.
                    </p>
                </section>

                {/* Sección 10 */}
                <section
                    id="contacto"
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
                >
                    <h2 className="text-xl font-semibold">10. Contacto</h2>
                    <p className="mt-3 text-zinc-200">
                        Si tenés dudas o querés hacer una solicitud relacionada con tus datos:
                    </p>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <p className="text-sm text-zinc-300">Correo de contacto</p>
                        <p className="mt-1 text-sm font-semibold">📧 julio@estudioborn.com.ar</p>
                    </div>
                </section>

                <p className="mt-8 text-center text-xs text-zinc-500">
                    © {new Date().getFullYear()} HMorgan
                </p>
            </div>
        </main>
    );
}
