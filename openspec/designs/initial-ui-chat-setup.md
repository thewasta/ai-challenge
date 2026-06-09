# Design: Setup Inicial de Interfaz y Agente Conversacional Básico

**Change ID:** `initial-ui-chat-setup`  
**Spec:** [initial-ui-chat-setup.md](../specs/initial-ui-chat-setup.md)  
**Fecha:** 2026-06-09

---

## 1. Arquitectura General

### 1.1 Route Tree (Next.js App Router)

```
src/app/
├── layout.tsx                          # Root: <html>, <body>, fuente Inter
├── page.tsx                            # HomePage: Server Component
├── globals.css                         # Design tokens (no cambios)
├── projects/
│   └── [id]/
│       └── chats/
│           └── [chatId]/
│               └── page.tsx            # ChatPage: Server → Client boundary
└── api/
    ├── projects/
    │   ├── route.ts                    # GET (list) + POST (create)
    │   └── [id]/
    │       └── chats/
    │           └── route.ts            # POST (create chat)
    └── chat/
        └── route.ts                    # POST (streamText + AI SDK)
```

### 1.2 Server / Client Boundary

```
┌─────────────────────────────────────────────────┐
│ SERVER                                           │
│ ┌───────────┐  ┌──────────────────────────────┐ │
│ │ HomePage   │  │ ChatPage (page.tsx)           │ │
│ │ DB: count  │  │ DB: getProjectsWithChats()    │ │
│ │            │  │ DB: getProject(id)            │ │
│ │ Redirect o │  │ Render <ChatLayout>           │ │
│ │ Landing UI │  │                                │ │
│ └───────────┘  └────────────┬───────────────────┘ │
├─────────────────────────────┼─────────────────────┤
│ CLIENT                      │                     │
│              ┌──────────────▼──────────────────┐ │
│              │ ChatLayout (Client Boundary)     │ │
│              │ <SidebarProvider>                │ │
│              │  ├── <AppSidebar />              │ │
│              │  └── <SidebarInset>              │ │
│              │       └── <ChatArea />  useChat  │ │
│              │           ├── <MessageBubble />   │ │
│              │           └── <ChatInput />      │ │
│              └─────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Reglas:**
- Todo lo que toca DB es Server Component
- `useChat`, `useRouter`, `useState` son Client Components
- `SidebarProvider` requiere Client Component (usa React Context)
- `ChatLayout` es el punto de entrada Client que envuelve sidebar + chat

---

## 2. Component Tree Detallado

### 2.1 `ChatPage` — Server Component

```tsx
// src/app/projects/[id]/chats/[chatId]/page.tsx
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}) {
  const { id, chatId } = await params;
  const projects = await getProjectsWithChats();
  const project = await getProject(Number(id));

  if (!project) notFound();

  return (
    <ChatLayout
      projects={projects}
      currentProjectId={Number(id)}
      currentChatId={Number(chatId)}
    />
  );
}
```

### 2.2 `ChatLayout` — Client Component (boundary)

```tsx
// src/components/ChatLayout.tsx
"use client";

