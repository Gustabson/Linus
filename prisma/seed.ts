import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { KERNEL_SECTIONS } from "./seed-data/sections";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://edu_user:edu_pass@localhost:5432/edu_platform",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding kernel...");

  // 1. Owner
  const owner = await prisma.user.upsert({
    where: { email: "gustabson2048@gmail.com" },
    update: { role: "ADMIN", name: "Gustavo" },
    create: { email: "gustabson2048@gmail.com", name: "Gustavo", role: "ADMIN" },
  });
  console.log("✓ Owner:", owner.email);

  // 2. Kernel tree
  const kernel = await prisma.documentTree.upsert({
    where: { slug: "kernel" },
    update: {},
    create: {
      slug: "kernel",
      title: "Kernel Educativo — Linus",
      description: "El currículo educativo base. 10 secciones para cubrir todos los aspectos de la educación. Forkeable, adaptable, abierto.",
      language: "es",
      visibility: "PUBLIC",
      forkDepth: 0,
      ownerId: owner.id,
    },
  });
  console.log("✓ Kernel:", kernel.slug);

  // 3. Membership
  await prisma.treeMembership.upsert({
    where: { treeId_userId: { treeId: kernel.id, userId: owner.id } },
    update: {},
    create: { treeId: kernel.id, userId: owner.id, role: "OWNER" },
  });

  // 4. Document
  const doc = await prisma.document.upsert({
    where: { treeId_slug: { treeId: kernel.id, slug: "fundamentos" } },
    update: {},
    create: { treeId: kernel.id, slug: "fundamentos", title: "Fundamentos del Currículo" },
  });
  console.log("✓ Document:", doc.title);

  // 5. Version + sections (only if none exists)
  const existing = await prisma.documentVersion.findFirst({ where: { documentId: doc.id } });
  if (existing) {
    console.log("✓ Version already exists, skipping");
  } else {
    const version = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        authorId: owner.id,
        commitMessage: "Kernel inicial — 10 secciones base",
        sections: {
          create: KERNEL_SECTIONS.map((s) => ({
            sectionType: s.sectionType,
            sectionOrder: s.sectionOrder,
            difficultyLevel: "BEGINNER" as never,
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

    console.log("✓ 10 sections created");
  }

  console.log("\n🎉 Seed complete!");
}

main()
  .catch(console.error)
  .finally(async () => {
    // B4: close both the Prisma client AND the underlying pg Pool
    await prisma.$disconnect();
    await pool.end();
  });
