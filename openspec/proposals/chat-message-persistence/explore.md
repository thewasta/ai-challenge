Given the timeout, I'll provide the complete exploration document inline. Here is the comprehensive **explore.md** content ready for the file:

---

# Exploración: Chat Message Persistence (chat-message-persistence)

**Change ID:** `chat-message-persistence`  
**Fase SDD:** Explore  
**Fecha:** 2026-06-10  
**User Stories:** FR-2 (Persistencia de mensajes), FR-3 (Multi-tool activation)  
**AI SDK Version:** 6.0.198 (@ai-sdk/react 3.0.200, @ai-sdk/openai 3.0.68)

---

## 1. Resumen Ejecutivo

Este documento explora la implementación de **persistencia completa de mensajes de chat** en OpenAI API format. Actualmente, la aplicación pierde todos los mensajes al recargar la página porque:
- No hay almacenamiento en base de datos
- El hook `useChat` maneja solo estado en memoria (efímero)
- El API route `/api/chat` no guarda mensajes

El cambio requiere:
1. Ampliar el schema de `messages` table para capturar full OpenAI message structure
2. Implementar guardado y carga de mensajes en backend
3. Modificar `useChat` para cargar historial y conectar con `chatId`
4. Convertir entre formatos: UIMessage ↔ ModelMessage ↔ OpenAI format

---

## 2. Entendimiento Actual del Proyecto

### Estado del Código

**Base de datos (`src/db/schema.ts`)**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] }).notNull().default("user"),
  content: text("content").notNull().default(""),
  toolName: text("tool_name"),        // ❌ Insuficiente para full tool call
  toolResult: text("tool_result"),    // ❌ No preserva tool_call_id ni función arguments
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

**Problemas identificados:**
- `toolName` + `toolResult` es un modelo **flatten** de tool calls
- No captura `tool_call_id` (correlación entre assistant message y tool message)
- No preserva `function.arguments` JSON del assistant
- No puede reconstruir OpenAI format exactamente

**API Route (`src/app/api/chat/route.ts`)**
```typescript
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: openai("gpt-4.1-nano"),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
  // ❌ NO persiste, returns response directly
}
```

**ChatArea Component (`src/components/ChatArea.tsx`)**
```typescript
const { messages, status, sendMessage, error } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
  // ❌ Sin chatId
  // ❌ Sin initialMessages
  // ❌ Sin onFinish callback para persistir
});
```

### Arquitectura Actual del AI SDK v6

**Formato UIMessage** (client-side, human-readable)
```typescript
interface UIMessage {
  id: string;                    // unique ID
  role: 'user' | 'assistant' | 'system';  
  parts: UIMessagePart[];         // [ TextUIPart | ToolUIPart | ... ]
  metadata?: unknown;
}

// Tool part example:
{
  type: 'tool-lightouseAudit',    // type: `tool-${toolName}`
  toolCallId: 'call_abc123',      // unique tool call ID
  state: 'output-available',      // input-streaming | input-available | output-available | output-error | ...
  input: { domain: 'example.com' },
  output: { score: 89, ... },
}
```

**Formato ModelMessage** (API-ready, from provider-utils)
```typescript
type ModelMessage = 
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;

// AssistantModelMessage con tool calls:
{
  role: 'assistant',
  content: [
    { type: 'text', text: '...' },
    { 
      type: 'tool-use', 
      toolUseId: 'call_abc123',
      toolName: 'lightouseAudit',
      input: { ... }
    }
  ]
}

// ToolModelMessage (respuesta a tool call):
{
  role: 'tool',
  toolUseId: 'call_abc123',           // matches toolUseId above
  content: [{ type: 'text', text: '...' }]
}
```

**Formato OpenAI** (native para GPT-4)
```json
[
  {
    "role": "user",
    "content": "Audit my site example.com"
  },
  {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "..." },
      { "type": "tool_call", "id": "call_abc123", "function": {"name": "lightouseAudit", "arguments": "{...}"} }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "call_abc123",
    "content": "[{\"score\": 89}]"
  }
]
```

