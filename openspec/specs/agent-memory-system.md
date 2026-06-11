# Specs: agent-memory-system

## Capability: agent-memory-persistence

### Summary

The system SHALL persist structured decision memories to SQLite with project scoping, topic classification, and Markdown validation. Each memory is linked to a project, tagged with a topic (seo-strategy, technical-audit, content-plan, project-decision, user-preference), and stored with a scope indicator (project or personal). The `saveMemoryTool` validates that memory content matches the MEMORY_TEMPLATE structure before persistence, ensuring all four required Markdown sections are present.

### Scenarios

#### Scenario: Save a memory with valid content

- **GIVEN** the orchestrator agent has gathered findings and decision context for a project
- **WHEN** `saveMemoryTool` is called with title, topic (`seo-strategy` | `technical-audit` | `content-plan` | `project-decision` | `user-preference`), scope (`project` | `personal`), and pre-formatted Markdown content containing all four required sections
- **THEN** the tool validates the content structure against MEMORY_TEMPLATE (Contexto/Objetivo, Datos Clave/Hallazgos, Decisión/Acción Tomada, Siguientes Pasos/Impacto)
- **AND** a new row is inserted into the `memories` table with project_id set from the current chat context
- **AND** the row includes id (autoincrement), title, topic, scope, content (full Markdown), and created_at (current timestamp)
- **AND** the FTS5 virtual table `memories_fts` is automatically synced via INSERT trigger
- **AND** the tool returns `{ success: true, memoryId: <id>, message: "Memory saved" }`

#### Scenario: Reject invalid content structure

- **GIVEN** the orchestrator provides memory content missing one or more required sections from MEMORY_TEMPLATE
- **WHEN** `saveMemoryTool` validates the content
- **THEN** the validation fails and returns `{ success: false, error: "Missing sections: [section1, section2]" }`
- **AND** no row is inserted into the database
- **AND** the orchestrator receives clear guidance on which sections are required

#### Scenario: Link memory to current project

- **GIVEN** a chat session is active within project X (project_id = 5)
- **WHEN** `saveMemoryTool` is called without an explicit project_id parameter
- **THEN** the tool extracts project_id from the chat context automatically
- **AND** the memory's `project_id` column is set to 5
- **AND** the memory is stored durably in the `memories` table

#### Scenario: Reject memory for missing project context

- **GIVEN** a tool call occurs outside a valid chat context (no active project)
- **WHEN** `saveMemoryTool` is invoked
- **THEN** the tool returns `{ success: false, error: "No active project context" }`
- **AND** no row is inserted

#### Scenario: Persist across sessions

- **GIVEN** a memory was saved in a previous session (created_at: 2026-06-10T15:30:00Z)
- **WHEN** the application restarts and the orchestrator calls `searchMemoryTool`
- **THEN** the memory remains accessible in the database
- **AND** the memory's created_at timestamp is preserved
- **AND** the orchestrator can retrieve and reference it by id

#### Scenario: Enforce project-scoped isolation

- **GIVEN** project X has saved memories with ids 1, 2, 3
- **WHEN** a chat session for project Y executes a raw database query or the searchMemoryTool is called
- **THEN** memories from project X are NOT visible when searching from project Y's context
- **AND** only memories where memories.project_id matches project Y are returned

## Capability: agent-memory-search

### Summary

The system SHALL provide full-text search across memory title and content using SQLite FTS5 with ranking and relevance sorting. The `searchMemoryTool` accepts a query string, executes FTS5 MATCH on the virtual table `memories_fts`, and returns ranked results as an array of memory records including id, title, topic, scope, a content snippet (first 200 characters), and created_at. The tool performs global search with no project filtering; filtering by project_id is the responsibility of the orchestrator context.

### Scenarios

#### Scenario: Search by keyword

