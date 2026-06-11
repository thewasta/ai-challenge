# Proposal: agent-memory-system

## Intent

Enable the orchestrator agent to persistently store and query structured decision memories across project sessions. Memories capture decision context (business rules, findings, actions taken) in a searchable, project-scoped knowledge base. This eliminates repeated analysis and allows sub-agents to reference prior decisions without reprocessing data.

## Scope

### In Scope
- `memories` table with `project_id` FK (cascade delete), `topic` enum (5 values), `scope` enum (`project` | `personal`)
- FTS5 virtual table for full-text search on title + content
- `saveMemoryTool`: Agent-callable tool that validates Markdown structure against `MEMORY_TEMPLATE` and persists to database
- `searchMemoryTool`: Global FTS5 search returning ranked results (no project filtering in tool — filtering handled by orchestrator)
- `MEMORY_TEMPLATE` constant defining required Markdown sections (Contexto/Objetivo, Datos Clave/Hallazgos, Decisión/Acción, Siguientes Pasos)
- Drizzle schema + SQLite raw SQL for FTS5 setup and triggers
- Orchestrator prompt update with memory tool instructions

### Out of Scope
- Memory editing or deletion via tools (database-only for now)
- Pagination or result limits (MVP returns top N results)
- Automatic memory tagging or topic inference
- Memory metrics (usage counts, age decay)
- UI viewer for memories (backend-only in MVP)
- Schema versioning or data migrations beyond initial setup

## Capabilities

### New Capabilities
- `agent-memory-persistence`: Persist structured memories with validation, project scoping, and topic tagging
- `agent-memory-search`: Full-text search memories by title/content with ranking and relevance

### Modified Capabilities
- `agent-tools-subagents-setup`: Add `saveMemoryTool` and `searchMemoryTool` to orchestrator agent

## Approach

1. **Schema** — Add `memories` table with columns: `id` (PK), `project_id` (FK cascade), `title`, `content` (JSON/TEXT), `topic`, `scope`, `created_at`, `updated_at`
2. **FTS5 Index** — Create virtual table `memories_fts(title, content)` with triggers to keep synced
3. **Validation** — `MEMORY_TEMPLATE` constant defines required Markdown sections; `saveMemoryTool` validates before insert
4. **Tool Definitions**:
   - `saveMemoryTool`: Accepts pre-formatted Markdown; validates structure; persists with topic/scope metadata
   - `searchMemoryTool`: Accepts query string; searches FTS5; returns ranked results (no project filtering)
5. **Orchestrator Integration** — Register tools in `createOrchestratorAgent()`; update prompt with usage guidance

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/db/schema.ts` | New | Add `memories` Drizzle table with enums |
| `src/db/index.ts` | Modified | Create FTS5 virtual table + INSERT/UPDATE/DELETE triggers |
| `src/agents/tools.ts` | Modified | Add `saveMemoryTool` and `searchMemoryTool`; register in orchestrator |
| `src/agents/memory-template.ts` | New | `MEMORY_TEMPLATE` constant + validation function |
| `src/lib/db-helpers.ts` | New | Helper functions: `insertMemory()`, `searchMemoriesFTS()` |
| `src/agents/prompts/orchestrator.ts` | Modified | Add memory tool instructions and usage context |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FTS5 virtual table sync falls out of sync with main table | Low | Enforce insert/update/delete triggers; test in specs |
| Oversized content fields slow FTS5 queries | Med | Limit content size in schema; add VARCHAR(5000) max in validation |
| Tool receives malformed Markdown, validation rejects it | Med | Clear error messages in tool response; orchestrator can retry with guidance |
| Project_id FK breaks memories for deleted projects | Low | CASCADE DELETE at schema level; test data integrity in verify phase |

## Rollback Plan

1. Drop FTS5 virtual table: `DROP TABLE IF EXISTS memories_fts`
2. Drop triggers: `DROP TRIGGER IF EXISTS memories_ai`, `memories_au`, `memories_ad`
3. Drop `memories` table: `DROP TABLE memories`
4. Remove tool registrations from `createOrchestratorAgent()`
5. Remove `MEMORY_TEMPLATE` constant and helpers
6. Revert orchestrator prompt to pre-memory version

## Dependencies

- Drizzle ORM v0.45.2+ (already in project)
- SQLite with FTS5 enabled (v3.41+; already compiled in better-sqlite3 v12.10.0)
- Vercel AI SDK v6.0.198+ (already in project)

## Success Criteria

- [ ] `saveMemoryTool` successfully persists memory with validation; rejects malformed Markdown
- [ ] `searchMemoryTool` returns relevant results ranked by FTS5 relevance
- [ ] Memories are scoped by `project_id`; deleting project cascades delete all its memories
- [ ] Orchestrator can call both tools without errors
- [ ] FTS5 virtual table stays synced with main table (trigger integrity verified)
- [ ] All database operations use Drizzle ORM (except FTS5 raw SQL in setup only)
- [ ] TypeScript types pass strict checking (`pnpm exec tsc --noEmit`)
- [ ] Code passes linting (`pnpm exec @biomejs/biome check --apply .`)

## Timeline Estimate

- **Files to change**: 7 (1 new schema table, 1 new helper, 2 new tool functions, 3 modified files, 1 new template constant)
- **Lines of code**: ~280 (schema: 25, helpers: 60, tools: 80, template: 30, triggers: 40, prompt update: 25, tests/cleanup: ~20)
- **Estimated effort**: 2–3 hours (schema design, FTS5 setup, tool implementation, orchestrator integration, testing)