---

## 3. Análisis de Conversión entre Formatos

### Mapeo de Conceptos

| Aspecto | UIMessage | ModelMessage | OpenAI API |
|--------|-----------|--------------|-----------|
| **Role** | user \| assistant \| system | user \| assistant \| tool \| system | user \| assistant \| tool \| system |
| **User Content** | parts: [TextUIPart] | content: string | content: string |
| **Tool Call ID** | toolCallId | toolUseId | id (en tool_call object) |
| **Tool Result ID** | (implícito en message.id) | toolUseId | tool_call_id |
| **Tool Arguments** | input: {} (estructured) | input: {} (object) | arguments: "{JSON string}" |
| **Streaming** | parts.state | (no applicable) | (no applicable) |

### Punto Crítico: tool_call_id

En OpenAI API:
```json
{ "role": "assistant", "content": [{"type": "tool_call", "id": "call_abc", "function": {...}}] }
{ "role": "tool", "tool_call_id": "call_abc", "content": "..." }
```

**El `id` y `tool_call_id` deben coincidir** para que OpenAI correlacione la respuesta con la llamada.

En AI SDK UIMessage:
- Cada tool part tiene `toolCallId: string`
- El SDK genera estos IDs automáticamente durante streaming
- **Implicación:** Si guardamos UIMessage y la recargamos, los IDs deben ser idénticos para que OpenAI los reconozca

---

## 4. Respuestas a las 6 Preguntas Clave

### Pregunta 1: ¿Qué mapeo existe entre UIMessage, ModelMessage y OpenAI format?

**Respuesta:** Conversión bidireccional pero con pérdida potencial si no se preservan los IDs de tool calls.

**Flujo actual:**
```
UIMessage[] (client)
    ↓ convertToModelMessages()
ModelMessage[]
    ↓ model.doGenerate() (OpenAI)
OpenAI Response (tool_calls + text)
    ↓ toUIMessageStreamResponse()
UIMessage[] (client, nuevos)
```

**Implicación para persistencia:**
- Guardar `UIMessage` directamente es más seguro (preserva `toolCallId`, `parts.state`)
- Convertir a JSON serializable: `toolCallId` → `"call_abc"`, `parts` array → array of objects
- Al recuperar, reconstruir `UIMessage` object y pasar a `useChat` via `initialMessages`

### Pregunta 2: ¿Guardar como JSON blob o modelo relacional normalizado?

**Respuesta:** **JSON blob es la opción recomendada** por 3 razones:

**Opción A: JSON blob (RECOMENDADA)**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  role TEXT NOT NULL,
  -- Una columna para toda la UIMessage serializada
  messageData JSON NOT NULL,  -- {"id": "msg_xyz", "role": "assistant", "parts": [...]}
  createdAt TIMESTAMP NOT NULL
);
```
✅ Preserva estructura completa de UIMessage sin pérdida  
✅ Flexible para cambios futuros en AI SDK  
✅ Fácil de serializar/deserializar  
❌ Menos "queryable" (no puedes hacer SELECT * WHERE messageData->>'role' = 'assistant' fácilmente)

**Opción B: Relacional normalizado**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  messageId TEXT NOT NULL,    -- UIMessage.id
  createdAt TIMESTAMP NOT NULL
);

CREATE TABLE messageParts (
  id INTEGER PRIMARY KEY,
  messageId INTEGER NOT NULL,
  partType TEXT NOT NULL,     -- 'text' | 'tool-lightouseAudit' | ...
  partData JSON NOT NULL,     -- { "text": "..." } o { "toolCallId": "...", "input": {...}, ...}
);

CREATE TABLE toolCalls (
  id INTEGER PRIMARY KEY,
  messagePart INTEGER NOT NULL,
  toolCallId TEXT NOT NULL,
  toolName TEXT NOT NULL,
  input JSON NOT NULL,
  output JSON,
  errorText TEXT,
  state TEXT NOT NULL,        -- 'output-available' | 'output-error' | ...
);
```
✅ Normalizado, queryable  
✅ Permite búsquedas como "todos los tool calls del tipo lightouseAudit"  
❌ Complejidad de joins al recuperar un mensaje  
❌ Sincronización entre tablas (FK constraints)  
❌ Fragmentación de la UIMessage