- **GIVEN** several memories exist with titles and content containing different keywords
- **WHEN** `searchMemoryTool` is called with query: `"keyword"`
- **THEN** FTS5 MATCH executes on memories_fts(title, content)
- **AND** only memories where title or content contains "keyword" are returned
- **AND** results are ordered by FTS5 rank (most relevant first)
- **AND** each result includes: id, title, topic, scope, snippet (first 200 chars of content), and created_at

#### Scenario: Search returns empty results

- **GIVEN** the query term "nonexistent123" does not appear in any saved memory
- **WHEN** `searchMemoryTool` is called with query: `"nonexistent123"`
- **THEN** the tool executes the FTS5 query successfully
- **AND** returns `{ results: [], message: "No memories found" }`

#### Scenario: Search with multiple terms (AND logic)

- **GIVEN** memories contain "SEO strategy", "paid ads", "organic search"
- **WHEN** `searchMemoryTool` is called with query: `"SEO strategy"`
- **THEN** FTS5 returns only memories containing both "SEO" AND "strategy" (or the phrase)
- **AND** results are ranked by relevance

#### Scenario: FTS5 handles special characters in query

- **GIVEN** memories contain text like: 'Best "practices" for SEO—2026', 'Paid (Ads) ROI'
- **WHEN** `searchMemoryTool` is called with query: `"best practices" SEO`
- **THEN** the tool sanitizes special characters in the query before passing to FTS5.MATCH
- **AND** FTS5 executes without syntax errors
- **AND** valid results are returned for well-formed queries

#### Scenario: FTS5 rejects malformed query

- **GIVEN** a query contains unbalanced operators: `"unclosed OR AND"`
- **WHEN** `searchMemoryTool` sanitizes and validates the query
- **THEN** if the query remains invalid after sanitization, the tool returns `{ success: false, error: "Invalid search syntax" }`

#### Scenario: Search respects project scope (via orchestrator context)

- **GIVEN** project X and project Y both have memories saved
- **WHEN** the orchestrator in project X's context calls `searchMemoryTool` with a query
- **THEN** the searchMemoryTool returns ALL matching memories (no project filtering in the tool)
- **AND** the orchestrator context is responsible for filtering results to only project X's memories before displaying or referencing them

#### Scenario: Search returns large result set

- **GIVEN** 500 memories all match the query term
- **WHEN** `searchMemoryTool` is called
- **THEN** the tool returns up to N results (MVP limit, defined in implementation)
- **AND** results are ordered by FTS5 rank (highest relevance first)
- **AND** the response time is < 50ms

## Capability: agent-tools-subagents-setup (Modified)

### Summary

The orchestrator agent's tool set is extended with `saveMemoryTool` and `searchMemoryTool`. The orchestrator prompt is updated to include usage guidance, decision heuristics for when to save vs. search, and scope/topic best practices. Sub-agents (copywriter, seo-specialist, etc.) do NOT have access to memory tools; only the orchestrator can persist and query memories.

### Scenarios

#### Scenario: Orchestrator recognizes memory tools in context

- **GIVEN** the orchestrator agent is initialized with the updated prompt
- **WHEN** the orchestrator receives a user request or internal trigger to save a finding
- **THEN** the orchestrator's available tools include `saveMemoryTool` and `searchMemoryTool`
- **AND** the prompt includes instructions such as: "Use saveMemoryTool when you have made a key decision or finding worthy of future reference"
- **AND** the prompt includes instructions such as: "Use searchMemoryTool to recall past decisions before re-analyzing the same topic"

#### Scenario: Orchestrator saves memory after sub-agent work

- **GIVEN** the copywriter sub-agent has generated content recommendations
- **WHEN** the orchestrator reviews and integrates the recommendations into a decision
- **THEN** the orchestrator calls `saveMemoryTool` with topic = `content-plan` and the summarized decision
- **AND** the memory is saved with the current project_id from the chat context

#### Scenario: Only orchestrator can save memories

