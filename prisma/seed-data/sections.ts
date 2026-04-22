// Content for each of the 10 kernel sections
// Each returns a ProseMirror/TipTap JSON document

export const KERNEL_SECTIONS = [
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
        { type: "paragraph", content: [{ type: "text", text: "El comportamiento esperado en el aula y fuera de ella debe construirse con los propios estudiantes, no imponerse. Las normas de convivencia son más efectivas cuando son co-creadas y comprendidas." }] },
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
        { type: "paragraph", content: [{ type: "text", text: "Los ejercicios deben conectar el aprendizaje con la vida real. Cada ejercicio es un punto de partida — adaptalo a tu contexto, nivel y recursos disponibles." }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Objetivo claro y medible" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Materiales necesarios (priorizando los accesibles)" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Tiempo estimado y variantes para diferentes niveles" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Indicadores de logro observables" }] }] },
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
        { type: "paragraph", content: [{ type: "text", text: "La resolución de problemas es una de las habilidades más importantes del siglo XXI. No se trata de memorizar procedimientos, sino de desarrollar la capacidad de analizar situaciones nuevas." }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Comprender el problema: ¿qué se pregunta? ¿qué se sabe?" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Explorar estrategias posibles" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ejecutar y registrar el proceso" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Verificar, reflexionar y comunicar" }] }] },
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
        { type: "paragraph", content: [{ type: "text", text: "El bullying requiere un enfoque sistémico que involucre a toda la comunidad educativa: estudiantes, docentes y familias." }] },
        { type: "paragraph", content: [{ type: "text", text: "Señales de alerta tempranas:" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Cambios en el comportamiento o humor del estudiante" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Evitar ir a la escuela o espacios comunes" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pérdida de pertenencias o aislamiento social repentino" }] }] },
        ]},
        { type: "paragraph", content: [{ type: "text", text: "Protocolo: escucha activa → documentación → acción con todas las partes → seguimiento." }] },
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
        { type: "paragraph", content: [{ type: "text", text: "La educación financiera es una herramienta de equidad. Enseñar conceptos económicos básicos permite tomar mejores decisiones a lo largo de la vida." }] },
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
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pregunta e hipótesis" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Experimento: diseñar y ejecutar" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Análisis y conclusión" }] }] },
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
        { type: "paragraph", content: [{ type: "text", text: "La ética no busca dar respuestas correctas, sino desarrollar la capacidad de razonar sobre dilemas morales con honestidad y empatía." }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿Es justo? ¿Para quién? ¿Por qué?" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿A quién afecta esta decisión?" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "¿Qué haría yo si estuviera en el lugar del otro?" }] }] },
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
        { type: "paragraph", content: [{ type: "text", text: "La evaluación debe ser una herramienta de aprendizaje, no solo de medición. Una buena evaluación ayuda al estudiante a entender dónde está y qué le falta." }] },
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
        { type: "paragraph", content: [{ type: "text", text: "Cada fork puede y debe ampliar esta lista con recursos relevantes para su contexto." }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Paulo Freire — Pedagogía del Oprimido" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "John Dewey — Experiencia y Educación" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Ken Robinson — El Elemento" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Lev Vygotsky — El Desarrollo de los Procesos Psicológicos Superiores" }] }] },
        ]},
        { type: "paragraph", content: [{ type: "text", text: "Recursos digitales abiertos: Khan Academy, Wikipedia Education, OER Commons." }] },
      ],
    },
  },
];