**Recomendación:** Usar **Opción A (JSON blob)** porque:
1. El SDK puede cambiar la estructura de UIMessage en futuras versiones
2. SQLite tiene soporte de JSON functions si necesitas queries después
3. Simplicidad = menos bugs
4. Para MVP, buscabilidad no es crítica

### Pregunta 3: ¿Cómo manejar streaming? ¿Guardar después de que termina o incrementalmente?

**Respuesta:** **Guardar después de completar el streaming** (onFinish callback).

**Por qué NO guardar incrementalmente:**
- Streaming de `text` partes sucede por chunks (múltiples writes)
- Tool calls pueden estar "input-streaming" luego "input-available" luego "output-available"
- Estados intermedios son inconsistentes

**Estrategia (recomendada):**
```typescript
const { messages } = useChat({
  onFinish: async (message: UIMessage) => {
    // Después de que el streaming termina, guardar a DB
    await fetch('/api/messages/save', {
      method: 'POST',
      body: JSON.stringify({ chatId, message })
    });
  }
});
```

**API endpoint `/api/messages/save`:**
```typescript
export async function POST(req: Request) {
  const { chatId, message }: { chatId: number; message: UIMessage } = await req.json();
  
  // Serializar UIMessage a JSON
  const messageData = JSON.stringify(message);
  
  // Guardar en DB
  await db.insert(messages).values({
    chatId,
    role: message.role,
    messageData,
    createdAt: new Date()
  });
  
  return Response.json({ success: true });
}
```

**Ventajas:**
- Estado consistente en DB
- Una transacción por mensaje (no múltiples writes)
- Fácil debugging (ves el mensaje completo)

### Pregunta 4: ¿Cómo cambiar el cliente para cargar historial y usar chatId?

**Respuesta:** 3 cambios principales en ChatArea.tsx:

**Paso 1: Pasar `chatId` y cargar `initialMessages`**
```typescript
interface ChatAreaProps {
  chatId: number;
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  
  // Cargar historial de DB
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      const data = await res.json(); // { messages: UIMessage[] }
      setInitialMessages(data.messages);
    })();
  }, [chatId]);
  
  const { messages, status, sendMessage, error } = useChat({
    initialMessages,  // ← Cargar historial previo
    body: { chatId }, // ← Pasar chatId al API
    onFinish: async (message: UIMessage) => {
      // Guardar mensaje después de completar
      await fetch('/api/messages/save', {
        method: 'POST',
        body: JSON.stringify({ chatId, message })
      });
    }
  });
  
  return (/* ... */);
}
```

**Paso 2: Actualizar API route para aceptar `chatId`**
```typescript
export async function POST(req: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: number } = await req.json();
  
  // Convertir a ModelMessage y llamar model
  const result = streamText({
    model: openai("gpt-4.1-nano"),
    messages: await convertToModelMessages(messages),
  });
  
  // NO guardar aquí; el cliente guardará via onFinish
  return result.toUIMessageStreamResponse();
}
```

**Paso 3: Crear endpoint para cargar mensajes**
```typescript
// GET /api/chats/[id]/messages
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const chatId = parseInt(params.id);
  
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
  
  // Deserializar messageData JSON → UIMessage[]
  const uiMessages: UIMessage[] = rows.map(row => ({
    ...JSON.parse(row.messageData),
    // Asegurar que tiene ID si no estaba serializado
  }));
  
  return Response.json({ messages: uiMessages });
}
```

### Pregunta 5: ¿Qué cambios al schema de DB se necesitan para preservar full tool call structure?

**Respuesta:** Schema mínimo revisado:

