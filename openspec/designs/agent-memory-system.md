# Design: agent-memory-system

## Overview

```
User message
    │
    ▼
createOrchestratorAgent(projectId)  ←── projectId injected via closure
    │
    ├─── save_memory ──→ createSaveMemoryTool(projectId)
    │                         │
    │                         ├── validateMemoryContent(content)
    │                         └── insertMemory(projectId, data) ──→ db.insert(memories)
    │                                                                       │
    │                                                               FTS5 trigger fires
    │                                                               (memories_ai)
    │
    └─── search_memory ─→ createSearchMemoryTool(projectId)
                               │
                               └── searchMemoriesFTS(projectId, query) ──→ sqlite.prepare(FTS5 MATCH)
```

The `sqlite` (better-sqlite3 `Database`) instance is exported alongside `db` (Drizzle) for raw FTS5 queries. All other DB operations stay on Drizzle.

---

## Component Design

### 1. Database Schema (`src/db/schema.ts`)

```typescript
export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  topic: text("topic", {
    enum: ["seo-strategy", "technical-audit", "content-plan", "project-decision", "user-preference"],
  }).notNull(),
  scope: text("scope", { enum: ["project", "personal"] }).notNull().default("project"),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Decisions**:
- No `updatedAt` — proposal marks editing out-of-scope; triggers handle FTS5 sync on update anyway.
- `content` is `text` (Markdown string), not JSON — consistent with how `messageData` is handled.
- `topic` and `scope` use Drizzle's inline `enum` on `text()` — same pattern as the rest of the schema.

---

### 2. FTS5 Virtual Table (`src/db/index.ts`)

Export `sqlite` so helpers can issue raw FTS5 queries:

```typescript
export const sqlite = new Database("sqlite.db");
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
    USING fts5(title, content, content='memories', content_rowid='id');

  CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, title, content)
      VALUES (new.id, new.title, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, title, content)
      VALUES('delete', old.id, old.title, old.content);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, title, content)
      VALUES('delete', old.id, old.title, old.content);
    INSERT INTO memories_fts(rowid, title, content)
      VALUES (new.id, new.title, new.content);
  END;
`);

export const db = drizzle(sqlite, { schema });
```

`IF NOT EXISTS` makes the setup idempotent — safe to run on every cold start.

---

### 3. Memory Template (`src/agents/memory-template.ts`)

New file. Defines the required Markdown structure and a validation function.

```typescript
export const MEMORY_TEMPLATE = `## Contexto / Objetivo
[Describe el contexto o el objetivo de esta memoria]

## Datos Clave / Hallazgos
[Lista los datos, métricas o hallazgos relevantes]

## Decisión / Acción
[Describe la decisión tomada o la acción ejecutada]

## Siguientes Pasos
[Lista los próximos pasos o tareas pendientes]`;

const REQUIRED_SECTIONS = [
  "## Contexto / Objetivo",
  "## Datos Clave / Hallazgos",
  "## Decisión / Acción",
  "## Siguientes Pasos",
] as const;

export function validateMemoryContent(content: string): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_SECTIONS.filter((section) => !content.includes(section));
  return { valid: missing.length === 0, missing };
}
```

**Exported**: `MEMORY_TEMPLATE` (string), `validateMemoryContent` (function).

---

### 4. saveMemoryTool (`src/agents/tools.ts`)

Request-scoped factory — mirrors `createGetProjectOverviewTool(projectId)`:

```typescript
function createSaveMemoryTool(projectId: number) {
  return tool({
    description:
      "Persists a structured memory for the current project. Content must follow MEMORY_TEMPLATE with all four required sections.",
    inputSchema: z.object({
      title: z.string().min(3).max(150).describe("Short, searchable title for the memory"),
      topic: z
        .enum(["seo-strategy", "technical-audit", "content-plan", "project-decision", "user-preference"])
        .describe("Memory topic category"),
      scope: z.enum(["project", "personal"]).default("project"),
      content: z.string().min(50).max(5000).describe("Markdown content following MEMORY_TEMPLATE"),
    }),
    execute: async ({ title, topic, scope, content }) => {
      const { valid, missing } = validateMemoryContent(content);
      if (!valid) {
        return `Error: Missing required sections: ${missing.join(", ")}. Use MEMORY_TEMPLATE as guide.`;
      }
      const id = await insertMemory({ projectId, title, topic, scope, content });
      return `Memory saved (id=${id}): "${title}"`;
    },
  });
}
```

