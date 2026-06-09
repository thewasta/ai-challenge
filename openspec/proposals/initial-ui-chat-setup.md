# Propuesta: Setup Inicial de Interfaz y Agente Conversacional Básico

**Change ID:** `initial-ui-chat-setup`  
**Estado:** Draft  
**Fecha:** 2026-06-09  
**User Stories:** US-001 (Onboarding), US-002 (Chat Básico)

---

## Resumen Ejecutivo

Crear el esqueleto visual y funcional del MVP usando el **Vercel AI SDK** (`useChat` + `streamText`): sidebar jerárquica (Proyectos → Chats), interfaz de chat con streaming nativo, y un agente conversacional básico (sin tools ni system prompt) usando GPT-4o-mini. El onboarding del proyecto será manejado por el agente de IA en fases futuras; por ahora los proyectos se crean con un nombre placeholder y van directo al chat.

## Problema de Negocio

Actualmente el proyecto tiene toda la infraestructura configurada (DB schema, design system, dependencias) pero cero funcionalidad de cara al usuario. Solo existe un landing page. Necesitamos la primera versión funcional que permita:

1. Crear proyectos de forma ágil (un clic, placeholder, al chat)
2. Iniciar múltiples conversaciones por proyecto
3. Visualizar el flujo de interacción completo con IA usando el AI SDK

## Alcance (In Scope)

### Páginas y Rutas
- **`/`** — HomePage: si hay proyectos → redirect al chat más reciente; si no → landing con CTA
- **`/projects/[id]/chats/[chatId]`** — Página de chat con sidebar jerárquica + área de chat (`useChat`)

### API Routes
- **`POST /api/projects`** — Crear proyecto (placeholder) + primer chat
- **`GET /api/projects`** — Listar proyectos con chats anidados
- **`POST /api/projects/[id]/chats`** — Crear nuevo chat dentro de un proyecto
- **`POST /api/chat`** — Endpoint de chat con `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse()`

### Frontend (AI SDK `useChat`)
- **`useChat` de `@ai-sdk/react`** — Maneja mensajes, streaming, status, errores automáticamente
- **`DefaultChatTransport`** — Transporte HTTP estándar hacia `/api/chat`
- **`message.parts`** — Renderizado de partes (text, tool-*, etc.) en lugar de `content` plano

### Sidebar (shadcn/ui)
Estructura jerárquica con `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`:
```
[+ Nuevo proyecto]
─────────────────────
📁 Proyecto A          ▸
   💬 Chat 1
   💬 Chat 2
   [+ Nuevo chat]
```

### Componentes
| Componente | shadcn | Descripción |
|-----------|--------|-------------|
| `AppSidebar` | sidebar, collapsible, separator | Sidebar jerárquica proyectos→chats |
| `NewProjectButton` | button | Crea proyecto + navega al chat |
| `NewChatButton` | button | Crea chat dentro de proyecto |
| `ChatArea` | scroll-area | Wrapper de `useChat` con lista de mensajes |
| `MessageBubble` | — | Renderiza `message.parts` (texto plano / Markdown) |
| `ChatInput` | input, button | Input con Enter=send, usa `status` del hook |

### Infraestructura
- **Migraciones DB:** `drizzle-kit push` para `projects` y `chats`
- **Chat efímero:** `useChat` mantiene mensajes en estado (se pierden al cambiar de chat)
- **Modelo IA:** GPT-4o-mini vía `@ai-sdk/openai`
- **Dependencia nueva:** `@ai-sdk/react` para `useChat`

## Fuera de Alcance (Non-Goals)

- ❌ Formulario de onboarding (el agente lo hará en fase futura)
- ❌ System prompt del agente
- ❌ Tools de SEO (mockLighthouseAudit, mockDataForSeoKeywords)
- ❌ Arquitectura multi-agente
- ❌ Persistencia de mensajes en tabla `messages`
- ❌ Edición/eliminación de proyectos o chats

## Decisiones Técnicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| AI SDK UI | `useChat` + `DefaultChatTransport` | Streaming, estado y errores manejados por el SDK |
| API chat | `streamText` + `toUIMessageStreamResponse()` | Protocolo nativo UI message stream del AI SDK |
| Modelo IA | GPT-4o-mini | Barato, rápido, suficiente para chat conversacional |
| Librería UI | shadcn/ui (Base UI + Tailwind) | Consistente con design system, ya instalado |
| Creación proyecto | Placeholder automático | Sin formulario; agente hará onboarding después |
| Sidebar data | Server Component + DB directa | Sin API call extra, datos frescos en SSR |

## Preguntas Abiertas Resueltas

- **AI SDK pattern:** `useChat` + `streamText` + `convertToModelMessages` ✅
- **Modelo IA:** GPT-4o-mini ✅
- **Sidebar:** Jerárquica Proyectos → Chats ✅
- **Formulario onboarding:** No existe en esta fase ✅
- **Persistencia mensajes:** Efímero (estado de `useChat`) ✅
