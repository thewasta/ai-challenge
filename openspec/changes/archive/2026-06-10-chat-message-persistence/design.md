# Technical Design: Chat Message Persistence (Next.js 16)

**Document Version:** 2.0 (Next.js 16.2.7)  
**Status:** Ready for Implementation  
**Last Updated:** 2026-06-10

---

## 1. Overview

This design implements persistent message storage for chat conversations by:
1. Migrating the `messages` table schema to use a JSON `messageData` column
2. Adding two API routes: `GET /api/chats/[id]` and `POST /api/chats/sendMessage`
3. Updating `ChatArea` component to load persisted messages and trigger saves on completion
4. Implementing UPSERT logic to deduplicate messages by `id`

**Key Constraint:** Uses Next.js 16 patterns (`params: Promise<...>`), not Next.js 15.

---

## 2. Data Flow

```
User Input → ChatArea (useChat)
    ↓
/api/chat (streaming response)
    ↓
onFinish callback triggered
    ↓
POST /api/chats/sendMessage (persist entire UIMessage)
    ↓
Database (UPSERT by message.id)
    ↓
GET /api/chats/[id] (load history on page refresh)
    ↓
ChatArea (render initialMessages)
```

---

## 3. Schema Design

### 3.1 Messages Table Migration

**Current Schema (to be replaced):**
```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] })
    .notNull()
    .default("user"),
  content: text("content").notNull().default(""),
  toolName: text("tool_name"),
  toolResult: text("tool_result"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**New Schema:**
```typescript
export const messages = sqliteTable("messages", {
  // AI SDK message ID (client-side unique identifier for deduplication)
  messageId: text("message_id").primaryKey(),
  
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  
  // Complete UIMessage as JSON (includes role, content, toolInvocations[], etc.)
  messageData: text("message_data", { mode: "json" }).notNull(),
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Rationale:**
- `messageId` (text PK): Matches AI SDK's internal message ID, enables deduplication
- `messageData` (JSON): Single column captures complete `UIMessage` structure
  - Includes: `{ id, role, content, toolInvocations?, experimental_attachments?, createdAt? }`
  - Eliminates fragmentation across `content`, `toolName`, `toolResult`
  - Tool failures stored natively in `toolInvocations[].result` (AI SDK default)
- `chatId`: Maintains relationship to chats table
- `createdAt`: Server timestamp for sorting and audit

---

## 4. API Routes

### 4.1 GET `/api/chats/[id]`

**Route File:** `src/app/api/chats/[id]/route.ts`

**Purpose:** Retrieve chat details and its complete message history

**Function Signature:**
```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ChatDetailsResponse | ErrorResponse>>
```

**Implementation:**
```typescript
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, messages } from "@/db/schema";
import type { UIMessage } from "ai";

export interface ChatDetailsResponse {
  chat: {
    id: number;
    projectId: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  };
  messages: UIMessage[];
}

export interface ErrorResponse {
  error: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatId = Number(id);

    if (isNaN(chatId)) {
      return NextResponse.json(
        { error: "Chat ID must be a valid number" },
        { status: 400 }
      );
    }

    // Fetch chat metadata
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat no encontrado" },
        { status: 404 }
      );
    }

    // Fetch all messages for this chat, ordered by creation
    const messageRows = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    // Parse messageData JSON into UIMessage objects
    const parsedMessages: UIMessage[] = messageRows.map((row) => {
      const data = typeof row.messageData === "string"
        ? JSON.parse(row.messageData)
        : row.messageData;
      return data as UIMessage;
    });

    return NextResponse.json<ChatDetailsResponse>({
      chat,
      messages: parsedMessages,
    });
  } catch (error) {
    console.error("[GET /api/chats/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Response Contract:**
```typescript
// Success (200)
{
  chat: {
    id: 1,
    projectId: 5,
    title: "Chat #1",
    createdAt: "2026-06-10T10:00:00Z",
    updatedAt: "2026-06-10T10:15:00Z"
  },
  messages: [
    {
      id: "msg_abc123",
      role: "user",
      content: "¿Cómo optimizo mis keywords?"
    },
    {
      id: "msg_def456",
      role: "assistant",
      content: "Aquí está mi análisis...",
      toolInvocations: [
        {
          id: "tool_1",
          toolName: "mockLighthouseAudit",
          state: "result",
          result: { ... }
        }
      ]
    }
  ]
}

// Error (400, 404, 500)
{
  error: "Chat no encontrado"
}
```

---

### 4.2 POST `/api/chats/sendMessage`

**Route File:** `src/app/api/chats/sendMessage/route.ts`

**Purpose:** Persist a completed message to the database using UPSERT logic

**Function Signature:**
```typescript
export async function POST(
  req: Request
): Promise<NextResponse<SendMessageResponse | ErrorResponse>>
```

**Implementation:**
```typescript
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import type { UIMessage } from "ai";

export interface SendMessageRequest {
  chatId: number;
  message: UIMessage;
}

export interface SendMessageResponse {
  success: true;
  messageId: string;
}

export interface ErrorResponse {
  error: string;
}

export async function POST(req: Request) {
  try {
    const body: SendMessageRequest = await req.json();
    const { chatId, message } = body;

    // Validation
    if (!chatId || typeof chatId !== "number") {
      return NextResponse.json(
        { error: "chatId is required and must be a number" },
        { status: 400 }
      );
    }

    if (!message || !message.id || !message.role) {
      return NextResponse.json(
        { error: "message must have id and role" },
        { status: 400 }
      );
    }

    // UPSERT: Insert or replace if messageId already exists
    await db
      .insert(messages)
      .values({
        messageId: message.id,
        chatId,
        messageData: JSON.stringify(message),
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: messages.messageId,
        set: {
          messageData: JSON.stringify(message),
        },
      });

    return NextResponse.json<SendMessageResponse>(
      {
        success: true,
        messageId: message.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/chats/sendMessage] Error:", error);
    return NextResponse.json(
      { error: "Failed to persist message" },
      { status: 500 }
    );
  }
}
```

**Request Contract:**
```typescript
{
  chatId: 1,
  message: {
    id: "msg_abc123",
    role: "user",
    content: "¿Cómo optimizo mis keywords?",
    createdAt: "2026-06-10T10:00:00Z"
  }
}
```

**Response Contract:**
```typescript
// Success (201)
{
  success: true,
  messageId: "msg_abc123"
}

// Error (400, 500)
{
  error: "Failed to persist message"
}
```

---

## 5. Component Updates

### 5.1 ChatLayout (No Changes Required)

The `ChatLayout` component remains unchanged. It passes `currentChatId` to `ChatArea`, which now uses it to load persisted messages.

---

### 5.2 Updated ChatArea Component

**File:** `src/components/ChatArea.tsx`

**Changes:**
1. Accept `chatId` and `initialMessages` props
2. Fetch persisted messages on mount via `useEffect`
3. Call `POST /api/chats/sendMessage` on stream completion (`onFinish`)
4. Handle loading and error states

**Implementation:**
```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

interface ChatAreaProps {
  chatId: number;
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { messages, status, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: async (message) => {
      // Persist completed message to database
      try {
        const response = await fetch("/api/chats/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            message,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("Failed to persist message:", data.error);
        }
      } catch (err) {
        console.error("Error persisting message:", err);
      }
    },
  });

  // Load persisted messages on mount
  useEffect(() => {
    async function loadChatHistory() {
      try {
        setIsLoadingHistory(true);
        const response = await fetch(`/api/chats/${chatId}`);

        if (!response.ok) {
          throw new Error("Failed to load chat history");
        }

        const data = await response.json();
        const persistedMessages: UIMessage[] = data.messages;

        // Hydrate useChat with persisted messages
        setMessages(persistedMessages);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error loading chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadChatHistory();
  }, [chatId, setMessages]);

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] items-center justify-center">
        <MessageSquare className="size-12 mb-4 stroke-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MessageSquare className="size-16 mb-4 stroke-1" />
              <p className="text-lg font-medium">Escribe tu primer mensaje</p>
              <p className="text-sm mt-1">para comenzar la consultoría de SEO</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          disabled={status !== "ready"}
          status={status}
        />
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
```

**Type Definitions:**
```typescript
interface ChatAreaProps {
  chatId: number; // Required: passed from ChatLayout
}

interface SendMessageRequest {
  chatId: number;
  message: UIMessage;
}

interface SendMessageResponse {
  success: true;
  messageId: string;
}
```

---

### 5.3 ChatLayout Update (Pass chatId to ChatArea)

**File:** `src/components/ChatLayout.tsx`

**Changes:**
1. Pass `currentChatId` to `ChatArea` component

**Implementation:**
```typescript
"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { ProjectWithChats } from "@/lib/db-helpers";
import { AppSidebar } from "./AppSidebar";
import { ChatArea } from "./ChatArea";

interface ChatLayoutProps {
  projects: ProjectWithChats[];
  currentProjectId: number;
  currentChatId: number;
  projectName: string;
}

export function ChatLayout({
  projects,
  currentProjectId,
  currentChatId,
  projectName,
}: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        currentChatId={currentChatId}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground truncate">
            {projectName}
          </span>
        </header>
        <ChatArea chatId={currentChatId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## 6. DB Helpers

### 6.1 New Helper: `getChat()`

**File:** `src/lib/db-helpers.ts`

**Addition:**
```typescript
import type { UIMessage } from "ai";

/**
 * Obtiene un chat con todos sus mensajes persistidos.
 * Convierte messageData JSON en UIMessage objects.
 */
export async function getChat(chatId: number) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) return null;

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt);

  const parsedMessages: UIMessage[] = messageRows.map((row) => {
    const data = typeof row.messageData === "string"
      ? JSON.parse(row.messageData)
      : row.messageData;
    return data as UIMessage;
  });

  return {
    ...chat,
    messages: parsedMessages,
  };
}
```

---

## 7. Error Handling Strategy

### 7.1 API Error Handling

**GET /api/chats/[id]:**
- `400`: Invalid chat ID (non-numeric)
- `404`: Chat not found (wrong ID or deleted)
- `500`: Database error

**POST /api/chats/sendMessage:**
- `400`: Invalid request shape (missing chatId, message.id, message.role)
- `500`: Database UPSERT failure

### 7.2 Client-Side Error Handling

**ChatArea:**
- Show loading state while fetching history
- Display error message if fetch fails
- Log to console for debugging
- Do not block message input if persistence fails (fire-and-forget)

**Message Persistence:**
- Do not block AI streaming if POST fails
- Log error to console
- Optionally show transient toast notification

---

## 8. UPSERT Implementation

### 8.1 Strategy

**Primary Key:** `messageId` (text)

**Conflict Resolution:** `onConflictDoUpdate`
- If message with same `id` already exists, update `messageData` only
- Preserves `createdAt` (server timestamp remains original)
- Useful if client retries or reconnects during streaming

**Drizzle Syntax:**
```typescript
await db
  .insert(messages)
  .values({
    messageId: message.id,
    chatId,
    messageData: JSON.stringify(message),
    createdAt: new Date(),
  })
  .onConflictDoUpdate({
    target: messages.messageId,
    set: {
      messageData: JSON.stringify(message),
    },
  });
```

### 8.2 Why UPSERT?

1. **Stream Reconnection:** If client reconnects, onFinish fires again for same message
2. **Idempotency:** Multiple POSTs with same message.id produce single DB record
3. **No Transaction Required:** Drizzle handles atomicity
4. **No Pre-Check Needed:** No SELECT before INSERT

---

## 9. Type Safety

### 9.1 AI SDK Types

```typescript
import type { UIMessage } from "ai";

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolInvocations?: Array<{
    id: string;
    toolName: string;
    args?: Record<string, unknown>;
    state?: "call" | "result" | "error";
    result?: unknown;
  }>;
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url?: string;
    data?: string | Uint8Array;
  }>;
  createdAt?: Date;
}
```

### 9.2 API Request/Response Types

```typescript
// GET /api/chats/[id]
interface ChatDetailsResponse {
  chat: {
    id: number;
    projectId: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  };
  messages: UIMessage[];
}

// POST /api/chats/sendMessage
interface SendMessageRequest {
  chatId: number;
  message: UIMessage;
}

interface SendMessageResponse {
  success: true;
  messageId: string;
}

interface ErrorResponse {
  error: string;
}
```

### 9.3 Component Props

```typescript
interface ChatAreaProps {
  chatId: number;
}

interface ChatLayoutProps {
  projects: ProjectWithChats[];
  currentProjectId: number;
  currentChatId: number;
  projectName: string;
}
```

---

## 10. File Structure & Changes Summary

### New Files
```
src/app/api/chats/
├── [id]/
│   └── route.ts          (GET: fetch chat + messages)
└── sendMessage/
    └── route.ts          (POST: persist message via UPSERT)
```

### Modified Files
```
src/db/schema.ts          (messages table: replace toolName/toolResult with messageData)
src/components/ChatArea.tsx (add chatId prop, load history, call sendMessage on finish)
src/components/ChatLayout.tsx (pass currentChatId to ChatArea)
src/lib/db-helpers.ts     (add getChat helper, export types)
```

### Unchanged Files
```
src/app/api/chat/route.ts (streaming endpoint, no changes)
src/app/api/projects/[id]/chats/route.ts (creation endpoint, no changes)
src/app/projects/[id]/chats/[chatId]/page.tsx (layout page, no changes)
```

---

## 11. Migration Path

### Step 1: Schema Migration
Run Drizzle migration to replace `messages` table structure.

### Step 2: API Route Implementation
Create `GET /api/chats/[id]` and `POST /api/chats/sendMessage`.

### Step 3: Component Updates
Update `ChatArea` and `ChatLayout` components to use new persistence API.

### Step 4: DB Helper
Add `getChat()` helper for potential future use (optional at MVP).

### Step 5: Testing & Verification
- Verify typecheck passes
- Verify linting passes (biome)
- Test message persistence flow end-to-end
- Test message history loading on page refresh

---

## 12. Design Decisions Rationale

| Decision | Rationale |
|----------|-----------|
| **JSON `messageData` column** | Captures full AI SDK message structure; eliminates fragmentation |
| **UPSERT on `messageId`** | Deduplicates if client reconnects; idempotent; no pre-check needed |
| **Save on `onFinish` only** | Avoids partial/incomplete message saves; cleaner stream handling |
| **Load all history** | MVP requirement; scales to ~1000 messages; no pagination needed yet |
| **Fire-and-forget persistence** | Non-blocking; UI remains responsive even if save fails |
| **Primary key: `messageId` (text)** | AI SDK uses string IDs; enables deduplication; supports distributed systems |
| **GET before rendering** | Ensures UI always shows persisted state; fresh on page reload |
| **No schema versioning** | MVP constraint; versioning added if schema becomes unstable |

---

## 13. Next.js 16 Pattern Compliance

### Route Handlers
✅ Use `async function` with `{ params }: { params: Promise<...> }`
✅ Await params before destructuring
✅ Return `NextResponse.json()`
✅ No deprecated `getServerSideProps` or `getStaticProps`

### Client Components
✅ Use `"use client"` directive
✅ Use hooks: `useChat`, `useEffect`, `useState`
✅ Fetch API calls in `useEffect`

### Type Imports
✅ Use `type` keyword for type-only imports: `import type { UIMessage } from "ai"`

---

## 14. Verification Checklist

- [ ] Schema migration runs without errors
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Biome linting passes (`pnpm lint`)
- [ ] GET /api/chats/[id] returns correct contract
- [ ] POST /api/chats/sendMessage persists messages with UPSERT
- [ ] ChatArea loads history on mount
- [ ] ChatArea persists on onFinish callback
- [ ] Messages appear immediately in UI
- [ ] Page refresh loads persisted messages
- [ ] Tool invocations with results persist correctly
- [ ] Error handling works (missing chatId, invalid message)
- [ ] No TypeScript errors (`strict: true`)

---

## 15. Testing Strategy

### Unit Tests (Optional for MVP)
- Verify UPSERT deduplication (insert same message twice, expect 1 record)
- Verify GET returns messages in correct order

### Integration Tests (Recommended)
1. Create chat via POST `/api/projects/[id]/chats`
2. Send message via `/api/chat` (stream)
3. Verify onFinish fires, calls POST `/api/chats/sendMessage`
4. Verify GET `/api/chats/[id]` returns persisted message
5. Refresh page, verify history loads
6. Verify tool results persist in `messageData`

### Manual Smoke Test
1. Navigate to chat page
2. Send message "Test message"
3. Verify response streams
4. Check Network tab: POST `/api/chats/sendMessage` succeeds (201)
5. Refresh page
6. Verify "Test message" appears in history
7. Send another message
8. Verify both messages persist after refresh

---

## 16. Open Questions & Assumptions

### Assumptions
1. **UI Message Structure:** Assumes `UIMessage` from `ai@6.0.198` has `id`, `role`, `content` at minimum
2. **Tool Failures:** Assumes failures stored natively in `toolInvocations[].result` (no separate error field needed)
3. **Message IDs:** Assumes AI SDK generates unique `message.id` for each message
4. **Single Workspce:** No multi-tenant concerns; `chatId` sufficient for scoping
5. **No Offline:** No offline-first sync; assumes network always available

### Future Enhancements
1. **Pagination:** If messages exceed 1000, implement cursor-based pagination
2. **Search:** Add full-text search index on `messageData`
3. **Analytics:** Track message counts, tool usage per chat
4. **Archival:** Implement soft-delete for messages (add `deletedAt` column)
5. **Versioning:** Add `schemaVersion` if API changes significantly

---

## 17. Dependencies & Imports

### Required Imports (Existing)
- `drizzle-orm`: `eq`, `sql`, `desc`
- `next/server`: `NextResponse`
- `@ai-sdk/react`: `useChat`
- `ai`: `UIMessage`, `DefaultChatTransport`
- `next/navigation`: `notFound`
- React: `useEffect`, `useState`

### No New External Dependencies
This design uses only existing packages in `package.json`.

---

## Conclusion

This design provides a complete, Next.js 16–compliant implementation of message persistence that:
- ✅ Replaces fragmented `toolName`/`toolResult` with unified `messageData`
- ✅ Enables message deduplication via UPSERT on `messageId`
- ✅ Loads history on page load and persists on completion
- ✅ Maintains type safety throughout (no `any`)
- ✅ Follows existing codebase patterns exactly
- ✅ Requires no new dependencies

Implementation can begin immediately after this design is approved.
