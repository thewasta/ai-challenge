# Tasks: Setup Inicial de Interfaz y Agente Conversacional Básico

**Change ID:** `initial-ui-chat-setup`  
**Design:** [initial-ui-chat-setup.md](../designs/initial-ui-chat-setup.md)  
**Fecha:** 2026-06-09

---

## Dependencias entre tareas

```
T1 (deps) ──► T2 (migración) ──► T3 (db-helpers)
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              T4a (api/chat)   T4b (api/projects) T4c (api/chats)
                    │                  │                  │
                    └──────┬───────────┴──────────────────┘
                           ▼
              T5a (ChatInput)   T5b (MessageBubble)
              T5c (NewProject)  T5d (NewChat)
                           │
                           ▼
              T6a (AppSidebar)  T6b (ChatArea)
                           │
                           ▼
              T7a (ChatLayout)  T7b (ChatPage)
              T7c (HomePage)
                           │
                           ▼
                    T8 (Verificación)
```

---

## T1: Instalar dependencias y shadcn components

**Archivos:** `package.json`, `src/components/ui/`  
**Dependencia de:** — (primera tarea)

### Pasos:

- [ ] Ejecutar `pnpm add @ai-sdk/react`
- [ ] Ejecutar `pnpm exec shadcn add sidebar`
- [ ] Ejecutar `pnpm exec shadcn add input`
- [ ] Ejecutar `pnpm exec shadcn add separator`
- [ ] Ejecutar `pnpm exec shadcn add scroll-area`
- [ ] Ejecutar `pnpm exec shadcn add collapsible`
- [ ] Ejecutar `pnpm exec shadcn add sheet`
- [ ] Ejecutar `pnpm exec shadcn add tooltip`
- [ ] Ejecutar `pnpm exec shadcn add skeleton`
- [ ] Verificar que `OPENAI_API_KEY` existe en `.env.local`; si no, crear `.env.local` con placeholder documentado
- [ ] Verificar `pnpm install` corre sin errores

---

## T2: Ejecutar migración de base de datos

**Archivos:** `sqlite.db`, `drizzle/`  
**Dependencia de:** T1

### Pasos:

- [ ] Ejecutar `pnpm exec drizzle-kit push`
- [ ] Verificar que las tablas `projects` y `chats` se crearon en `sqlite.db`
- [ ] Verificar que no hay errores en la salida del comando

---

## T3: Crear DB helpers

**Archivo:** `src/lib/db-helpers.ts` (nuevo)  
**Dependencia de:** T2

### Pasos:

- [ ] Crear `src/lib/db-helpers.ts`
- [ ] Implementar interfaz `ProjectWithChats` y `ChatRow`
- [ ] Implementar `getProjectsWithChats()` — query anidada projects + chats
- [ ] Implementar `getProject(id)` — query por ID
- [ ] Implementar `getLatestProjectWithChat()` — proyecto más reciente con su primer chat

---

## T4a: Crear API route `POST /api/chat`

**Archivo:** `src/app/api/chat/route.ts` (nuevo)  
**Dependencia de:** T1

### Pasos:

- [ ] Crear directorio `src/app/api/chat/`
- [ ] Crear `route.ts` con `POST` handler
- [ ] Importar `openai` de `@ai-sdk/openai`
- [ ] Importar `convertToModelMessages`, `streamText`, `UIMessage` de `ai`
- [ ] Configurar `export const maxDuration = 30`
- [ ] Implementar `streamText({ model: openai("gpt-4o-mini"), messages: await convertToModelMessages(messages) })`
- [ ] Retornar `result.toUIMessageStreamResponse()`

---

## T4b: Crear API route `GET + POST /api/projects`

**Archivo:** `src/app/api/projects/route.ts` (nuevo)  
**Dependencia de:** T3

### Pasos:

- [ ] Crear directorio `src/app/api/projects/`
- [ ] Crear `route.ts` con handlers `GET` y `POST`
- [ ] **GET:** Usar `getProjectsWithChats()` de `db-helpers`, retornar JSON
- [ ] **POST:** Contar proyectos, insertar proyecto con nombre placeholder `Proyecto #N — DD/MM/AAAA`, insertar primer chat, retornar `{ project, chat }` con status 201

---

## T4c: Crear API route `POST /api/projects/[id]/chats`

**Archivo:** `src/app/api/projects/[id]/chats/route.ts` (nuevo)  
**Dependencia de:** T3

### Pasos:

