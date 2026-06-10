# Tasks: Chat Message Persistence (chat-message-persistence)

**Change ID:** `chat-message-persistence`  
**Fase SDD:** Tasks  
**Fecha:** 2026-06-10

---

## Review Workload Forecast

| Métrica | Valor |
|---|---|
| Total estimado de líneas | ~345 |
| Presupuesto de revisión | 1300 |
| Riesgo | **Bajo** — single PR, sin chaining |
| PRs necesarios | 1 |

**Decisión:** Single PR. Sin chaining necesario (345 < 400).

---

## Dependency Graph

```
Task 1 (schema)
  ├── Task 2 (GET /api/chats/[id])
  ├── Task 3 (POST /api/chats/sendMessage)
  └── Task 4 (db-helpers)
        └── Task 5 (ChatArea)
              └── Task 6 (ChatLayout)
                    └── Task 7 (verification)
```

---

## Tasks

### Task 1: Rediseñar schema de messages

**Archivo:** `src/db/schema.ts`  
**Estimado:** ~30 líneas cambiadas  
**Dependencias:** Ninguna

**Descripción:** Reemplazar las columnas `role`, `content`, `toolName`, `toolResult` por `messageData` TEXT. Cambiar PK de auto-increment INTEGER a TEXT (usa el `id` string del AI SDK).

- [ ] Eliminar columnas `role`, `content`, `toolName`, `toolResult` de la definición de `messages`
- [ ] Agregar columna `messageData: text("message_data").notNull()`
- [ ] Cambiar `id` de `integer("id").primaryKey({ autoIncrement: true })` a `text("id").primaryKey()`
- [ ] Mantener `chatId` con FK cascade y `createdAt`

**Verificación:**
```bash
pnpm exec tsc --noEmit  # Solo este archivo debe compilar tras el cambio
```

---

### Task 2: Crear GET /api/chats/[id]

**Archivo:** `src/app/api/chats/[id]/route.ts` (nuevo)  
**Estimado:** ~55 líneas  
**Dependencias:** Task 1

**Descripción:** Endpoint que devuelve los detalles del chat con su array de mensajes embebido.

- [ ] Validar que `id` es un número válido → 400 si no
- [ ] Buscar chat por ID vía `db.query.chats.findFirst`
- [ ] Si no existe → 404 `{ error: "Chat not found" }`
- [ ] Si existe → llamar a `getMessagesByChat(chatId)` (definida en Task 4)
- [ ] Devolver `{ chat: {...}, messages: UIMessage[] }` con status 200
- [ ] Envolver en try/catch → 500 en caso de error

**Verificación:**
```bash
# Test manual: visitar /api/chats/1 con un chat existente
pnpm exec tsc --noEmit
```

---

### Task 3: Crear POST /api/chats/sendMessage

**Archivo:** `src/app/api/chats/sendMessage/route.ts` (nuevo)  
**Estimado:** ~70 líneas  
**Dependencias:** Task 1

**Descripción:** Endpoint que persiste un UIMessage serializado usando UPSERT.

- [ ] Validar body: `chatId` (number) y `message` (UIMessage) requeridos → 400 si faltan
- [ ] Validar que `chatId` existe en DB → 404 si no
- [ ] Validar que `message.id` y `message.role` están presentes
- [ ] Serializar `message` con `JSON.stringify`
- [ ] Insertar con `onConflictDoUpdate` sobre `messages.id`
- [ ] Responder `{ success: true }` (200) o `{ success: false, error: "..." }` (400/404/500)

**Verificación:**
```bash
pnpm exec tsc --noEmit
```

---

### Task 4: Agregar helpers de mensajes a db-helpers

**Archivo:** `src/lib/db-helpers.ts`  
**Estimado:** ~50 líneas  
**Dependencias:** Task 1

**Descripción:** Tres funciones nuevas para operaciones de mensajes.

