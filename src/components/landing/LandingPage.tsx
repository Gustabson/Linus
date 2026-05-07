import { prisma }  from "@/lib/prisma";
import Link        from "next/link";
import Image       from "next/image";
import {
  ArrowRight, BookOpen, GitFork, Heart,
  Users, Rss, Layers,
} from "lucide-react";
import { CONTENT_TYPE_STYLE } from "@/lib/constants";

export async function LandingPage() {
  const [treeCount, userCount, featured] = await Promise.all([
    prisma.documentTree.count({ where: { visibility: "PUBLIC" } }),
    prisma.user.count(),
    prisma.documentTree.findMany({
      where:   { visibility: "PUBLIC" },
      orderBy: { likes: { _count: "desc" } },
      take:    6,
      select: {
        id: true, slug: true, title: true, description: true, contentType: true,
        owner: { select: { username: true, name: true, image: true } },
        _count: { select: { likes: true, forks: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-24 pb-24">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="text-center pt-16 pb-4 space-y-8 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm px-4 py-1.5 rounded-full font-medium">
          <BookOpen className="w-4 h-4" />
          Educación abierta y colaborativa
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-text leading-[1.1] tracking-tight">
          Creá, compartí y descubrí{" "}
          <span className="text-primary">contenido educativo</span>{" "}
          con docentes de todo el mundo
        </h1>

        <p className="text-xl text-text-muted leading-relaxed max-w-2xl mx-auto">
          Kernels, módulos y recursos que cualquiera puede explorar, forkear y adaptar
          a su contexto. Una comunidad donde el conocimiento crece en conjunto.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/explorar"
            className="bg-primary text-white px-7 py-3.5 rounded-xl font-semibold text-base hover:bg-primary-h transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            Explorar contenido
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="border border-border text-text px-7 py-3.5 rounded-xl font-semibold text-base hover:bg-surface transition-colors w-full sm:w-auto text-center"
          >
            Crear cuenta gratis
          </Link>
        </div>

        <p className="text-sm text-text-subtle">
          No necesitás cuenta para explorar
        </p>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      {(treeCount > 0 || userCount > 0) && (
        <div className="border-y border-border py-8">
          <div className="flex flex-wrap justify-center gap-x-16 gap-y-6">
            {[
              { value: userCount,  label: "educadores",         icon: <Users className="w-5 h-5"  /> },
              { value: treeCount,  label: "contenidos públicos", icon: <Layers className="w-5 h-5" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="text-primary/60">{s.icon}</div>
                <div>
                  <div className="text-3xl font-bold text-text tabular-nums">{s.value.toLocaleString("es")}</div>
                  <div className="text-sm text-text-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured content ────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text">Contenido destacado</h2>
              <p className="text-text-muted mt-1 text-sm">Los más likeados de la comunidad</p>
            </div>
            <Link href="/explorar" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              Ver todo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((tree) => {
              const ts = CONTENT_TYPE_STYLE[tree.contentType];
              return (
                <Link
                  key={tree.id}
                  href={`/${tree.owner.username ?? ""}/${tree.slug}`}
                  className={`bg-surface border ${ts.borderCls} ${ts.hoverBorderCls} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md transition-all group`}
                >
                  {/* Type badge */}
                  <span className={`self-start inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ts.badgeCls}`}>
                    {ts.icon}{ts.label}
                  </span>

                  {/* Title + description */}
                  <div className="flex-1">
                    <h3 className={`font-bold text-base ${ts.textCls} line-clamp-2 leading-snug`}>
                      {tree.title}
                    </h3>
                    {tree.description && (
                      <p className="text-text-muted text-sm mt-1 line-clamp-2 leading-relaxed">
                        {tree.description}
                      </p>
                    )}
                  </div>

                  {/* Author + stats */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {tree.owner.image ? (
                        <Image src={tree.owner.image} alt="" width={20} height={20} className="rounded-full shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {(tree.owner.name ?? "?")[0]}
                        </div>
                      )}
                      <span className="text-xs text-text-muted truncate">{tree.owner.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-subtle shrink-0">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{tree._count.likes}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{tree._count.forks}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text">¿Qué podés hacer en EduHub?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <BookOpen className="w-5 h-5 text-primary" />,
              title: "Explorá y aprendé",
              desc:  "Accedé a kernels, módulos y recursos creados por docentes. Sin cuenta, sin barreras. Todo el contenido público es tuyo para ver.",
            },
            {
              icon: <GitFork className="w-5 h-5 text-primary" />,
              title: "Forkeá y adaptá",
              desc:  "Encontraste algo bueno? Con un click lo hacés tuyo. Cambiá lo que necesites para tu grado, tu idioma o tu contexto.",
            },
            {
              icon: <Rss className="w-5 h-5 text-primary" />,
              title: "Conectá con la comunidad",
              desc:  "Seguí a otros educadores, publicá ideas, comentá y construí junto a personas que comparten tu pasión por enseñar.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-surface rounded-2xl border border-border p-6 space-y-3">
              <div className="bg-primary/5 w-10 h-10 rounded-xl flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="font-semibold text-text">{item.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-2xl p-10 md:p-14 text-center space-y-6">
        <h2 className="text-3xl font-bold text-text">
          Empezá hoy. Es gratis.
        </h2>
        <p className="text-text-muted text-lg max-w-md mx-auto">
          Solo necesitás un email, Google o GitHub. Sin costos, sin barreras.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-primary text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-primary-h transition-colors flex items-center gap-2"
          >
            Crear cuenta gratis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/explorar"
            className="text-text-muted hover:text-text text-sm transition-colors"
          >
            o explorá sin cuenta →
          </Link>
        </div>
      </section>

    </div>
  );
}
