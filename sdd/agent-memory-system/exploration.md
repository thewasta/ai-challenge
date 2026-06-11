# Exploration Report: agent-memory-system

## 1. Drizzle + FTS5 Feasibility

### Summary
**✓ FULLY FEASIBLE** — FTS5 is natively supported by better-sqlite3 and can be integrated with Drizzle.

### Technical Details

#### better-sqlite3 FTS5 Support
- **Version**: ^12.10.0 (installed)
- **FTS5 Status**: ✓ **ENABLED** — `ENABLE_FTS5` compile option confirmed via `PRAGMA compile_options`
- **Verification**: Successfully created virtual table with `CREATE VIRTUAL TABLE ... USING fts5()`
- **Native Support**: No third-party dependencies needed

#### Drizzle-ORM Integration
- **Version**: ^0.45.2 (installed)
- **FTS5 Native Support**: Drizzle does NOT provide native FTS5 table helpers — no `fts5Table()` API
- **Solution Pattern**: Use **raw SQL via `db.run()` with better-sqlite3**
  - FTS5 virtual tables must be created outside Drizzle's schema management
  - Once created, FTS5 tables can be queried via raw SQL using `db.prepare().all()`
  - Drizzle cannot automatically type FTS5 queries, but this is acceptable for a specific use case

#### Migration Approach
- **Current State**: No `drizzle/` directory with migration files exists yet
- **First Run**: `pnpm drizzle-kit push` will generate the first migration
- **FTS5 Migration Strategy**:
  1. After Drizzle creates the `memories` table, manually add a migration file that:
     - Creates the FTS5 virtual table linked to `memories`
     - Adds triggers to keep the FTS5 index in sync with INSERT/UPDATE/DELETE
  2. Or use raw SQL directly in the DB initialization (`src/db/index.ts`)

#### Recommended FTS5 Schema Pattern
```sql
-- Main table (Drizzle-managed)
CREATE TABLE memories (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  scope TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- FTS5 virtual table (raw SQL)
CREATE VIRTUAL TABLE memories_fts USING fts5(
  title,
  content,
  content=memories,
  content_rowid=id
);

-- Keep FTS5 in sync (on INSERT)
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- Keep FTS5 in sync (on UPDATE)
CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content) 
  VALUES('delete', old.id, old.title, old.content);
  INSERT INTO memories_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- Keep FTS5 in sync (on DELETE)
CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, title, content) 
  VALUES('delete', old.id, old.title, old.content);
END;
```

