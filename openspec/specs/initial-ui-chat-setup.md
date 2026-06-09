# Spec: Setup Inicial de Interfaz y Agente Conversacional Básico

**Change ID:** `initial-ui-chat-setup`  
**Propuesta:** [initial-ui-chat-setup.md](../proposals/initial-ui-chat-setup.md)  
**Fecha:** 2026-06-09

---

## 1. API Endpoints

### 1.1 `POST /api/projects`

Crea un proyecto con nombre placeholder y su primer chat.

**Response:** `201 Created`
```typescript
{
  project: {
    id: number;
    name: string;          // "Proyecto #1 — 09/06/2026"
    description: string;
    buyerPersona: string;
    competitors: string;
    brandContext: string;
  };
  chat: {
    id: number;
    projectId: number;
    title: string;         // "Chat #1"
  };
}
```

---

### 1.2 `GET /api/projects`

Lista proyectos con chats anidados, ordenados por creación descendente.

**Response:** `200 OK`
```typescript
Array<{
  id: number;
  name: string;
  chats: Array<{
    id: number;
    projectId: number;
    title: string;
  }>;
}>
```

---

### 1.3 `POST /api/projects/[id]/chats`

Crea un nuevo chat dentro de un proyecto.

**Response:** `201 Created`
```typescript
{
  id: number;
  projectId: number;
  title: string;  // "Chat #${n}"
}
```

---

### 1.4 `POST /api/chat`

**AI SDK pattern:** `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse()`.

```typescript
// src/app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

**Notas:**
- Sin `system` prompt → agente puramente reactivo
- Sin `tools` → sin tool calling
- `maxDuration = 30` → 30 segundos máximo para streaming
- `convertToModelMessages` convierte `UIMessage[]` (UI metadata) → `ModelMessage[]` (solo contenido)
- `toUIMessageStreamResponse()` serializa el stream en el protocolo UI message del AI SDK

**Variables de entorno requeridas:**
```
OPENAI_API_KEY=sk-...
```

---

## 2. Páginas

### 2.1 `HomePage` — `/`

**Tipo:** Server Component con Client Component anidado para el botón.

**Lógica:**
1. Query directa a DB: `SELECT id FROM projects ORDER BY created_at DESC LIMIT 1`
2. Si hay proyecto → `redirect("/projects/${project.id}/chats/${chat.id}")`
3. Si no hay → renderiza landing con botón "Crear primer proyecto"

---

### 2.2 `ChatPage` — `/projects/[id]/chats/[chatId]`

**Tipo:** Server Component (layout) + Client Components (sidebar, chat).

**Layout:**
```
┌──────────┬──────────────────────────────────────┐
│ AppSidebar │ ChatArea (_useChat_)               │
│ (280px)    │ ┌────────────────────────────────┐ │
│            │ │ MessageBubble (assistant)      │ │
│ Proy A     │ │ MessageBubble (user)           │ │
│  Chat 1 ◄  │ │ MessageBubble (assistant)      │ │
│  Chat 2    │ │ ... (partes en streaming)      │ │
│ Proy B     │ └────────────────────────────────┘ │
│  Chat 1    │ ┌────────────────────────────────┐ │
│            │ │ [Input________________] [Send]  │ │
│            │ └────────────────────────────────┘ │
└──────────┴──────────────────────────────────────┘
```

**Server Component (page.tsx):**
- Carga proyectos con chats desde DB (Drizzle query)
- Renderiza `<AppSidebar projects={...} />` y `<ChatArea />`

---

## 3. Componentes

### 3.1 `AppSidebar`

**Archivo:** `src/components/AppSidebar.tsx`  
**Tipo:** Client Component  
**Dependencias shadcn:** `sidebar`, `collapsible`, `separator`, `button`

**Props:**
```typescript
interface ProjectWithChats {
  id: number;
  name: string;
  chats: Array<{ id: number; projectId: number; title: string }>;
}

