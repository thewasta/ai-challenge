# Proposal: Chat Message Persistence (chat-message-persistence)

**Change ID:** `chat-message-persistence`  
**Fase SDD:** Proposal  
**Fecha:** 2026-06-10  
**User Story:** FR-2 (Persistencia de mensajes)  
**AI SDK Version:** 6.0.198

---

## 1. Business Problem

Actualmente, la aplicación pierde **todos los mensajes** al recargar la página. El chat funciona efímeramente en memoria del navegador vía `useChat`, sin respaldo en SQLite. Esto impide:

- Retomar conversaciones anteriores
- Que el orquestador multi-agente tenga contexto histórico (FR-3 futuro)
- Cumplir con FR-2 del PRD: _"El backend debe guardar todos los mensajes en la tabla messages de SQLite para mantener la persistencia entre recargas"_

Además, el schema actual de `messages` es insuficiente: modela tool calls con columnas planas (`toolName` + `toolResult`) que no preservan `tool_call_id`, `function.arguments`, ni el estado de streaming de las partes. Esto impediría reconstruir exactamente el historial en formato OpenAI cuando se implementen herramientas (FR-3).

## 2. Proposed Solution

Implementar persistencia completa de mensajes preservando la estructura nativa de `UIMessage` del AI SDK (que mapea bidireccionalmente a OpenAI format), con 3 cambios coordinados:

1. **Schema:** Reemplazar columnas `toolName`/`toolResult` por `messageData` (JSON blob del UIMessage completo)
2. **Backend:**
   - `GET /api/chats/[id]` — devuelve los detalles del chat con su array de mensajes embebido
   - `POST /api/chats/sendMessage` — persiste un mensaje y devuelve confirmación o error
3. **Frontend:** `ChatArea` recibe `chatId`, carga historial desde `GET /api/chats/[id]`, y persiste vía `POST /api/chats/sendMessage` en callback `onFinish`

### Design Decisions (validadas en proposal question round)

| Decisión | Elección | Justificación |
|---|---|---|
| Timing de guardado | Solo al finalizar stream | Una transacción atómica, más simple |
| Tool failures | Campo `output` del tool part | AI SDK ya serializa errores así |
| Carga de historial | Todos los mensajes sin límite | SQLite local, no es bottleneck |
| Versionado de schema | Sin versionado | Migrar datos si AI SDK v7 cambia |
| Deduplicación | UPSERT por `message.id` | Previene duplicados si `onFinish` reintenta |

## 3. Scope

### In Scope
- [ ] Migrar schema: agregar `messageData` TEXT NOT NULL, eliminar `toolName`/`toolResult`
- [ ] `GET /api/chats/[id]` — devuelve datos del chat + array `messages` con todos los UIMessage serializados
- [ ] `POST /api/chats/sendMessage` — recibe `{ chatId, message }`, persiste en DB, responde `{ success: true }` o error
- [ ] `ChatArea` acepta prop `chatId`, carga historial vía `initialMessages`
- [ ] `ChatArea` configura `onFinish` para guardar tras cada respuesta del asistente
- [ ] `ChatArea` envía `chatId` en `body` del `useChat`
- [ ] DB helpers: `getMessagesByChat(chatId)`, `saveMessage(chatId, message)`
- [ ] UPSERT semantics para prevenir mensajes duplicados
- [ ] Typecheck + lint + smoke test manual

### Non-Goals (Fuera del Alcance)
- ❌ Paginación/lazy-load de historial (MVP: cargar todo)
- ❌ Edición o eliminación de mensajes guardados
- ❌ Persistencia de system messages (no se usan aún en este MVP)
- ❌ Streaming incremental a DB (complejidad innecesaria)
- ❌ Columnas de consulta para tool calls (usar JSON functions de SQLite si hace falta)
- ❌ Migración automática de datos existentes (no hay mensajes guardados aún)

## 4. Technical Approach

### Schema Migration
```sql
-- Before
CREATE TABLE messages (
  id, chatId, role, content, toolName, toolResult, createdAt
);

-- After
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
  message_data TEXT NOT NULL,  -- JSON serializado de UIMessage completo
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Data Flow
```
User types → sendMessage() → /api/chat → streamText() → streaming response →
  onFinish(UIMessage) → POST /api/chats/sendMessage → INSERT INTO messages →
  { success: true }

