import Link from "next/link";
import { BookOpen, GitFork, GitCommit, Users, ArrowRight, Globe } from "lucide-react";

export function LandingPage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center py-16 space-y-6">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm px-4 py-1.5 rounded-full font-medium">
          <Globe className="w-4 h-4" />
          Conocimiento educativo abierto para todos
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
          El currículo educativo<br />
          <span className="text-green-700">que crece con la comunidad</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Como Linux para la educación. Un kernel creado por educadores expertos,
          que cualquiera puede tomar, adaptar a su contexto y compartir de vuelta.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/buscar"
            className="bg-green-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-800 transition-colors flex items-center gap-2"
          >
            Explorar currículos
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/kernel"
            className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Ver el Kernel
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>
          <p className="text-gray-500 mt-2">Simple para todos, poderoso para la educación</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <BookOpen className="w-6 h-6 text-green-700" />,
              title: "Explorá el kernel",
              desc: "El currículo base tiene secciones definidas por vos: filosofía, ejercicios, ética, evaluación y más. Creado y mantenido por especialistas.",
            },
            {
              icon: <GitFork className="w-6 h-6 text-green-700" />,
              title: "Hacé tu fork",
              desc: "Con un click, el currículo es tuyo. Adaptalo a tu grado, tu idioma, tu cultura. Vos sos el dueño de tu versión.",
            },
            {
              icon: <Users className="w-6 h-6 text-green-700" />,
              title: "Contribuí de vuelta",
              desc: "¿Encontraste algo mejor? Proponé el cambio al kernel o compartí tu fork para que otros lo usen como base.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / Publications */}
      <section className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="bg-green-50 p-4 rounded-2xl shrink-0">
            <GitCommit className="w-10 h-10 text-green-700" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">
              Publicaciones verificables. Historial claro.
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Cada publicación genera un ID único que cualquier persona puede usar para
              verificar exactamente qué contenido fue publicado y cuándo. Tu contribución
              queda registrada de forma permanente.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Empezá hoy, gratis</h2>
        <p className="text-gray-500 mb-8">
          Solo necesitás una cuenta de Google o GitHub. Sin costos, sin barreras.
        </p>
        <Link
          href="/login"
          className="bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-green-800 transition-colors inline-flex items-center gap-2"
        >
          Crear cuenta gratuita
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}