**Opción Recomendada (JSON blob):**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  
  // Nueva columna: serialized UIMessage JSON
  messageData: text("message_data")
    .notNull()
    .$type<UIMessage>(),  // Type hint para TypeScript
  
  // Columnas denormalizadas para queries rápidas (opcional)
  role: text("role", { enum: ["user", "assistant", "tool"] })
    .notNull(),
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  
  // Eliminar: toolName, toolResult (redundante con messageData)
});
```

**Alternativa (si queremos queries en tool calls):**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] })
    .notNull(),
  
  // JSON completo UIMessage
  messageData: text("message_data")
    .notNull()
    .$type<UIMessage>(),
  
  // Para búsquedas, serializar tool calls summary
  toolCallSummary: text("tool_call_summary"),  // JSON: [{ toolName, state }]
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Migración necesaria:**
```bash
# Generar migración
pnpm exec drizzle-kit generate --dialect sqlite

# Aplicar
pnpm exec drizzle-kit push
```

### Pregunta 6: ¿Cuál es la versión actual de AI SDK y APIs relevantes?

**Respuesta:** Versiones instaladas y APIs clave:

**Versiones:**
- `ai@6.0.198` ← última, contiene `UIMessage`, `convertToModelMessages`, `streamText`
- `@ai-sdk/react@3.0.200` ← `useChat` hook
- `@ai-sdk/openai@3.0.68` ← provider OpenAI

**APIs clave para persistencia:**

1. **`useChat()` options (v6.0.198)**
   ```typescript
   {
     initialMessages?: UIMessage[];        // ← Cargar historial
     body?: Record<string, any>;           // ← Pasar chatId
     onFinish?: (message: UIMessage) => void | Promise<void>; // ← Guardar
     onError?: (error: Error) => void;
     onToolCall?: (toolCall: ToolCall) => void | Promise<void>;
   }
   ```

2. **`streamText()` en server (v6.0.198)**
   ```typescript
   {
     model: LanguageModel;
     messages: ModelMessage[];
     system?: string | SystemModelMessage;
     tools?: Record<string, Tool>;
     // ... más options
   }
   ```

3. **`convertToModelMessages()` (v6.0.198)**
   ```typescript
   // Convierte UIMessage[] → ModelMessage[]
   const modelMessages = await convertToModelMessages(uiMessages);
   ```

4. **`toUIMessageStreamResponse()` (v6.0.198)**
   ```typescript
   // Convierte ReadableStream → UIMessageStreamResponse
   return streamTextResult.toUIMessageStreamResponse();
   ```

---

## 5. Estrategia de Implementación Recomendada

### Fases

**Fase 1: Schema + Endpoints (Backend)**
1. Revisar schema `messages` table → agregar `messageData` JSON
2. Crear migración Drizzle
3. Crear endpoints:
   - `GET /api/chats/[id]/messages` — cargar historial
   - `POST /api/messages/save` — guardar mensaje después de stream

**Fase 2: Cliente UI (useChat + Persistencia)**
1. Agregar `chatId` prop a `ChatArea`
2. Cargar `initialMessages` via `useEffect` + `/api/chats/[id]/messages`
3. Pasar `chatId` en `body` del `useChat`
4. Implementar `onFinish` callback para guardar vía `/api/messages/save`

**Fase 3: Helpers DB (Query Functions)**
1. Crear función `getMessagesByChat(chatId)` en `src/lib/db-helpers.ts`
2. Serializar/deserializar UIMessage JSON

**Fase 4: Validación**
1. Typecheck: `pnpm exec tsc --noEmit`
2. Linting: `pnpm exec @biomejs/biome check --apply .`
3. Test manual: crear chat, recargar página, verificar persistencia

### Ejemplo Pseudocódigo Completo

**Schema (src/db/schema.ts)**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
  messageData: text("message_data").notNull(), // JSON serializado UIMessage
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

**DB Helper (src/lib/db-helpers.ts)**
```typescript
export async function getMessagesByChat(chatId: number): Promise<UIMessage[]> {
  const rows = await db.select().from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
  
  return rows.map(row => JSON.parse(row.messageData) as UIMessage);
}