Page reload → ChatArea mounts →
  GET /api/chats/[id] → { chat, messages[] } → JSON.parse() → initialMessages → useChat
```

### AI SDK Format Preservation
El `UIMessage` serializado contiene:
- `id`: string único generado por AI SDK
- `role`: 'user' | 'assistant' | 'system'
- `parts`: array de `TextUIPart | ToolUIPart | ...`
  - Tool parts incluyen: `toolCallId`, `type` (`tool-{toolName}`), `state`, `input`, `output`

Esto mapea directamente al formato OpenAI:
- `UIMessage.parts[].toolCallId` → OpenAI `tool_call.id` / `tool_call_id`
- `UIMessage.parts[].input` → OpenAI `function.arguments`
- `UIMessage.parts[].output` → OpenAI tool message `content`

## 5. Files to Change

| File | Change | Type |
|---|---|---|
| `src/db/schema.ts` | Reemplazar columnas `toolName`/`toolResult` por `messageData` | Schema |
| `src/lib/db-helpers.ts` | Agregar `getMessagesByChat()`, `saveMessage()` | New functions |
| `src/app/api/chats/[id]/route.ts` | GET: devuelve chat con messages array | Modify/New |
| `src/app/api/chats/sendMessage/route.ts` | POST: persiste mensaje, devuelve confirmación | New file |
| `src/components/ChatArea.tsx` | Agregar `chatId` prop, `initialMessages`, `onFinish` | Refactor |
| `src/components/ChatLayout.tsx` | Pasar `chatId` a `ChatArea` | Refactor |

## 6. Risks & Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `toolCallId` mismatch al recargar | Baja | Alto — conversación rota | Serializar UIMessage completo sin filtrar; validar en test manual |
| `JSON.stringify` pierde propiedades no enumerables | Baja | Medio | UIMessage es POJO, `JSON.stringify` funciona correctamente |
| `onFinish` no se dispara (network error) | Media | Medio — se pierde ese turno | Aceptado para MVP; el usuario ve el error y reenvía |
| Chat muy largo (1000+ mensajes) causa lentitud | Baja | Bajo | SQLite local maneja esto sin problema; optimizar después |
| AI SDK v7 cambia UIMessage structure | Baja | Medio | Migración de datos cuando ocurra; sin versionado por ahora |

## 7. Success Criteria

- [ ] Crear un chat, enviar un mensaje, recargar la página → el historial se preserva
- [ ] Los mensajes con tool calls (cuando se implementen) preservan `toolCallId` y `function.arguments`
- [ ] No hay mensajes duplicados al recargar rápidamente después de enviar
- [ ] `pnpm exec tsc --noEmit` pasa sin errores
- [ ] `pnpm exec @biomejs/biome check --apply .` pasa sin errores

## 8. API Contract

### `GET /api/chats/[id]`
```json
// Response 200
{
  "chat": {
    "id": 1,
    "projectId": 1,
    "title": "Estrategia SEO Q2",
    "createdAt": "2026-06-10T00:00:00Z"
  },
  "messages": [
    {
      "id": "msg_abc123",
      "role": "user",
      "parts": [{ "type": "text", "text": "Audita mi home" }]
    },
    {
      "id": "msg_def456",
      "role": "assistant",
      "parts": [
        { "type": "text", "text": "Ejecutando auditoría..." },
        { "type": "tool-lightouseAudit", "toolCallId": "call_xyz", "state": "output-available", "input": { "domain": "example.com" }, "output": { "score": 89 } }
      ]
    }
  ]
}
```

### `POST /api/chats/sendMessage`
```json
// Request
{ "chatId": 1, "message": { "id": "msg_abc123", "role": "user", "parts": [...] } }

// Response 200
{ "success": true }

// Response 400
{ "success": false, "error": "chatId and message are required" }
```

## 9. Open Questions

- ¿El `id` del UIMessage es generado por el cliente o por el server? (determina la estrategia UPSERT)
- ¿El endpoint `/api/chat` actual debe modificarse para aceptar `chatId` en el body, o lo manejamos solo en el cliente?

---

**Próxima fase:** Spec (especificaciones formales con escenarios)  
**Dependencias:** Ninguna — este cambio es autocontenido