interface AppSidebarProps {
  projects: ProjectWithChats[];
  currentProjectId: number;
  currentChatId: number;
}
```

**Estructura (shadcn sidebar):**
```
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>Logo + "Consultor SEO"</SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <NewProjectButton />
      </SidebarGroup>
      <SidebarSeparator />
      {projects.map(project => (
        <SidebarGroup key={project.id}>
          <Collapsible defaultOpen={project.id === currentProjectId}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                <FolderIcon /> {project.name}
                <ChevronDownIcon className="ml-auto" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarMenu>
                {project.chats.map(chat => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={chat.id === currentChatId}
                      asChild
                    >
                      <Link href={`/projects/${project.id}/chats/${chat.id}`}>
                        <MessageSquareIcon /> {chat.title}
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
</SidebarProvider>
```

---

### 3.2 `NewProjectButton`

**Archivo:** `src/components/NewProjectButton.tsx`  
**Tipo:** Client Component

**Comportamiento:**
1. Click → `fetch("POST /api/projects")`
2. On success → `router.push("/projects/${id}/chats/${chatId}")`
3. Muestra spinner mientras carga

---

### 3.3 `NewChatButton`

**Archivo:** `src/components/NewChatButton.tsx`  
**Tipo:** Client Component

**Props:** `{ projectId: number }`

**Comportamiento:**
1. Click → `fetch("POST /api/projects/${projectId}/chats")`
2. On success → `router.push("/projects/${projectId}/chats/${chatId}")`

---

### 3.4 `ChatArea`

**Archivo:** `src/components/ChatArea.tsx`  
**Tipo:** Client Component  
**Dependencias shadcn:** `scroll-area`

**Hook principal:** `useChat` de `@ai-sdk/react`

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatArea() {
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquareIcon className="size-12 mb-4" />
              <p>Escribe tu primer mensaje para comenzar la consultoría</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          disabled={status !== "ready"}
          status={status}
        />
      </div>

      {error && (
        <div className="p-2 text-sm text-destructive text-center">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
```

**Estados:**
| Status | Input | UI indicador |
|--------|-------|-------------|
| `ready` | Habilitado | — |
| `submitted` | Deshabilitado | Spinner "Enviando..." |
| `streaming` | Deshabilitado | Texto apareciendo |
| `error` | Habilitado | Mensaje de error |

**Chat efímero:** `useChat` mantiene `messages` en estado React. Al navegar a otro chat, el componente se desmonta y los mensajes se pierden. ✅

---

### 3.5 `MessageBubble`

**Archivo:** `src/components/MessageBubble.tsx`  
**Tipo:** Client Component

**Props:**
```typescript
import type { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}
```

**Renderizado de `message.parts`:**
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted prose prose-sm dark:prose-invert",
        )}
      >
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return isUser ? (
                <p key={i} className="whitespace-pre-wrap">{part.text}</p>
              ) : (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

**Nota:** Por ahora solo manejamos `part.type === "text"`. En fases futuras se agregarán partes `tool-*`, `reasoning`, etc.

---

### 3.6 `ChatInput`

**Archivo:** `src/components/ChatInput.tsx`  
**Tipo:** Client Component  
**Dependencias shadcn:** `input`, `button`

**Props:**
```typescript
interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  status: "ready" | "submitted" | "streaming" | "error";
}
```

**Comportamiento:**
- `Enter` → submit
- `Shift + Enter` → nueva línea
- `disabled` cuando `status !== "ready"`
- Botón muestra `Loader2` animado cuando `status === "submitted" || status === "streaming"`
- Botón muestra `Send` cuando `status === "ready"`

```tsx
<Input
  placeholder="Escribe tu mensaje..."
  disabled={disabled}
  // ... onChange, onKeyDown
/>
<Button size="icon" disabled={disabled || !value.trim()}>
  {disabled ? <Loader2 className="animate-spin" /> : <Send />}
</Button>
```

---

## 4. Estructura de Archivos

```
src/
├── app/
│   ├── layout.tsx                          # (existente — agregar SidebarProvider)
│   ├── page.tsx                            # (reescribir — HomePage con redirect)
│   ├── globals.css                         # (sin cambios)
│   ├── projects/
│   │   └── [id]/
│   │       └── chats/
│   │           └── [chatId]/
│   │               └── page.tsx            # NUEVO: ChatPage
│   └── api/
│       ├── projects/
│       │   ├── route.ts                    # NUEVO: GET + POST
│       │   └── [id]/
│       │       └── chats/
│       │           └── route.ts            # NUEVO: POST
│       └── chat/
│           └── route.ts                    # NUEVO: streamText endpoint
├── components/
│   ├── ui/
│   │   ├── button.tsx                      # (existente)
│   │   ├── sidebar.tsx                     # NUEVO: shadcn
│   │   ├── input.tsx                       # NUEVO: shadcn
│   │   ├── separator.tsx                   # NUEVO: shadcn
│   │   ├── scroll-area.tsx                 # NUEVO: shadcn
│   │   ├── collapsible.tsx                 # NUEVO: shadcn
│   │   ├── sheet.tsx                       # NUEVO: shadcn
│   │   ├── tooltip.tsx                     # NUEVO: shadcn
│   │   └── skeleton.tsx                    # NUEVO: shadcn
│   ├── AppSidebar.tsx                      # NUEVO
│   ├── ChatArea.tsx                        # NUEVO (usa useChat)
│   ├── ChatInput.tsx                       # NUEVO
│   ├── MessageBubble.tsx                   # NUEVO (renderiza parts)
│   ├── NewProjectButton.tsx                # NUEVO
│   └── NewChatButton.tsx                   # NUEVO
├── lib/
│   ├── utils.ts                            # (existente)
│   └── db-helpers.ts                       # NUEVO: queries comunes
└── db/
    ├── schema.ts                           # (existente)
    └── index.ts                            # (existente)
```

---

## 5. Dependencias

### A instalar

| Paquete | Versión | Uso |
|---------|---------|-----|
| `@ai-sdk/react` | latest | `useChat` hook para streaming de chat |

### Shadcn components a agregar

| Componente | Uso |
|-----------|-----|
| `sidebar` | AppSidebar completo (SidebarProvider, SidebarContent, SidebarGroup, SidebarMenu, etc.) |
| `input` | ChatInput |
| `separator` | Divisores en sidebar |
| `scroll-area` | Lista de mensajes scrolleable |
| `collapsible` | Grupos de proyecto colapsables |
| `sheet` | Sidebar en mobile |
| `tooltip` | Tooltips en sidebar colapsada |
| `skeleton` | Loading states |

---

## 6. Criterios de Aceptación

- [ ] **CA-1:** Al hacer click en "Nuevo proyecto", se crea proyecto + chat y se navega al chat
- [ ] **CA-2:** La sidebar muestra proyectos con chats anidados y colapsables
- [ ] **CA-3:** Se pueden crear múltiples chats por proyecto
- [ ] **CA-4:** Los mensajes del usuario se muestran alineados a la derecha con fondo primary
- [ ] **CA-5:** Las respuestas del asistente usan `react-markdown` con `remark-gfm`
- [ ] **CA-6:** El streaming funciona nativamente vía `useChat` (texto aparece progresivamente)
- [ ] **CA-7:** El input se deshabilita mientras `status !== "ready"`
- [ ] **CA-8:** Al cambiar de chat, el historial se reinicia (chat efímero)
- [ ] **CA-9:** HomePage redirige al último chat o muestra CTA
- [ ] **CA-10:** El proyecto compila sin errores de TypeScript
- [ ] **CA-11:** El linter de Biome no reporta errores
- [ ] **CA-12:** La variable `OPENAI_API_KEY` está documentada
