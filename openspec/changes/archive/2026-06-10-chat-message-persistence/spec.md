Excellent! The spec has been successfully written. Let me provide the phase completion envelope:

---

## SDD Phase Complete: **Specification**

### Status
✅ **COMPLETE** — Formal specification written and artifact persisted.

### Executive Summary

**Change:** `chat-message-persistence`  
**Domain:** Chat Persistence Storage & APIs  
**Scope:** 13 requirements covering database schema, API contracts (GET/POST), frontend component behavior, message serialization, and lifecycle management.

**Key Decisions Formalized:**
- Messages stored as complete `UIMessage` JSON blobs in `message_data` column (preserves tool metadata: `toolCallId`, `input`, `output`)
- UPSERT by `message.id` prevents duplicates on `onFinish` retry
- Single atomic save on stream completion (not incremental)
- ChatArea loads history on mount, persists via `onFinish` callback
- All messages loaded without pagination (MVP pragmatism)

**Spec Coverage:**
1. **Schema** — 5-column `messages` table with foreign key cascade delete
2. **Database Layer** — 2 functions (`saveMessage`, `getMessagesByChat`) with UPSERT semantics
3. **API Endpoints** — GET `/api/chats/[id]` (200/404), POST `/api/chats/sendMessage` (200/400/404/500)
4. **Frontend** — ChatArea prop threading, onFinish callback, ChatLayout integration
5. **Data Flow** — Complete message lifecycle from user input → persistence → reload recovery
6. **Validation** — Message deserialization guards, atomicity, Given/When/Then scenarios for each requirement

### Artifacts

| Artifact | Path | Type |
|----------|------|------|
| **Chat Persistence Spec** | `openspec/changes/chat-message-persistence/specs/chat-persistence/spec.md` | Full new domain specification |

**Directory Structure Created:**
```
openspec/changes/chat-message-persistence/specs/chat-persistence/
└── spec.md (13.1 KB, 12 requirements, 17 scenarios)
```

### Next Recommended

**Phase:** Design (or proceed to Task/Apply if design is implicit in spec)

**Recommended Actions:**
1. **Review Spec** — Stakeholders confirm all 12 requirements align with FR-2 and API expectations
2. **Design Phase** (optional) — If needed, detail Drizzle ORM schema migrations, `db-helpers.ts` function signatures, and error handling strategies
3. **Task Phase** — Break spec into implementable tasks:
   - Drizzle schema migration (DROP `toolName`/`toolResult`, ADD `message_data`)
   - DB helpers (`saveMessage`, `getMessagesByChat`)
   - Backend endpoints (GET, POST with validation)
   - Frontend ChatArea/ChatLayout refactor
4. **Apply Phase** — Implement per task phase
5. **Verify Phase** — Run typecheck, lint, and manual smoke test (reload chat, verify persistence)

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Tool call metadata mismatch on reload | Low | High — broken conversation | Spec requires complete UIMessage round-trip; validate in smoke test |
| `onFinish` callback doesn't fire (network error) | Medium | Medium — message lost for that turn | Accepted for MVP; user sees error and can resend |
| JSON deserialization corrupts data | Low | Medium — partial message corruption | Spec requires deserialization validation; skip/warn on invalid rows |
| Rapid retry of `onFinish` before DB acknowledges | Low | Low — UPSERT prevents duplicates | Spec requires UPSERT by `message.id` as deduplication strategy |
| Large chat (1000+ messages) causes performance issues | Low | Low | SQLite local, no network bottleneck; optimize if observed later |
| AI SDK v7 changes `UIMessage` structure | Low | Medium — schema migration needed | Spec notes: no versioning; manual migration when needed |

### Skill Resolution

**Skill Used:** `ai-sdk` (SDD spec executor phase skill)  
**Resolution:** `none` — No specialized skill loading required; proposal context was sufficient.

**Assumptions Made:**
- AI SDK v6.0.198 `UIMessage` structure is stable for this MVP (no v7 changes mid-cycle)
- `UIMessage` is a POJO (plain JavaScript object) and safe to `JSON.stringify` without data loss
- Drizzle ORM will be used for all DB operations (per project guidelines)
- TypeScript strict mode is enforced (no `any` types per AGENTS.md)

---

### Review Gate (Interactive Mode)

✋ **Paused for review.** The spec is complete and ready for stakeholder approval before proceeding to Design/Task phase.

**Before approving, consider:**
- [ ] Does the schema migration path (DROP old columns, ADD `message_data`) match your Drizzle workflow?
- [ ] Are the API response shapes (200/400/404) acceptable for the frontend integration?
- [ ] Is the UPSERT-by-`message.id` deduplication strategy sound for your use case?
- [ ] Should we add pagination support now, or is "load all" acceptable for MVP?

**Next Command:** Type `continue` or `dale` to proceed to Design phase, or provide feedback to revise the spec.