**Error contract**: returns a string with `Error:` prefix on validation failure — same pattern as `loadSkillTool`.

---

### 5. searchMemoryTool (`src/agents/tools.ts`)

```typescript
function createSearchMemoryTool(projectId: number) {
  return tool({
    description:
      "Searches project memories by full-text query. Returns ranked results from title and content.",
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe("Search query string"),
      limit: z.number().int().min(1).max(20).default(5),
    }),
    execute: async ({ query, limit }) => {
      const results = searchMemoriesFTS(projectId, query, limit);
      if (results.length === 0) return "No memories found for that query.";
      return JSON.stringify(results);
    },
  });
}
```

`searchMemoriesFTS` is synchronous (better-sqlite3 `.all()`) — no `await` needed.

---

### 6. DB Helpers (`src/lib/db-helpers.ts`)

Two additions to the existing file:

```typescript
// insertMemory — async, uses Drizzle
export async function insertMemory(data: {
  projectId: number;
  title: string;
  topic: "seo-strategy" | "technical-audit" | "content-plan" | "project-decision" | "user-preference";
  scope: "project" | "personal";
  content: string;
}): Promise<number> {
  const result = await db
    .insert(memories)
    .values({ ...data, createdAt: new Date() })
    .returning({ id: memories.id });
  return result[0].id;
}

// searchMemoriesFTS — synchronous, raw SQL on sqlite instance
export function searchMemoriesFTS(
  projectId: number,
  query: string,
  limit = 5,
): { id: number; title: string; topic: string; scope: string; snippet: string; rank: number }[] {
  const sanitized = query.replace(/["]/g, '""');
  const stmt = sqlite.prepare(`
    SELECT m.id, m.title, m.topic, m.scope,
           snippet(memories_fts, 1, '<b>', '</b>', '...', 8) AS snippet,
           memories_fts.rank
    FROM memories_fts
    JOIN memories m ON memories_fts.rowid = m.id
    WHERE memories_fts MATCH ?
      AND m.project_id = ?
    ORDER BY memories_fts.rank
    LIMIT ?
  `);
  return stmt.all(`"${sanitized}"`, projectId, limit) as ReturnType<typeof searchMemoriesFTS>;
}
```

**Notes**:
- `insertMemory` uses `db.insert().returning()` — the `.returning()` API is available in Drizzle + SQLite.
- FTS5 `rank` is ascending (lower = more relevant); `ORDER BY rank` returns best matches first.
- Query is double-quote wrapped after escaping inner `"` — this forces FTS5 phrase search and prevents operator injection.
- `snippet()` covers column index 1 (`content`); title is short enough to return in full.

---

### 7. Orchestrator Prompt Update (`src/agents/prompts/orchestrator.ts`)

Append a new section **after** the existing delegation rules:

```
# Memoria de Proyecto

Tienes acceso a herramientas de memoria persistente para este proyecto.

CUÁNDO GUARDAR (`save_memory`):
- Después de ejecutar una estrategia SEO o keyword research.
- Cuando el usuario confirme una decisión importante.
- Cuando descubras información relevante sobre el proyecto.
- Usa topic="project-decision" para decisiones de negocio.
- Usa topic="seo-strategy" para estrategias de keywords.
- Usa topic="technical-audit" para hallazgos técnicos.
- Usa topic="content-plan" para planes de contenido.
- Usa topic="user-preference" para preferencias del usuario.

CUÁNDO BUSCAR (`search_memory`):
- Al inicio de una nueva tarea, para verificar si ya existe contexto previo.
- Cuando el usuario pregunte por algo que pudo haberse discutido antes.
- Antes de delegar a un sub-agente, para enriquecer el contexto con decisiones pasadas.
```

---

### 8. Tool Registration

In `createOrchestratorAgent(projectId)`, add the two new tools:

