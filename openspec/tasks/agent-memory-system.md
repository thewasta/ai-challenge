# Tasks: agent-memory-system

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–320 LOC |
| 400-line budget risk | **Low** |
| Chained PRs recommended | **No** |
| Suggested split | Single PR (all changes fit comfortably under budget) |
| Delivery strategy | `ask-always` |
| Decision needed before apply | **No** |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low
```

---

## Breakdown Summary

- **Batch 1 — Database Foundation**: 3 tasks, ~90 min
  - Schema definition, Drizzle migration generation, FTS5 setup
- **Batch 2 — Memory Tools & Helpers**: 4 tasks, ~120 min
  - Memory template, tool factories, DB helper functions, type exports
- **Batch 3 — Agent Integration**: 3 tasks, ~90 min
  - Orchestrator prompt update, tool registration, verification
- **Total**: 10 tasks, ~300 min (~5 hours)

---

## Task List

### Batch 1: Database Foundation

#### [x] 1.1 Add `memories` table to Drizzle schema

- [x] **File**: `src/db/schema.ts`
- **Description**: Add the `memories` table definition with columns: `id` (PK, autoincrement), `projectId` (FK to projects, cascade delete), `title` (text, NOT NULL), `topic` (text enum), `scope` (text enum, default "project"), `content` (text, NOT NULL), `createdAt` (timestamp, default now). Use Drizzle's inline `enum` on `text()` for topic and scope.
- **Verification**: File compiles; schema imports without errors. Run `pnpm exec tsc --noEmit` — no type errors.
- **Depends on**: None
- **Est. time**: 15 min

#### [x] 1.2 Generate Drizzle migration for `memories` table

- [x] **File**: Auto-generated in `drizzle/migrations/`
- **Description**: Run `pnpm exec drizzle-kit generate sqlite --out drizzle/migrations` to create the migration SQL file for the new `memories` table. Verify the generated SQL includes the FK constraint with CASCADE DELETE.
- **Verification**: `drizzle/migrations/` contains a new `.sql` file with CREATE TABLE for `memories`; file includes `ON DELETE CASCADE` for the FK constraint.
- **Depends on**: 1.1
- **Est. time**: 5 min

#### [x] 1.3 Set up FTS5 virtual table and triggers in `src/db/index.ts`

- [x] **File**: `src/db/index.ts`
- **Description**: Export the raw `sqlite` instance (Database from better-sqlite3). Add `sqlite.exec()` block with: CREATE VIRTUAL TABLE IF NOT EXISTS `memories_fts` using fts5(title, content, content='memories', content_rowid='id'); CREATE TRIGGER IF NOT EXISTS `memories_ai` AFTER INSERT; CREATE TRIGGER IF NOT EXISTS `memories_ad` AFTER DELETE; CREATE TRIGGER IF NOT EXISTS `memories_au` AFTER UPDATE. Use `IF NOT EXISTS` for idempotency. Then export `db = drizzle(sqlite, { schema })`.
- **Verification**: App starts without errors; `pnpm exec tsc --noEmit` passes; check sqlite.db file contains the virtual table (use `.schema memories_fts` in sqlite CLI).
- **Depends on**: 1.1 (schema exists in memory, not in DB yet)
- **Est. time**: 20 min

---

### Batch 2: Memory Tools & Helpers

#### [x] 2.1 Create `src/agents/memory-template.ts` with validation

- [x] **File**: `src/agents/memory-template.ts` (new)
- **Description**: Export `MEMORY_TEMPLATE` constant as a Markdown template string with four required sections (## Contexto / Objetivo, ## Datos Clave / Hallazgos, ## Decisión / Acción, ## Siguientes Pasos). Export `validateMemoryContent(content: string)` function that checks for presence of all four sections and returns `{ valid: boolean; missing: string[] }`.
- **Verification**: Function correctly identifies missing sections when called with incomplete content; returns `valid=true` for complete content. Run `pnpm exec tsc --noEmit` — no type errors.
- **Depends on**: None
- **Est. time**: 10 min

#### [x] 2.2 Add DB helpers: `insertMemory` and `searchMemoriesFTS`

- [x] **File**: `src/lib/db-helpers.ts`
- **Description**: Add two exports: (1) `insertMemory(data: { projectId, title, topic, scope, content })` — async function using `db.insert(memories).values({...}).returning({ id })`, returns the inserted memory ID. (2) `searchMemoriesFTS(projectId, query, limit = 5)` — synchronous function preparing FTS5 SQL with double-quote escaping on query, executing on the `sqlite` instance, returning array of `{ id, title, topic, scope, snippet, rank }`. Import `sqlite` from `@/db` and `memories` from `@/db/schema`.
- **Verification**: Functions compile; `pnpm exec tsc --noEmit` passes strict type checking. Manually test: call `insertMemory(...)` in dev console, verify row appears in memories table; call `searchMemoriesFTS(...)`, verify FTS5 query executes without syntax error.
- **Depends on**: 1.3 (FTS5 setup must exist), 2.1 (template validation available)
- **Est. time**: 25 min

#### [x] 2.3 Create `saveMemoryTool` factory in `src/agents/tools.ts`

- [x] **File**: `src/agents/tools.ts`
- **Description**: Add function `createSaveMemoryTool(projectId: number)` that returns a `tool()` object with: description mentioning MEMORY_TEMPLATE requirement; inputSchema with Zod object (title: string min 3 max 150, topic: enum, scope: enum default "project", content: string min 50 max 5000); execute handler that calls `validateMemoryContent(content)`, returns error message if invalid, otherwise calls `insertMemory()` and returns success message with ID. Follow exact same pattern as `createGetProjectOverviewTool()`.
- **Verification**: Tool registers without errors. Test: orchestrator calls tool with valid content → memory is saved; tool is called with missing sections → error message returned with "Error:" prefix and list of missing sections.
- **Depends on**: 2.1, 2.2
- **Est. time**: 20 min

#### [x] 2.4 Create `searchMemoryTool` factory in `src/agents/tools.ts`

- [x] **File**: `src/agents/tools.ts`
- **Description**: Add function `createSearchMemoryTool(projectId: number)` that returns a `tool()` object with: description mentioning FTS5 search; inputSchema with Zod object (query: string min 2 max 200, limit: number int min 1 max 20 default 5); execute handler that calls `searchMemoriesFTS(projectId, query, limit)`, returns "No memories found for that query." if empty array, otherwise returns `JSON.stringify(results)`. Follow exact same pattern as `createSaveMemoryTool()`.
- **Verification**: Tool registers without errors. Test: search for existing keyword → results returned as JSON; search for nonexistent keyword → "No memories found" message; large result set returns top N results ordered by rank.
- **Depends on**: 2.2
- **Est. time**: 15 min

#### [x] 2.5 Export TypeScript types from `src/db/schema.ts`

- [x] **File**: `src/db/schema.ts` (append to existing file)
- **Description**: Add type exports: `Memory` (inferred from `memories.$inferSelect`), `NewMemory` (inferred from `memories.$inferInsert`), `MemoryTopic` (union of topic enum literals), `MemoryScope` (union of scope enum literals), `MemorySearchResult` interface with fields: id, title, topic, scope, snippet, rank.
- **Verification**: Types compile; `pnpm exec tsc --noEmit` passes; types are importable by tools and helpers.
- **Depends on**: 1.1
- **Est. time**: 10 min

---

### Batch 3: Agent Integration

#### [x] 3.1 Update orchestrator prompt with memory tool guidance

- [x] **File**: `src/agents/prompts/orchestrator.ts`
- **Description**: Append a new section titled "# Memoria de Proyecto" after the existing delegation rules. Include subsections: (1) "CUÁNDO GUARDAR (`save_memory`)" with 5 bulleted use cases and topic guidance (project-decision, seo-strategy, technical-audit, content-plan, user-preference). (2) "CUÁNDO BUSCAR (`search_memory`)" with 3 bulleted use cases (at start of task, when user asks about prior context, before delegating). Keep tone and language consistent with existing prompt (Spanish, imperative).
- **Verification**: Prompt text compiles as part of the module; `pnpm exec tsc --noEmit` passes; orchestrator agent initializes without errors.
- **Depends on**: None
- **Est. time**: 15 min

#### [x] 3.2 Register memory tools in orchestrator agent factory

- [x] **File**: `src/agents/tools.ts` (modify `createOrchestratorAgent` function around line 366)
- **Description**: In the `tools` object passed to `new ToolLoopAgent(...)`, add two new entries: `save_memory: createSaveMemoryTool(projectId)` and `search_memory: createSearchMemoryTool(projectId)`. Keep existing tools (load_skill, delegate_to_subagent, get_project_overview, set_project_overview). No changes to other sub-agents' tool registrations.
- **Verification**: Orchestrator agent initializes without errors; `pnpm exec tsc --noEmit` passes; tools are callable in agent context (manually test in dev).
- **Depends on**: 2.3, 2.4, 3.1
- **Est. time**: 10 min

#### [x] 3.3 Run verification: build, linting, typing

- [x] **File**: Project root
- **Description**: Execute three checks: (1) `pnpm exec tsc --noEmit` — must show zero type errors. (2) `pnpm exec @biomejs/biome check --apply .` — must show all files pass linting (auto-fix if needed). (3) `pnpm run build` or equivalent to verify the project compiles. Document results.
- **Verification**: All three commands pass cleanly. No errors or warnings.
- **Depends on**: All prior tasks (2.1–3.2)
- **Est. time**: 15 min

#### [x] 3.4 Manual integration test: save and search a memory

- [x] **File**: Project root (dev environment)
- **Description**: Start the dev server; open the chat UI for a test project. Ask the orchestrator to save a memory with valid 4-section Markdown (use the MEMORY_TEMPLATE as guide). Verify: (1) Memory is saved and returns success message with ID. (2) Row appears in `memories` table in sqlite.db. (3) Row appears in `memories_fts` virtual table. Then ask orchestrator to search for a keyword from the saved memory. Verify: (1) Results are returned as JSON. (2) Results include correct id, title, topic, scope, snippet, rank fields. (3) Results are ordered by rank (most relevant first).
- **Verification**: Screenshots or logs showing: (a) successful save with ID returned; (b) database row visible; (c) successful search with ranked results; (d) orchestrator responds naturally with memory context.
- **Depends on**: 3.2, app is running
- **Est. time**: 20 min

#### [x] 3.5 Test cascade delete: verify project deletion clears memories

- [x] **File**: Project root (dev environment)
- **Description**: In dev environment, create a test project; save 2–3 memories via orchestrator. Then delete the project via UI or database. Verify: (1) All associated memories are cascade-deleted from `memories` table. (2) All associated FTS5 entries are cascade-deleted from `memories_fts` virtual table. (3) FK constraint is enforced (attempting to insert memory with invalid project_id fails).
- **Verification**: Database audit confirms no orphaned memory rows remain after project deletion; attempted insert with bad project_id raises FK error.
- **Depends on**: 3.2, app is running, DB has test project
- **Est. time**: 15 min

#### [x] 3.6 Test error handling: invalid memory content rejected

- [x] **File**: Project root (dev environment)
- **Description**: Ask the orchestrator to save a memory with incomplete Markdown (missing one or more required sections, e.g., no "## Decisión / Acción" section). Verify: (1) Tool returns error message starting with "Error: Missing required sections:". (2) Lists the exact sections that are missing. (3) No row is inserted into the database. Then ask it to save with valid content; verify success.
- **Verification**: Error messages are clear and actionable; no database pollution from failed attempts; recovery with corrected content succeeds.
- **Depends on**: 3.2, app is running
- **Est. time**: 10 min

---

## Implementation Order & Rationale

1. **Batch 1 (Database Foundation)** → Establishes the persistent layer. Tasks must run in order (schema → migration → FTS5 setup) because each depends on the previous.
2. **Batch 2 (Memory Tools & Helpers)** → Builds the business logic and tool factories. Task 2.5 (types) can run in parallel with helpers but listed in order for clarity.
3. **Batch 3 (Agent Integration)** → Wires everything together into the orchestrator. Verification tests (3.4–3.6) run last to ensure end-to-end correctness.

**Single PR Strategy**: All 10 tasks fit comfortably in one PR (~280–320 LOC, well under the 400-line budget). No split needed.

---

## Files Changed

| File | Type | Lines Added | Purpose |
|------|------|-------------|---------|
| `src/db/schema.ts` | Modified | +25 | Add `memories` table + type exports |
| `src/db/index.ts` | Modified | +40 | FTS5 virtual table + triggers |
| `src/agents/memory-template.ts` | New | +30 | Template constant + validation function |
| `src/lib/db-helpers.ts` | Modified | +60 | `insertMemory` + `searchMemoriesFTS` helpers |
| `src/agents/tools.ts` | Modified | +80 | `createSaveMemoryTool`, `createSearchMemoryTool`, tool registration |
| `src/agents/prompts/orchestrator.ts` | Modified | +25 | Memory tool guidance section |
| `drizzle/migrations/` | New | +15 | Auto-generated Drizzle migration SQL |
| **Total** | | **~275** | |

---

## Success Criteria (from Proposal)

- [ ] `saveMemoryTool` successfully persists memory with validation; rejects malformed Markdown
- [ ] `searchMemoryTool` returns relevant results ranked by FTS5 relevance
- [ ] Memories are scoped by `project_id`; deleting project cascades delete all its memories
- [ ] Orchestrator can call both tools without errors
- [ ] FTS5 virtual table stays synced with main table (trigger integrity verified)
- [ ] All database operations use Drizzle ORM (except FTS5 raw SQL in setup only)
- [ ] TypeScript types pass strict checking (`pnpm exec tsc --noEmit`)
- [ ] Code passes linting (`pnpm exec @biomejs/biome check --apply .`)