export function ChatLayout({
  projects,
  currentProjectId,
  currentChatId,
}: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        currentChatId={currentChatId}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          {/* breadcrumb: project name */}
        </header>
        <ChatArea />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 2.3 `AppSidebar` — Client Component

```tsx
// src/components/AppSidebar.tsx
"use client";

export function AppSidebar({ projects, currentProjectId, currentChatId }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <ZapIcon />
                <span>Consultor SEO</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Nuevo proyecto global */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NewProjectButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Proyectos con sus chats */}
        {projects.map((project) => (
          <SidebarGroup key={project.id}>
            <Collapsible
              defaultOpen={project.id === currentProjectId}
              className="group/collapsible"
            >
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full">
                  <FolderIcon className="size-4" />
                  <span className="flex-1 text-left truncate">
                    {project.name}
                  </span>
                  <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarMenu>
                  {project.chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        isActive={
                          chat.id === currentChatId &&
                          project.id === currentProjectId
                        }
                        asChild
                      >
                        <Link
                          href={`/projects/${project.id}/chats/${chat.id}`}
                        >
                          <MessageSquareIcon className="size-4" />
                          <span>{chat.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <NewChatButton projectId={project.id} />
                  </SidebarMenuItem>
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
```

### 2.4 `NewProjectButton` — Client Component

```tsx
// src/components/NewProjectButton.tsx
"use client";

export function NewProjectButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    const res = await fetch("/api/projects", { method: "POST" });
    const { project, chat } = await res.json();
    router.push(`/projects/${project.id}/chats/${chat.id}`);
  }

  return (
    <SidebarMenuButton onClick={handleCreate} disabled={isLoading}>
      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <PlusIcon className="size-4" />
      )}
      <span>Nuevo proyecto</span>
    </SidebarMenuButton>
  );
}
```

### 2.5 `NewChatButton` — Client Component

```tsx
// src/components/NewChatButton.tsx
"use client";

interface NewChatButtonProps {
  projectId: number;
}

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    const res = await fetch(`/api/projects/${projectId}/chats`, {
      method: "POST",
    });
    const chat = await res.json();
    router.push(`/projects/${projectId}/chats/${chat.id}`);
  }

  return (
    <SidebarMenuButton
      onClick={handleCreate}
      disabled={isLoading}
      className="text-muted-foreground text-xs"
    >
      {isLoading ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : (
        <PlusIcon className="size-3" />
      )}
      <span>Nuevo chat</span>
    </SidebarMenuButton>
  );
}
```

### 2.6 `ChatArea` — Client Component

```tsx
// src/components/ChatArea.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function ChatArea() {
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Mensajes */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {messages.length === 0 && <EmptyState />}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          disabled={status !== "ready"}
          status={status}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          Ocurrió un error al comunicarse con el asistente.
        </div>
      )}
    </div>
  );
}
```

### 2.7 `MessageBubble` — Client Component

```tsx
// src/components/MessageBubble.tsx
"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar opcional para assistant */}
      {!isUser && (
        <div className="flex-shrink-0 size-8 rounded-full bg-primary flex items-center justify-center">
          <BotIcon className="size-4 text-primary-foreground" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return isUser ? (
              <p key={i} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            ) : (
              <div key={i} className="prose prose-sm dark:prose-invert max-w-none
                [&_table]:w-full [&_table]:border-collapse
                [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                [&_pre]:bg-zinc-950 [&_pre]:text-zinc-50 [&_pre]:rounded-md [&_pre]:p-4
                [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
```

**Notas sobre Markdown:**
- `prose` de Tailwind para tipografía base
- Estilos explícitos para tablas (bordes, padding ya que `prose` no cubre todo)
- Bloques de código con fondo oscuro (consultoría)
- Listas con bullets y números
- `remark-gfm` para soporte GitHub Flavored Markdown

### 2.8 `ChatInput` — Client Component

```tsx
// src/components/ChatInput.tsx
"use client";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  status: string;
}

export function ChatInput({ onSend, disabled, status }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex gap-2 max-w-3xl mx-auto">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        className="flex-1"
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
        aria-label="Enviar mensaje"
      >
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SendIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}
```

### 2.9 `EmptyState` — Inline en ChatArea

```tsx
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <MessageSquareIcon className="size-16 mb-4 stroke-1" />
      <p className="text-lg font-medium">
        Escribe tu primer mensaje
      </p>
      <p className="text-sm mt-1">
        para comenzar la consultoría de SEO
      </p>
    </div>
  );
}
```

---

## 3. API Routes

### 3.1 `POST /api/chat`

```typescript
// src/app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import type { UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: await convertToModelMessages(messages),
    // Sin system prompt → agente puro conversacional
    // Sin tools → sin tool calling
  });

  return result.toUIMessageStreamResponse();
}
```

### 3.2 `GET + POST /api/projects`

```typescript
// src/app/api/projects/route.ts
import { db } from "@/db";
import { projects, chats } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await getProjectsWithChats();
  return NextResponse.json(rows);
}

export async function POST() {
  // Contar proyectos existentes
  const count = await db.$count(projects);
  const n = count + 1;
  const today = new Date().toLocaleDateString("es-AR");

  // Crear proyecto con placeholder
  const [project] = await db
    .insert(projects)
    .values({
      name: `Proyecto #${n} — ${today}`,
      description: "",
      buyerPersona: "",
      competitors: "",
      brandContext: "{}",
    })
    .returning();

  // Crear primer chat
  const [chat] = await db
    .insert(chats)
    .values({
      projectId: project.id,
      title: "Chat #1",
    })
    .returning();

  return NextResponse.json({ project, chat }, { status: 201 });
}
```

### 3.3 `POST /api/projects/[id]/chats`

```typescript
// src/app/api/projects/[id]/chats/route.ts
import { db } from "@/db";
import { chats } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // Verificar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  // Contar chats del proyecto
  const chatCount = await db.$count(chats, eq(chats.projectId, projectId));
  const n = chatCount + 1;

  const [chat] = await db
    .insert(chats)
    .values({
      projectId,
      title: `Chat #${n}`,
    })
    .returning();

  return NextResponse.json(chat, { status: 201 });
}
```

---

## 4. Capa de Datos

### 4.1 DB Helpers

```typescript
// src/lib/db-helpers.ts
import { db } from "@/db";
import { projects, chats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ChatRow {
  id: number;
  projectId: number;
  title: string;
  createdAt: Date;
}

export interface ProjectWithChats {
  id: number;
  name: string;
  description: string;
  chats: ChatRow[];
}

/**
 * Obtiene todos los proyectos con sus chats anidados,
 * ordenados del más reciente al más antiguo.
 */
export async function getProjectsWithChats(): Promise<ProjectWithChats[]> {
  const projectRows = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  const result: ProjectWithChats[] = [];

  for (const project of projectRows) {
    const chatRows = await db
      .select()
      .from(chats)
      .where(eq(chats.projectId, project.id))
      .orderBy(chats.createdAt);

    result.push({
      id: project.id,
      name: project.name,
      description: project.description,
      chats: chatRows.map((c) => ({
        id: c.id,
        projectId: c.projectId,
        title: c.title,
        createdAt: c.createdAt,
      })),
    });
  }

  return result;
}

/**
 * Obtiene un proyecto por ID.
 */
export async function getProject(id: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
}

/**
 * Obtiene el proyecto más reciente con su primer chat.
 */
export async function getLatestProjectWithChat() {
  const project = await db.query.projects.findFirst({
    orderBy: desc(projects.createdAt),
  });

  if (!project) return null;

  const chat = await db.query.chats.findFirst({
    where: eq(chats.projectId, project.id),
    orderBy: chats.createdAt,
  });

  return { project, chat };
}
```

---

## 5. HomePage

```typescript
// src/app/page.tsx
import { getLatestProjectWithChat } from "@/lib/db-helpers";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/HomePageClient";

export default async function HomePage() {
  const result = await getLatestProjectWithChat();

  if (result) {
    redirect(`/projects/${result.project.id}/chats/${result.chat.id}`);
  }

  return <HomePageClient />;
}
```

```typescript
// src/components/HomePageClient.tsx
"use client";

export function HomePageClient() {
  // Botón que crea proyecto y navega
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <ZapIcon className="size-16 text-primary mb-6" />
      <h1 className="text-4xl font-bold text-primary">
        Consultor SEO & Marketing Digital
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Plataforma de consultoría multi-agente impulsada por IA
      </p>
      <NewProjectButtonHome />
    </main>
  );
}
```

```typescript
// src/components/NewProjectButtonHome.tsx
"use client";