**Rationale**: Use Drizzle for the main table schema (benefits from type safety and migrations), use raw SQL for FTS5 virtual table and triggers (FTS5 is outside Drizzle's scope).

---

## 2. Tool Registration Pattern

### Current Tool Architecture
- **Location**: `src/agents/tools.ts`
- **Pattern**: Factory functions that return `tool()` instances scoped to request-level parameters
- **Registration**: Tools are collected in a `tools` object inside `createOrchestratorAgent(projectId)`

### Exact Tool Pattern (from existing code)

```typescript
// ── Singleton Tools (no parameters) ──
export const loadSkillTool = tool({
  description: "...",
  inputSchema: z.object({
    skillName: z.string().describe("..."),
  }),
  execute: async ({ skillName }) => {
    // Tool logic
    return result;
  },
});

// ── Request-Scoped Tools (factory pattern) ──
function createGetProjectOverviewTool(projectId: number) {
  return tool({
    description: "...",
    inputSchema: z.object({}),  // or z.object({ field: z.string() })
    execute: async (input) => {
      // Use projectId captured from closure
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      return JSON.stringify(project);
    },
  });
}

// ── Registration in createOrchestratorAgent() ──
export function createOrchestratorAgent(projectId: number) {
  return new ToolLoopAgent({
    model: openai("gpt-4o-mini"),
    instructions: ORCHESTRATOR_PROMPT,
    tools: {
      load_skill: loadSkillTool,                                    // Singleton
      get_project_overview: createGetProjectOverviewTool(projectId), // Request-scoped
    },
  });
}
```

### Key Imports Required
```typescript
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { eq } from "drizzle-orm";
```

### Database Access from Tools
- **Pattern**: Use `db.query.<table>.findFirst()` (read) or `db.update().set().where()` (write)
- **Example Read**: 
  ```typescript
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  ```
- **Example Write**: 
  ```typescript
  await db.update(projects).set(updateData).where(eq(projects.id, projectId));
  ```
- **Error Handling**: Return string descriptions or JSON strings (AI SDK tools return serialized data)
- **Return Type**: All tool `execute()` functions return strings or JSON strings (not objects)

### New Tools for Memory System

For `saveMemory` and `searchMemory`, the pattern would be:

```typescript
// Singleton tools (memory operations are not project-scoped)
export const saveMemoryTool = tool({
  description: "Saves a structured memory to the database.",
  inputSchema: z.object({
    title: z.string().min(1),
    topic: z.enum(["architecture", "decision", "bugfix", "discovery", "pattern"]),
    scope: z.enum(["project", "personal"]),
    content: z.string(),
  }),
  execute: async (input) => {
    // Insert into memories table
    // Return confirmation
  },
});

export const searchMemoryTool = tool({
  description: "Searches memories by keywords using full-text search.",
  inputSchema: z.object({
    query: z.string().min(1),
    limit: z.number().int().positive().default(10),
  }),
  execute: async (input) => {
    // Query memories_fts using raw SQL
    // Return array of matches
  },
});
```

---

## 3. Skills System

### Structure
- **Location**: `src/skills/index.ts` (registry) and `src/skills/*.ts` (individual skill files)
- **Pattern**: Each skill is a plain TypeScript constant string exported from its module
- **Registry**: `SKILLS` array contains `{ name: string, content: string }` objects

```typescript
// src/skills/index.ts
export interface Skill {
  name: string;
  content: string;
}

export const SKILLS: Skill[] = [
  { name: "copywriting", content: COPYWRITING_SKILL },
  { name: "product_setup", content: PRODUCT_SETUP_SKILL },
] as const;

export type SkillNames = (typeof SKILLS)[number]["name"];
```

### Skill Files
- **Location**: `src/skills/<skill_name>.ts`
- **Format**: Export a named constant (e.g., `export const PRODUCT_SETUP_SKILL = \`....\``)
- **Content**: Multi-line template strings containing instructions
- **Example**: `src/skills/product_setup.ts` is ~82 lines of Markdown-formatted instruction text

### How Skills are Used
1. **Storage**: Skills are embedded as strings in the codebase (no external files)
2. **Access**: Via `loadSkillTool` — agents call `load_skill(skillName="product_setup")`
3. **Response**: Returns the full skill content as a string to the LLM

### For Memory System
**No new skill needed at this stage.** The memory system is a low-level capability (like project overview tools), not a skill. Skills are higher-level, user-facing instructions. Memory is infrastructure.

However, if the orchestrator needs guidance on **when to save/search memory**, that could be added as a skill (e.g., `memory_management` skill). But this is optional for MVP.

---

## 4. Database Access Pattern

### Initialization (`src/db/index.ts`)
```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("sqlite.db");
sqlite.pragma("journal_mode = WAL");  // Enable WAL mode for concurrency
export const db = drizzle(sqlite, { schema });
```

**Key Observation**: `db` is a singleton exported module-level, reused across all requests.

### Schema (`src/db/schema.ts`)
```typescript
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // ... other fields
});

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  // ... other fields
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  messageData: text("message_data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Pattern**: 
- Tables are defined using `sqliteTable()`
- Columns use type functions: `integer()`, `text()`, `timestamp()`, etc.
- Foreign keys use `.references()`
- Default timestamps use `.$defaultFn()` and `.$onUpdate()`
- `autoIncrement: true` for auto-incrementing IDs

### Helper Functions (`src/lib/db-helpers.ts`)
All DB operations are abstracted into helper functions:
- **Read**: `getProject()`, `getChat()`, `getMessagesByChat()`
- **Write**: `saveMessage()` (uses UPSERT pattern with `.onConflictDoUpdate()`)
- **Complex**: `getProjectsWithChats()` (joins projects + chats)

**Key Pattern**: Helper functions handle JSON serialization/deserialization (e.g., `messageData` stored as text but parsed back to objects).

### Raw SQL Access
- **How**: `db.prepare()` is NOT publicly exposed in Drizzle; instead use the singleton `sqlite` instance
- **For FTS5**: Need direct access to `better-sqlite3` instance
  
  ```typescript
  // In src/db/index.ts, export the underlying sqlite instance
  export const sqlite = new Database("sqlite.db");
  export const db = drizzle(sqlite, { schema });
  
  // Then in tools or helpers
  import { sqlite } from "@/db";
  const results = sqlite.prepare("SELECT * FROM memories_fts WHERE memories_fts MATCH ?").all(query);
  ```

### No Existing Raw SQL
- Only one `pragma` call found: `sqlite.pragma("journal_mode = WAL")`
- No `.raw()` or explicit SQL queries in the current codebase
- FTS5 will be the first use of raw SQL queries

---

## 5. Architecture Constraints

### Orchestrator-Only vs Shared Tools

**Question**: Should `saveMemory` and `searchMemory` be available only to the orchestrator, or to sub-agents too?

**Analysis**:
- **Current Pattern**: Sub-agents (dataforseo, copywriter) are **ToolLoopAgent** instances with only their specific tools
- **Project-Scoped Tools**: Only orchestrator has project-scoped tools (`get_project_overview`, `set_project_overview`)
- **Memory Should Be**: **Orchestrator-only** for MVP
  - Rationale: Memory decisions (what to save, when, how) are orchestrator responsibilities
  - Sub-agents are transient; orchestrator is the "coordinator"
  - Later, can expose memory tools to sub-agents if needed

### Singleton vs Request-Scoped

**Memory tools should be SINGLETONS**, not request-scoped:
- Memory is not project-specific; it's global agent state
- All memories are accessible from any project context
- Unlike `get_project_overview(projectId)`, memory searches aren't project-gated

```typescript
// ✓ Correct (singleton)
export const saveMemoryTool = tool({ ... });
export const searchMemoryTool = tool({ ... });

export function createOrchestratorAgent(projectId: number) {
  return new ToolLoopAgent({
    tools: {
      save_memory: saveMemoryTool,      // Singleton
      search_memory: searchMemoryTool,  // Singleton
      get_project_overview: createGetProjectOverviewTool(projectId), // Request-scoped
    },
  });
}
```

### Database Lifecycle
- **Connection**: Single SQLite connection created at module load (`src/db/index.ts`)
- **Concurrency**: WAL mode enabled for safe concurrent reads/writes
- **Per-Request**: Each API call (POST `/api/chat`) creates a NEW orchestrator agent but reuses the SAME db connection
- **Implications for Memory**: 
  - Memory writes from concurrent requests are safe (WAL + SQLite's locking)
  - Memory reads are immediate (no caching needed for MVP)
  - FTS5 virtual table updates will be serialized by SQLite's write locks

---

## 6. Key Files Summary

| File | Purpose | Role in Memory System |
|------|---------|----------------------|
| `src/db/schema.ts` | Define all tables | Add `memories` table definition here |
| `src/db/index.ts` | DB initialization | Add FTS5 virtual table setup; export `sqlite` instance for raw queries |
| `src/agents/tools.ts` | Tool definitions | Add `saveMemoryTool` and `searchMemoryTool` here; register in `createOrchestratorAgent()` |
| `src/lib/db-helpers.ts` | DB helpers | Add `saveMemory()`, `searchMemory()`, `getAllMemories()` helper functions |
| `src/agents/prompts/orchestrator.ts` | Orchestrator instructions | Update prompt to teach when/how to use memory tools |
| `src/agents/prompts/index.ts` | Prompt exports | No changes needed |
| `src/skills/index.ts` | Skills registry | No changes needed (memory is infrastructure, not a skill) |

---

## 7. Risks & Unknowns

### 1. **FTS5 Trigger Synchronization** ⚠️ MEDIUM
- **Risk**: If a memory is updated via direct SQL (not via tool), the FTS5 virtual table may desync
- **Mitigation**: Always use helper functions for memory operations; document that direct SQL updates skip FTS5 sync
- **Status**: Acceptable for MVP — triggers handle normal paths

### 2. **Drizzle Migration Tooling** ⚠️ LOW
- **Risk**: Drizzle doesn't manage FTS5 tables, so raw SQL migrations must be added manually
- **Mitigation**: Create a migration file after Drizzle generates the `memories` table
- **Status**: One-time setup cost; clearly documented in proposal

### 3. **AI SDK Tool Return Types** ✓ KNOWN
- **Risk**: Tools return strings; complex query results must be JSON-stringified
- **Mitigation**: Already done in existing code (see `getProjectOverviewTool` returning `JSON.stringify()`)
- **Status**: No risk

### 4. **FTS5 Query Performance** ✓ UNKNOWN (but low risk)
- **Risk**: With many memories, FTS5 might be slow without proper indexing
- **Mitigation**: FTS5 automatically creates indexes; test with realistic data volume post-MVP
- **Status**: Monitor but not a blocker

### 5. **Scope Filtering** ⚠️ LOW
- **Risk**: Should memory searches be filtered by scope (project vs personal)?
- **Question**: Do we need a `getMemoriesByScope(scope)` or is global search fine?
- **Status**: Clarification needed; assume global search for MVP

### 6. **Postgres Migration Path** ⚠️ FUTURE
- **Risk**: FTS5 is SQLite-specific; migrating to Postgres later would require rewrite
- **Mitigation**: This is SQLite-only MVP; document for future refactoring
- **Status**: Out of scope for this change

---

## 8. Ready for Proposal?

**✅ YES**

All technical questions answered:
1. ✓ FTS5 is fully supported and tested
2. ✓ Tool registration pattern is clear and follows existing conventions
3. ✓ Database access pattern is established
4. ✓ Migration strategy is viable
5. ✓ No blockers identified

**Next Steps**: Move to SDD **Proposal** phase to define scope, intent, and implementation approach.

