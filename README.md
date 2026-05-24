# EduHub

Plataforma colaborativa de recursos educativos. Creá, forkeá y compartí currículos con personas de todo el mundo.

## Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Base de datos**: PostgreSQL vía [Prisma ORM](https://prisma.io) (recomendado: [Neon](https://neon.tech))
- **Autenticación**: [NextAuth v5](https://authjs.dev)
- **Editor de texto**: [TipTap](https://tiptap.dev)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (avatares y adjuntos)
- **Emails**: [Resend](https://resend.com)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com)

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (o cuenta en Neon)
- Cuenta en Resend (para emails de verificación y notificaciones)
- Cuenta en Vercel (para Blob storage, o reemplazar con S3/Cloudflare R2)

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/eduhub.git
cd eduhub

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (ver sección abajo)

# 4. Sincronizar el esquema con la base de datos
npx prisma db push

# 5. (Opcional) Cargar datos de ejemplo
npx prisma db seed

# 6. Iniciar el servidor de desarrollo
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@host:5432/eduhub"

# NextAuth v5
AUTH_SECRET="generá uno con: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# OAuth (opcional — podés autenticarte solo con email)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

# Resend (emails de verificación y notificaciones)
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@tudominio.com"

# Vercel Blob (avatares y adjuntos)
BLOB_READ_WRITE_TOKEN=""

# URL pública de la app
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Estructura del proyecto

```
src/
├── app/                    # Rutas (Next.js App Router)
│   ├── api/                # API routes (37 endpoints)
│   ├── [username]/[slug]/  # Vistas de documentos
│   └── ...                 # Feed, explorar, correos, etc.
├── components/             # Componentes React reutilizables
│   ├── editor/             # RichEditor (TipTap)
│   ├── layout/             # Shell, Sidebar, Navbar
│   └── ...
├── lib/                    # Utilidades del servidor
│   ├── auth.ts             # Configuración NextAuth
│   ├── prisma.ts           # Cliente Prisma singleton
│   ├── sanitize.ts         # Sanitización HTML (correos)
│   ├── theme-config.ts     # Sistema de temas (fuente de verdad)
│   └── ...
└── middleware.ts           # Rate limiting (IP-based)

prisma/
└── schema.prisma           # Modelos de la base de datos
```

## Modelos principales

| Modelo | Descripción |
|--------|-------------|
| `User` | Cuentas, configuración de tema, notificaciones |
| `DocumentTree` | Currículos / recursos (pueden ser forkeados una vez) |
| `Document` | Documentos dentro de un árbol |
| `DocumentSection` | Secciones con contenido TipTap |
| `Post` | Publicaciones del feed social |
| `Message` | Correos internos entre usuarios |
| `ChangeProposal` | Propuestas de cambios a documentos |

## Deploy

```bash
# Vercel (recomendado)
vercel deploy

# Docker (próximamente)
```

Asegurate de configurar todas las variables de entorno en el panel de Vercel antes del deploy.

## Seguridad

- Los correos se sanitizan con `sanitize-html` antes de guardarse en la DB
- Rate limiting en todos los endpoints API (ver `src/middleware.ts`)
- Los forks son solo 1 nivel de profundidad (no se puede forkear un fork)
- Autenticación requerida en todas las rutas de escritura
- Temas guardados por cuenta, nunca en el navegador como estado compartido

## Licencia

Por definir.
