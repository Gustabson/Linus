import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createHash } from "crypto";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://edu_user:edu_pass@localhost:5432/edu_platform",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashEntry(prev: string | null, payload: string) {
  return createHash("sha256")
    .update([prev ?? "genesis", payload].join("|"))
    .digest("hex");
}

async function main() {
  console.log("🌱 Seeding kernel...");

  // Create kernel owner (you)
  const owner = await prisma.user.upsert({
    where: { email: "gustabson2048@gmail.com" },
    update: { role: "ADMIN", name: "Gustavo" },
    create: {
      email: "gustabson2048@gmail.com",
      name: "Gustavo",
      role: "ADMIN",
    },
  });

  console.log("✓ Owner:", owner.email);

  // Create kernel tree
  const kernel = await prisma.documentTree.upsert({
    where: { slug: "kernel" },
    update: {},
    create: {
      slug: "kernel",
      title: "Kernel Educativo — Linus",
      description:
        "El currículo educativo base. Estructurado en 10 secciones para cubrir todos los aspectos de la educación. Forkeable, adaptable, abierto.",
      language: "es",
      visibility: "PUBLIC",
      isKernel: true,
      forkDepth: 0,
      ownerId: owner.id,
    },
  });

  console.log("✓ Kernel tree:", kernel.slug);

  // Create membership
  await prisma.treeMembership.upsert({
    where: { treeId_userId: { treeId: kernel.id, userId: owner.id } },
    update: {},
    create: { treeId: kernel.id, userId: owner.id, role: "OWNER" },
  });

  // Create first document
  const doc = await prisma.document.upsert({
    where: { treeId_slug: { treeId: kernel.id, slug: "fundamentos" } },
    update: {},
    create: {
      treeId: kernel.id,
      slug: "fundamentos",
      title: "Fundamentos del Currículo",
    },
  });

  console.log("✓ Document:", doc.title);

  // Create first version with all 10 sections
  const sections = [
    {
      sectionType: "PHILOSOPHY" as const,
      sectionOrder: 0,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Filosofía Educativa" }] },
          { type: "paragraph", content: [{ type: "text", text: "La educación es el proceso de facilitar el aprendizaje, o la adquisición de conocimientos, habilidades, valores, morales, creencias y hábitos. Este kernel parte de la premisa de que todo ser humano tiene el derecho y la capacidad de aprender, y que la educación debe adaptarse al contexto cultural, económico y social de cada comunidad." }] },
          { type: "paragraph", content: [{ type: "text", text: "Principios fundamentales:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Respeto por la diversidad y los ritmos individuales de aprendizaje" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Educación como herramienta de liberación y no de dominación" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pensamiento crítico por encima de la memorización" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Colaboración entre pares como motor del aprendizaje" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "BEHAVIOR" as const,
      sectionOrder: 1,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Comportamiento y Convivencia" }] },
          { type: "paragraph", content: [{ type: "text", text: "El comportamiento esperado en el aula y fuera de ella debe construirse con los propios estudiantes, no imponerse. Las normas de convivencia son más efectivas cuando son co-creadas y comprendidas, no cuando son dictadas." }] },
          { type: "paragraph", content: [{ type: "text", text: "Guía de construcción colectiva de normas:" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Asamblea inicial: ¿cómo queremos que sea nuestra aula?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Identificar necesidades de todos: docentes, estudiantes, familias" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Redactar acuerdos en positivo (qué haremos, no qué no haremos)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Revisión trimestral y ajuste según la experiencia" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "EXERCISES" as const,
      sectionOrder: 2,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ejercicios Prácticos" }] },
          { type: "paragraph", content: [{ type: "text", text: "Los ejercicios deben conectar el aprendizaje con la vida real. Cada ejercicio en este kernel es un punto de partida — adaptalo a tu contexto, nivel y recursos disponibles." }] },
          { type: "paragraph", content: [{ type: "text", text: "Estructura recomendada para cada ejercicio:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Objetivo claro y medible" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Materiales necesarios (priorizando los accesibles)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Tiempo estimado" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Variantes para diferentes niveles" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Indicadores de logro" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "PROBLEMS" as const,
      sectionOrder: 3,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Resolución de Problemas" }] },
          { type: "paragraph", content: [{ type: "text", text: "La resolución de problemas es una de las habilidades más importantes del siglo XXI. No se trata de memorizar procedimientos, sino de desarrollar la capacidad de analizar situaciones nuevas y encontrar caminos." }] },
          { type: "paragraph", content: [{ type: "text", text: "Metodología base (adaptable a cualquier área):" }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Comprender el problema: ¿qué se pregunta? ¿qué se sabe?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Explorar estrategias posibles" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ejecutar y registrar el proceso" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Verificar y reflexionar sobre la solución" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Comunicar el resultado y el proceso" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "ANTI_BULLYING" as const,
      sectionOrder: 4,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Convivencia y Prevención del Bullying" }] },
          { type: "paragraph", content: [{ type: "text", text: "El bullying no se resuelve con charlas aisladas. Requiere un enfoque sistémico que involucre a toda la comunidad educativa: estudiantes, docentes y familias." }] },
          { type: "paragraph", content: [{ type: "text", text: "Señales de alerta tempranas:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Cambios en el comportamiento o humor del estudiante" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Evitar ir a la escuela o espacios comunes" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pérdida de pertenencias o dinero" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Aislamiento social repentino" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Protocolo de intervención sugerido: escucha activa → documentación → acción con todas las partes → seguimiento." }] },
        ],
      },
    },
    {
      sectionType: "ECONOMY" as const,
      sectionOrder: 5,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Educación Económica y Financiera" }] },
          { type: "paragraph", content: [{ type: "text", text: "La educación financiera es una herramienta de equidad. Enseñar conceptos económicos básicos desde temprana edad permite a los estudiantes tomar mejores decisiones a lo largo de su vida." }] },
          { type: "paragraph", content: [{ type: "text", text: "Conceptos clave por nivel:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Primaria: ahorro, necesidades vs. deseos, intercambio" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secundaria baja: presupuesto, interés simple, trabajo y valor" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secundaria alta: inversión, deuda, impuestos, emprendimiento" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "SCIENTIFIC_METHOD" as const,
      sectionOrder: 6,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Método Científico y Pensamiento Empírico" }] },
          { type: "paragraph", content: [{ type: "text", text: "El método científico no es solo para ciencias. Es una forma de pensar: observar, preguntar, hipotetizar, experimentar, concluir. Aplicable a cualquier área del conocimiento." }] },
          { type: "orderedList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Observación: ¿qué veo? ¿qué me llama la atención?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pregunta: ¿qué quiero entender o descubrir?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Hipótesis: ¿qué creo que va a pasar y por qué?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Experimento: diseñar y ejecutar la prueba" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Análisis: ¿qué pasó? ¿coincide con la hipótesis?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Conclusión: ¿qué aprendimos? ¿qué nuevas preguntas surgen?" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "ETHICS" as const,
      sectionOrder: 7,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ética y Razonamiento Moral" }] },
          { type: "paragraph", content: [{ type: "text", text: "La ética en la educación no busca dar respuestas correctas, sino desarrollar la capacidad de razonar sobre dilemas morales con honestidad y empatía." }] },
          { type: "paragraph", content: [{ type: "text", text: "Preguntas guía para el aula:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿Es justo? ¿Para quién? ¿Por qué?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿A quién afecta esta decisión?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿Qué haría yo si estuviera en el lugar del otro?" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿Hay algún valor que estoy priorizando sobre otro? ¿Por qué?" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "ASSESSMENT" as const,
      sectionOrder: 8,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Evaluación y Rúbricas" }] },
          { type: "paragraph", content: [{ type: "text", text: "La evaluación debe ser una herramienta de aprendizaje, no solo de medición. Una buena evaluación ayuda al estudiante a entender dónde está y qué le falta, no solo a recibir una nota." }] },
          { type: "paragraph", content: [{ type: "text", text: "Tipos de evaluación recomendados:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Diagnóstica: al inicio, para conocer el punto de partida" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Formativa: durante el proceso, para ajustar la enseñanza" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sumativa: al final, para medir el logro" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Autoevaluación: el estudiante reflexiona sobre su propio proceso" }] }] },
          ]},
        ],
      },
    },
    {
      sectionType: "RESOURCES" as const,
      sectionOrder: 9,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Recursos y Bibliografía" }] },
          { type: "paragraph", content: [{ type: "text", text: "Esta sección es un punto de partida. Cada fork puede y debe ampliar esta lista con recursos relevantes para su contexto." }] },
          { type: "paragraph", content: [{ type: "text", text: "Obras fundamentales:" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Paulo Freire — Pedagogía del Oprimido" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "John Dewey — Experiencia y Educación" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ken Robinson — El Elemento" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Lev Vygotsky — El Desarrollo de los Procesos Psicológicos Superiores" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Recursos digitales abiertos: Khan Academy (khanacademy.org), Wikipedia Education, OER Commons (oercommons.org)" }] },
        ],
      },
    },
  ];

  const contentHash = createHash("sha256")
    .update(JSON.stringify(sections))
    .digest("hex");

  // Check if version already exists
  const existingVersion = await prisma.documentVersion.findFirst({
    where: { documentId: doc.id },
  });

  if (!existingVersion) {
    const version = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: owner.id,
        commitMessage: "Kernel inicial — 10 secciones base",
        contentHash,
        sections: {
          create: sections.map((s) => ({
            sectionType: s.sectionType,
            sectionOrder: s.sectionOrder,
            difficultyLevel: "BEGINNER",
            isComplete: true,
            richTextContent: s.content,
          })),
        },
      },
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: { currentVersionId: version.id },
    });

    // Write ledger entry
    const entryHash = await hashEntry(null, `TREE_CREATED|${kernel.id}|${owner.id}`);
    await prisma.ledgerEntry.create({
      data: {
        eventType: "TREE_CREATED",
        subjectId: kernel.id,
        subjectType: "tree",
        eventPayload: { treeId: kernel.id, title: kernel.title, isKernel: true },
        previousEntryHash: null,
        entryHash,
        actorId: owner.id,
      },
    });

    console.log("✓ Version + 10 sections created");
    console.log("✓ Ledger entry written");
  } else {
    console.log("✓ Version already exists, skipping");
  }

  console.log("🎉 Seed complete!");
  console.log(`   Kernel: https://linus-jet.vercel.app/t/kernel`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