- **GIVEN** the copywriter sub-agent is invoked in a message
- **WHEN** the copywriter attempts to use a `saveMemoryTool` function
- **THEN** the tool is NOT available in the copywriter's tool set (tools array is empty or excludes memory tools)
- **AND** if the copywriter tries to call it, an error "Tool not found" is returned
- **AND** only the orchestrator has access to memory tools

#### Scenario: Sub-agents do not have search access

- **GIVEN** the seo-specialist sub-agent is active
- **WHEN** the seo-specialist tries to call `searchMemoryTool`
- **THEN** the tool is not in the seo-specialist's available tools
- **AND** the orchestrator is responsible for searching and providing relevant memory context to sub-agents

#### Scenario: Orchestrator tool registration is validated

- **GIVEN** the orchestrator agent is created via `createOrchestratorAgent()`
- **WHEN** the agent is initialized
- **THEN** both `saveMemoryTool` and `searchMemoryTool` are registered in the agent's tool set
- **AND** the tools are callable with the expected signatures (inputs validated against their Zod schemas)

## Non-Functional Requirements

### Performance

- FTS5 searches complete in < 50ms for databases up to 10,000 memories
- Memory insertion (saveMemoryTool) completes in < 10ms
- FTS5 trigger execution (on INSERT/UPDATE/DELETE) adds < 2ms overhead per operation
- Content validation (Markdown section parsing) completes in < 5ms per memory

### Data Integrity

- Foreign key constraint: `memories.project_id` → `projects.id` with CASCADE DELETE
- Deleting a project cascades to delete all its associated memories
- FTS5 virtual table `memories_fts` is kept in sync with `memories` via triggers (INSERT, UPDATE, DELETE)
- Database schema enforces NOT NULL on `id`, `project_id`, `title`, `topic`, `scope`, `content`, `created_at`
- Topic and scope columns use SQLite CHECK constraints to enforce enum values
- Cascade delete tested: verify that deleting a project removes all its memories and FTS5 entries

### Schema Constraints

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `project_id` | INTEGER | NOT NULL, FOREIGN KEY → projects.id (CASCADE DELETE) |
| `title` | TEXT | NOT NULL, max length 255 chars |
| `topic` | TEXT | NOT NULL, CHECK (topic IN ('seo-strategy', 'technical-audit', 'content-plan', 'project-decision', 'user-preference')) |
| `scope` | TEXT | NOT NULL, CHECK (scope IN ('project', 'personal')) |
| `content` | TEXT | NOT NULL, max length 5000 chars, validated against MEMORY_TEMPLATE |
| `created_at` | INTEGER | NOT NULL, timestamp mode, default CURRENT_TIMESTAMP |

### Database Migration

- Drizzle migration file auto-generated for `memories` table schema (excluding FTS5 setup)
- FTS5 virtual table `memories_fts` created via raw SQL in database initialization (not in Drizzle migrations)
- Triggers (`memories_ai`, `memories_au`, `memories_ad`) created via raw SQL on first DB init
- Migration is backward-compatible: no existing data affected; new tables only
- Rollback: DROP TABLE `memories_fts`, DROP TRIGGERS `memories_ai`, `memories_au`, `memories_ad`, DROP TABLE `memories`

### Type Safety

- All tool inputs validated with Zod schemas before execution
- TypeScript strict mode enabled; no `any` types
- All database queries use Drizzle ORM (except FTS5 raw SQL)
- Tool return types explicitly typed (`{ success: boolean; memoryId?: number; error?: string }`)

### Code Organization

- Tool definitions in `src/agents/tools.ts`
- DB helpers in `src/lib/db-helpers.ts` (insertMemory, searchMemoriesFTS)
- Schema in `src/db/schema.ts` (Drizzle table definition)
- Template and validation in `src/agents/memory-template.ts`
- FTS5 init in `src/db/index.ts` (raw SQL)
- Orchestrator prompt update in `src/agents/prompts/orchestrator.ts`