export function NewProjectButtonHome() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    const res = await fetch("/api/projects", { method: "POST" });
    const { project, chat } = await res.json();
    router.push(`/projects/${project.id}/chats/${chat.id}`);
  }

  return (
    <Button
      size="lg"
      className="mt-8"
      onClick={handleCreate}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <PlusIcon className="size-4" />
      )}
      Crear primer proyecto
    </Button>
  );
}
```

---

## 6. Configuración de Entorno

### 6.1 `.env.local`

```bash
# OpenAI API Key (requerida para el chat)
OPENAI_API_KEY=sk-...
```

### 6.2 `next.config.ts` (existente, verificar)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

### 6.3 Paquetes a instalar

```bash
pnpm add @ai-sdk/react
pnpm exec shadcn add sidebar input separator scroll-area collapsible sheet tooltip skeleton
```

---

## 7. Jerarquía de Tipos

```typescript
// Tipos del AI SDK (proveídos por 'ai' y '@ai-sdk/react')
import type { UIMessage } from "ai";

// UIMessage {
//   id: string;
//   role: "user" | "assistant" | "system";
//   parts: Array<
//     | { type: "text"; text: string }
//     | { type: "reasoning"; text: string }
//     | { type: "tool-{name}"; ... }
//     | { type: "file"; url: string; mediaType: string }
//   >;
//   metadata?: Record<string, unknown>;
// }

// Tipos de DB helpers (definidos en db-helpers.ts)
interface ProjectWithChats { ... }
interface ChatRow { ... }
```

---

## 8. Manejo de Errores

| Capa | Error | Manejo |
|------|-------|--------|
| `POST /api/chat` | `OPENAI_API_KEY` no configurada | `useChat` recibe error → se muestra en UI |
| `POST /api/chat` | Rate limit de OpenAI | Idem |
| `POST /api/projects` | Error de DB | NextResponse 500 con mensaje |
| `POST /api/projects/[id]/chats` | Proyecto no existe | NextResponse 404 |
| `ChatPage` | Proyecto no encontrado | `notFound()` → página 404 de Next.js |
| `useChat` | Error de red | Hook expone `error` → se muestra toast |

---

## 9. Decisiones de Diseño

| Decisión | Razón |
|----------|-------|
| `ChatLayout` como Client Component boundary | `SidebarProvider` usa React Context → debe ser Client |
| Server Components para DB queries | Evita暴露 API routes para datos de solo lectura |
| `useChat` sin `id` | Chat efímero: cada navegación reinicia el estado |
| `DefaultChatTransport` sin configuración extra | Simplicidad: POST estándar a `/api/chat` |
| Sin `system` prompt en `streamText` | Agente puramente reactivo en esta fase |
| `maxDuration: 30` | 30s suficiente para respuestas de GPT-4o-mini |
| Avatar solo en assistant | Diferenciación visual clara user vs AI |
| Markdown solo en assistant | El usuario escribe texto plano |
| `SidebarInset` + `header` con `SidebarTrigger` | Layout canónico de shadcn sidebar |