- [ ] Crear directorio `src/app/api/projects/[id]/chats/`
- [ ] Crear `route.ts` con handler `POST`
- [ ] Validar que el proyecto existe → 404 si no
- [ ] Contar chats del proyecto, insertar con título `Chat #N`
- [ ] Retornar chat creado con status 201

---

## T5a: Crear componente `ChatInput`

**Archivo:** `src/components/ChatInput.tsx` (nuevo)  
**Dependencia de:** T1

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Props: `onSend: (text: string) => void`, `disabled: boolean`, `status: string`
- [ ] Estado local `value` para el input
- [ ] Usar `Input` de shadcn + `Button` de shadcn con ícono `Send` / `Loader2`
- [ ] `handleSubmit`: validar no vacío, llamar `onSend`, limpiar input
- [ ] `handleKeyDown`: Enter sin Shift → submit; Shift+Enter → nueva línea
- [ ] Input deshabilitado cuando `disabled === true`
- [ ] Botón muestra spinner cuando `status === "submitted" || status === "streaming"`

---

## T5b: Crear componente `MessageBubble`

**Archivo:** `src/components/MessageBubble.tsx` (nuevo)  
**Dependencia de:** T1

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Props: `message: UIMessage` (importado de `ai`)
- [ ] Renderizar condicional: `message.role === "user"` → derecha, primary bg; `"assistant"` → izquierda, muted bg
- [ ] Iterar `message.parts[]`:
  - `part.type === "text"` → user: `<p>` con `whitespace-pre-wrap`; assistant: `<ReactMarkdown>` con `remarkGfm`
  - Otros types → `null` (preparado para futuros `tool-*`)
- [ ] Avatar `BotIcon` a la izquierda para assistant
- [ ] Estilos de Markdown con clases `prose` + overrides para tablas, código, listas

---

## T5c: Crear componente `NewProjectButton`

**Archivo:** `src/components/NewProjectButton.tsx` (nuevo)  
**Dependencia de:** T1

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Usar `useRouter` de `next/navigation`
- [ ] Estado `isLoading`
- [ ] `handleCreate`: `fetch POST /api/projects` → `router.push`
- [ ] Renderizar `SidebarMenuButton` con ícono `Plus` y texto "Nuevo proyecto"
- [ ] Mostrar `Loader2` animado cuando `isLoading`

---

## T5d: Crear componente `NewChatButton`

**Archivo:** `src/components/NewChatButton.tsx` (nuevo)  
**Dependencia de:** T1

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Props: `projectId: number`
- [ ] Usar `useRouter`
- [ ] `handleCreate`: `fetch POST /api/projects/${projectId}/chats` → `router.push`
- [ ] Renderizar `SidebarMenuButton` pequeño con ícono `Plus` y texto "Nuevo chat"
- [ ] Clase `text-muted-foreground text-xs`

---

## T6a: Crear componente `AppSidebar`

**Archivo:** `src/components/AppSidebar.tsx` (nuevo)  
**Dependencia de:** T1, T5c, T5d

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Props: `projects: ProjectWithChats[]`, `currentProjectId: number`, `currentChatId: number`
- [ ] Usar componentes shadcn: `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarSeparator`
- [ ] Usar `Collapsible` de shadcn para cada grupo de proyecto
- [ ] Header con logo/ícono `Zap` + "Consultor SEO" como link a `/`
- [ ] `NewProjectButton` al inicio
- [ ] Separador
- [ ] Mapear `projects` → `Collapsible` con `defaultOpen={project.id === currentProjectId}`
- [ ] Dentro de cada proyecto: mapear `chats` → `SidebarMenuButton` como `Link` con `isActive`
- [ ] `NewChatButton` al final de cada grupo
- [ ] Íconos: `Folder`, `MessageSquare`, `ChevronDown` (de lucide-react)

---

## T6b: Crear componente `ChatArea`

**Archivo:** `src/components/ChatArea.tsx` (nuevo)  
**Dependencia de:** T1, T5a, T5b

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Usar `useChat` de `@ai-sdk/react` con `DefaultChatTransport({ api: "/api/chat" })`
- [ ] Desestructurar: `messages`, `status`, `sendMessage`, `error`
- [ ] Layout: `flex flex-col h-[calc(100vh-3.5rem)]`
- [ ] `ScrollArea` con lista de `MessageBubble`
- [ ] Empty state: ícono `MessageSquare` + texto "Escribe tu primer mensaje..."
- [ ] `ChatInput` abajo con `onSend={(text) => sendMessage({ text })}`, `disabled={status !== "ready"}`
- [ ] Barra de error abajo si `error` existe