- [ ] `getChat(chatId: number)` — `db.query.chats.findFirst` con `eq(chats.id, chatId)`
- [ ] `getMessagesByChat(chatId: number): Promise<UIMessage[]>` — SELECT ordenado por `createdAt` ASC, `JSON.parse` de `messageData`, try/catch por fila corrupta
- [ ] `saveMessage(chatId: number, message: UIMessage): Promise<boolean>` — INSERT con `onConflictDoUpdate` sobre `messages.id`

**Verificación:**
```bash
pnpm exec tsc --noEmit
```

---

### Task 5: Refactorizar ChatArea con persistencia

**Archivo:** `src/components/ChatArea.tsx`  
**Estimado:** ~110 líneas  
**Dependencias:** Task 2, Task 3

**Descripción:** Agregar prop `chatId`, carga de historial, y callback de guardado.

- [ ] Agregar `chatId: number` a `ChatAreaProps`
- [ ] Agregar `useState<UIMessage[]>` para `initialMessages`
- [ ] Agregar `useEffect` que llama a `GET /api/chats/${chatId}` al montar
- [ ] Pasar `initialMessages` como estado inicial de `useChat`
- [ ] Pasar `chatId` en `body` del `useChat`
- [ ] Implementar `onFinish` que llama a `POST /api/chats/sendMessage`
- [ ] Agregar estado de carga (`isLoadingHistory`) mientras se cargan initialMessages
- [ ] Renderizar spinner o skeleton mientras carga el historial

**Verificación:**
```bash
pnpm exec tsc --noEmit
pnpm exec @biomejs/biome check --apply src/components/ChatArea.tsx
```

---

### Task 6: Pasar chatId desde ChatLayout

**Archivo:** `src/components/ChatLayout.tsx`  
**Estimado:** ~15 líneas  
**Dependencias:** Task 5

**Descripción:** Pasar la prop `chatId` (ya disponible como `currentChatId`) a `ChatArea`.

- [ ] Agregar `chatId={currentChatId}` al render de `<ChatArea>`
- [ ] Verificar que `ChatAreaProps` acepta `chatId: number`

**Verificación:**
```bash
pnpm exec tsc --noEmit
```

---

### Task 7: Verificación integral

**Archivos:** Todos los anteriores  
**Estimado:** 0 líneas (solo comandos)  
**Dependencias:** Task 1–6

**Descripción:** Typecheck, lint, y smoke test manual.

- [ ] `pnpm exec tsc --noEmit` — debe pasar sin errores
- [ ] `pnpm exec @biomejs/biome check --apply .` — debe pasar sin errores
- [ ] Smoke test manual:
  1. `pnpm dev`
  2. Navegar a un chat existente
  3. Enviar mensaje "Hola, ¿cómo estás?"
  4. Verificar que el asistente responde con streaming
  5. Verificar en Network tab que `POST /api/chats/sendMessage` devuelve 200
  6. Recargar la página (F5)
  7. Verificar que "Hola, ¿cómo estás?" y la respuesta del asistente aparecen en el historial
  8. Enviar otro mensaje y verificar que se agrega al historial existente

---

## Resumen

| Task | Archivo | Líneas | Tipo |
|---|---|---|---|
| 1 | `src/db/schema.ts` | ~30 | Modificar |
| 2 | `src/app/api/chats/[id]/route.ts` | ~55 | Nuevo |
| 3 | `src/app/api/chats/sendMessage/route.ts` | ~70 | Nuevo |
| 4 | `src/lib/db-helpers.ts` | ~50 | Modificar |
| 5 | `src/components/ChatArea.tsx` | ~110 | Modificar |
| 6 | `src/components/ChatLayout.tsx` | ~15 | Modificar |
| 7 | Verificación | 0 | Comandos |
| **Total** | | **~330** | |

---

**Próxima fase:** Apply (implementación)  
**Riesgo de revisión:** Bajo (330 líneas, single PR)