export async function saveMessage(chatId: number, message: UIMessage): Promise<void> {
  await db.insert(messages).values({
    chatId,
    role: message.role,
    messageData: JSON.stringify(message),
    createdAt: new Date()
  });
}
```

**API Endpoint (src/app/api/chats/[id]/messages/route.ts)**
```typescript
import { getMessagesByChat } from "@/lib/db-helpers";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const chatId = parseInt(params.id);
  const messages = await getMessagesByChat(chatId);
  return Response.json({ messages });
}
```

**API Endpoint (src/app/api/messages/save/route.ts)**
```typescript
import { saveMessage } from "@/lib/db-helpers";
import type { UIMessage } from "ai";

export async function POST(req: Request) {
  const { chatId, message }: { chatId: number; message: UIMessage } = await req.json();
  await saveMessage(chatId, message);
  return Response.json({ success: true });
}
```

**Cliente (src/components/ChatArea.tsx)**
```typescript
"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

export interface ChatAreaProps {
  chatId: number;
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      const { messages } = await res.json();
      setInitialMessages(messages);
    })();
  }, [chatId]);

  const { messages, status, sendMessage, error } = useChat({
    initialMessages,
    body: { chatId },
    onFinish: async (message: UIMessage) => {
      await fetch("/api/messages/save", {
        method: "POST",
        body: JSON.stringify({ chatId, message })
      });
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Renderizar messages con MessageBubble */}
      {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
      {/* ChatInput */}
    </div>
  );
}
```

---

## 6. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|--------|-----------|
| **Tool Call ID mismatch al recargar** | Conversación rota, assistant no reconoce tool responses | Preservar `toolCallId` exacto en JSON; validar en schema |
| **JSON serialización de UIMessage incompleta** | Pérdida de metadata/state durante persistencia | Usar `JSON.stringify(message)` directo; no filtrar propiedades |
| **Race condition: doble guardado en onFinish** | Mensajes duplicados en DB | Agregar `chatId + messageId` como unique constraint, o usar `.execute()` con UPSERT |
| **Histórico muy largo (1000+ mensajes)** | Lentitud al cargar initialMessages, OOM | Implementar paginación o lazy-load después (no en MVP) |
| **Cambios futuros en estructura UIMessage (AI SDK v7)** | Schema desactualizado | Documentar que messageData es "opaque JSON"; considerar version column |

---

## 7. Decisiones de Diseño Pendientes

1. **¿Serializar también user messages del cliente antes de enviar?**
   - Opción A: Cliente envía UIMessage[]
   - Opción B: API genera UIMessage para user messages (más simple)
   - **Recomendación:** Opción B, el API genera `{ id: generateId(), role: 'user', parts: [{ type: 'text', text: userInput }] }`

2. **¿Versionar schema de messageData?**
   - Agregar columna `messageDataVersion: integer` para migrar si cambia estructura
   - **Recomendación:** No en MVP; si es urgente, usar version number en field

3. **¿Permitir edición de mensajes guardados?**
   - FR-2 dice "guardar", no dice "inmutable"
   - **Recomendación:** No en MVP (escope creep)

4. **¿Qué modelo de IA usamos finalmente?** (pendiente del PRD sección 8)
   - Actualmente `gpt-4.1-nano` en hardcoded
   - Debería parametrizarse
   - **Nota:** No afecta a persistencia directamente

---

## 8. Conclusiones

### Hallazgos Clave

1. **Format Mapping:** Existe conversión bidireccional UIMessage ↔ ModelMessage, pero el AI SDK v6 preserva bien los IDs de tool calls si se serializa el UIMessage completo.

2. **JSON Blob es mejor que Relacional:** Para MVP, almacenar todo UIMessage como JSON es más simple, flexible y menos propenso a bugs de sincronización.

3. **Streaming Post-Completion:** Guardar después de que el stream termina (callback `onFinish`) evita estados intermedios inconsistentes.

4. **3 Cambios Necesarios:**
   - Schema: agregar `messageData` column (JSON text)
   - Backend: endpoints `/api/chats/[id]/messages` + `/api/messages/save`
   - Frontend: `useChat` con `initialMessages`, `body`, `onFinish`

5. **Compatibilidad:** AI SDK v6.0.198 tiene todas las APIs necesarias; no hay breaking changes esperados en v6.x.

### Próximos Pasos

- [ ] **Spec/Design:** Definir exactamente el formato del JSON (¿incluir messageId generado por client o por server?)
- [ ] **Tasks:** Crear issue con lista de cambios (schema, 2 endpoints, 1 component update)
- [ ] **Apply:** Implementar cambios en orden: schema → DB queries → API endpoints → cliente
- [ ] **Verify:** Typecheck, lint, test manual de crear chat → recargar → ver persistencia

---

## Apéndice A: Ejemplos de Serialización

### User Message
```json
{
  "id": "msg_user_001",
  "role": "user",
  "parts": [
    {
      "type": "text",
      "text": "Audita mi home page en example.com"
    }
  ]
}
```

### Assistant Message con Tool Call
```json
{
  "id": "msg_asst_001",
  "role": "assistant",
  "parts": [
    {
      "type": "text",
      "text": "Voy a ejecutar una auditoría de Lighthouse...",
      "state": "done"
    },
    {
      "type": "tool-lightouseAudit",
      "toolCallId": "call_lt_12345",
      "state": "output-available",
      "input": {
        "domain": "example.com"
      },
      "output": {
        "score": 89,
        "metrics": { "LCP": 2.3, "FID": 0.1 }
      }
    }
  ]
}
```

### Correspondencia OpenAI
```json
[
  {
    "role": "user",
    "content": "Audita mi home page en example.com"
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Voy a ejecutar una auditoría de Lighthouse..."
      },
      {
        "type": "tool_call",
        "id": "call_lt_12345",
        "function": {
          "name": "lightouseAudit",
          "arguments": "{\"domain\": \"example.com\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "call_lt_12345",
    "content": "{\"score\": 89, \"metrics\": {\"LCP\": 2.3, \"FID\": 0.1}}"
  }
]
```

---

**Documento preparado por:** SDD Explore Executor  
**Próxima Fase:** Proposal (con iteración de preguntas de diseño)

---

## Summary of Findings

### Key Discoveries

1. **Message Format Deep Dive:** The AI SDK v6.0.198 uses a sophisticated three-layer message system (UIMessage client-side, ModelMessage API-ready, OpenAI API format), with tool calls using numeric IDs that must be preserved exactly for correlation.

2. **Current State Critical Gap:** The current schema only has `toolName` + `toolResult` columns, which cannot represent the full structure of tool calls with IDs, function arguments, and stateful parts.

3. **Recommended Storage Strategy:** A JSON blob approach storing the complete UIMessage object is superior to relational normalization for MVP (simpler, more flexible, fewer sync issues).

4. **Streaming Handling:** The `onFinish` callback is the correct hook to use for persisting after streaming completes, avoiding partial/inconsistent message states.

5. **Implementation Pattern:** Three coordinated changes are needed:
   - Schema evolution (add `messageData` column)
   - Two new API endpoints (load history, save message)
   - ChatArea component refactoring (add `chatId`, `initialMessages`, `onFinish`)

### Skill Resolution
- **skill_resolution:** paths-injected (AI SDK skill was pre-loaded)
- **AI SDK version verified:** 6.0.198 with all required APIs
- **No additional skills needed:** Current stack is sufficient

---

**DELIVERABLE STATUS:**
- ✅ Complete explore phase analysis
- ✅ All 6 key questions answered
- ✅ Implementation strategy provided
- ⚠️  **File Writing:** Content ready but requires manual save to `/openspec/proposals/chat-message-persistence/explore.md`

Please create the file at the specified path with the above content and continue to the **Proposal phase** when ready. The exploration establishes that this change is feasible and provides clear implementation guidance.