```typescript
export function createOrchestratorAgent(projectId: number) {
  return new ToolLoopAgent({
    model: openai("gpt-4o-mini"),
    instructions: ORCHESTRATOR_PROMPT,
    tools: {
      load_skill: loadSkillTool,
      delegate_to_subagent: delegateToSubagentTool,
      get_project_overview: createGetProjectOverviewTool(projectId),
      set_project_overview: createSetProjectOverviewTool(projectId),
      save_memory: createSaveMemoryTool(projectId),
      search_memory: createSearchMemoryTool(projectId),
    },
  });
}
```

---

## Data Flow

### Save Memory Flow

```
Orchestrator decides to save
    │
    ▼
save_memory({ title, topic, scope, content })
    │
    ├── validateMemoryContent(content)
    │       ├── FAIL → return "Error: Missing sections: ..."
    │       └── PASS ↓
    │
    ├── insertMemory({ projectId, title, topic, scope, content })
    │       └── db.insert(memories).values(...).returning({ id })
    │                   │
    │                   └── SQLite fires memories_ai trigger
    │                           └── INSERT INTO memories_fts(rowid, title, content)
    │
    └── return `Memory saved (id=N): "title"`
```

### Search Memory Flow

```
Orchestrator needs prior context
    │
    ▼
search_memory({ query, limit })
    │
    ├── sanitize: query.replace(/["]/g, '""')
    │
    ├── searchMemoriesFTS(projectId, sanitizedQuery, limit)
    │       └── sqlite.prepare(FTS5 MATCH + project_id filter + rank ORDER)
    │               └── returns [{ id, title, topic, scope, snippet, rank }]
    │
    ├── results.length === 0 → return "No memories found."
    │
    └── return JSON.stringify(results)
```

---

## Migration Strategy

1. **Drizzle migration** — `pnpm exec drizzle-kit generate` creates the SQL migration for the `memories` table.
2. **FTS5 setup** — runs in `src/db/index.ts` via `sqlite.exec(...)` on every cold start. `IF NOT EXISTS` guards make it idempotent — no migration file needed for virtual tables or triggers.
3. **Order** — Drizzle migration runs first (via `drizzle-kit migrate` or `push`), then the app starts and `src/db/index.ts` sets up FTS5 on the already-existing `memories` table.

---

## Error Handling

| Scenario | Where caught | Response |
|---|---|---|
| Missing Markdown sections | `validateMemoryContent` in `execute` | `"Error: Missing required sections: ..."` |
| FTS5 MATCH syntax error (e.g. stray `"`) | double-quote wrapping + escape in `searchMemoriesFTS` | prevented at construction |
| DB write failure (FK violation, etc.) | `insertMemory` throws → propagates to tool `execute` | unhandled → AI SDK returns error to orchestrator |
| Empty FTS5 results | `createSearchMemoryTool` execute | `"No memories found for that query."` |
| Project not found (FK) | SQLite enforces FK constraint | insert throws; propagates up |

---

## Testing Strategy

Manual testing steps (no automated tests in MVP):

1. Start the app; verify `memories` table and `memories_fts` virtual table exist in `sqlite.db`.
2. Chat with orchestrator: ask it to save a memory with the correct 4-section Markdown → verify row in `memories` table and row in `memories_fts`.
3. Ask it to save a memory with missing sections → verify it returns the `Error:` message.
4. Ask it to search for a keyword that exists in a saved memory → verify ranked results.
5. Delete a project via UI → verify all its memories are cascade-deleted.
6. Run `pnpm exec tsc --noEmit` — zero type errors.
7. Run `pnpm exec @biomejs/biome check --apply .` — zero lint errors.

---

## TypeScript Types

```typescript
// Drizzle inferred types (from schema.ts)
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

// Topic and Scope literals (usable in tool schemas and helpers)
export type MemoryTopic =
  | "seo-strategy"
  | "technical-audit"
  | "content-plan"
  | "project-decision"
  | "user-preference";

export type MemoryScope = "project" | "personal";

// FTS5 search result row
export interface MemorySearchResult {
  id: number;
  title: string;
  topic: MemoryTopic;
  scope: MemoryScope;
  snippet: string;
  rank: number;
}
```

`Memory` and `NewMemory` are inferred by Drizzle — no manual interface needed. `MemoryTopic` and `MemoryScope` are derived from the same string literals used in the schema enum, keeping a single source of truth.