---

## T7a: Crear componente `ChatLayout`

**Archivo:** `src/components/ChatLayout.tsx` (nuevo)  
**Dependencia de:** T1, T6a, T6b

### Pasos:

- [ ] Crear Client Component con `"use client"`
- [ ] Props: `projects: ProjectWithChats[]`, `currentProjectId: number`, `currentChatId: number`
- [ ] Envolver en `SidebarProvider`
- [ ] Renderizar `AppSidebar` + `SidebarInset`
- [ ] `SidebarInset` contiene: `header` con `SidebarTrigger` + breadcrumb, `ChatArea`

---

## T7b: Crear página `ChatPage`

**Archivo:** `src/app/projects/[id]/chats/[chatId]/page.tsx` (nuevo)  
**Dependencia de:** T3, T7a

### Pasos:

- [ ] Crear directorio `src/app/projects/[id]/chats/[chatId]/`
- [ ] Crear `page.tsx` como Server Component (async)
- [ ] Extraer `id` y `chatId` de `params`
- [ ] Llamar `getProjectsWithChats()` y `getProject(Number(id))`
- [ ] Si no hay proyecto → `notFound()`
- [ ] Renderizar `<ChatLayout projects={...} currentProjectId={...} currentChatId={...} />`

---

## T7c: Actualizar `HomePage` y crear `HomePageClient`

**Archivos:** `src/app/page.tsx` (reescribir), `src/components/HomePageClient.tsx` (nuevo)  
**Dependencia de:** T3

### Pasos:

- [ ] Reescribir `src/app/page.tsx` como Server Component
- [ ] Llamar `getLatestProjectWithChat()`
- [ ] Si hay resultado → `redirect("/projects/${id}/chats/${chatId}")`
- [ ] Si no → renderizar `<HomePageClient />`
- [ ] Crear `src/components/HomePageClient.tsx`:
  - Landing con ícono, título, subtítulo
  - `NewProjectButtonHome` (similar a `NewProjectButton` pero con `Button size="lg"` y texto "Crear primer proyecto")

---

## T8: Verificación

**Dependencia de:** T7c

### Pasos:

- [ ] Ejecutar `pnpm exec tsc --noEmit` → 0 errores de TypeScript
- [ ] Ejecutar `pnpm exec biome check --write .` → 0 errores de linting
- [ ] Ejecutar `pnpm build` → build exitoso
- [ ] Ejecutar `pnpm dev` y verificar manualmente:
  - [ ] HomePage muestra landing (sin proyectos)
  - [ ] Click "Crear primer proyecto" → navega al chat
  - [ ] Sidebar muestra el proyecto creado con Chat #1
  - [ ] Enviar mensaje → respuesta streaming del asistente
  - [ ] Markdown se renderiza correctamente (probar con tablas, listas, código)
  - [ ] "Nuevo chat" crea otro chat en el mismo proyecto
  - [ ] "Nuevo proyecto" crea otro proyecto
  - [ ] Navegación entre chats reinicia mensajes (efímero)
- [ ] Verificar accesibilidad según `.pi/skills/accesibility/SKILL.md`:
  - [ ] Todos los inputs tienen labels o aria-labels
  - [ ] Botones tienen texto accesible
  - [ ] Navegación por teclado funcional (Tab, Enter, Escape)
  - [ ] Contraste de colores adecuado (primary sobre background)

---

## Resumen

| Tarea | Archivos | Tipo |
|-------|----------|------|
| T1 | `package.json`, `src/components/ui/*` | Setup |
| T2 | `sqlite.db` | DB |
| T3 | `src/lib/db-helpers.ts` | Datos |
| T4a | `src/app/api/chat/route.ts` | API |
| T4b | `src/app/api/projects/route.ts` | API |
| T4c | `src/app/api/projects/[id]/chats/route.ts` | API |
| T5a | `src/components/ChatInput.tsx` | UI |
| T5b | `src/components/MessageBubble.tsx` | UI |
| T5c | `src/components/NewProjectButton.tsx` | UI |
| T5d | `src/components/NewChatButton.tsx` | UI |
| T6a | `src/components/AppSidebar.tsx` | UI |
| T6b | `src/components/ChatArea.tsx` | UI |
| T7a | `src/components/ChatLayout.tsx` | UI |
| T7b | `src/app/projects/[id]/chats/[chatId]/page.tsx` | Página |
| T7c | `src/app/page.tsx`, `src/components/HomePageClient.tsx` | Página |
| T8 | — | Verificación |
