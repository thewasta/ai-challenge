# Exploration: project-profile-gate

## Current State

### The SOFT Gate (Today)
The orchestrator prompt (`src/agents/prompts/orchestrator.ts`) implements a SOFT gate via instructions:
1. It ALWAYS calls `get_project_overview()` to check project context
2. If the result is empty (new project), it calls `load_skill(skill_name="product_setup")`
3. However, this is a **suggestion**, not an enforcement:
   - If a user sends a casual message like "hola", the LLM might respond or delegate instead of blocking
   - The orchestrator can be diverted to SEO work via direct user prompts (e.g., "analiza mis palabras clave")
   - No API-level gate exists — the chat route doesn't validate profile completeness

### Project Profile Structure
From `src/db/schema.ts`, a project has:
```typescript
buyerPersona: text("buyer_persona").notNull().default("")
competitors: text("competitors").notNull().default("")
brandContext: text("brand_context").notNull().default("{}")
```

The **product_setup skill** (`src/skills/product_setup.ts`) guides users through onboarding but does NOT explicitly mark completion. It just calls `set_project_overview()` to save the markdown context into the database fields.

### Current Tools
- **`get_project_overview(projectId)`**: Returns all fields as JSON. Returns "Error: Project not found" if project doesn't exist.
- **`set_project_overview(projectId, fields)`**: Partially updates fields. No validation of "completeness".
- Both are created inside `createOrchestratorAgent()` and scoped to a specific projectId.

### Current Gaps
1. **No definition of "complete profile"**: What fields must be non-empty? Just `buyerPersona` and `competitors`? Or all of them?
2. **No explicit completion flag**: Profile could be partially filled; there's no way to know if setup is truly done.
3. **No API-level gate**: The chat route doesn't check profile completeness before accepting messages.
4. **Soft enforcement only**: The orchestrator prompt suggests loading product_setup, but can be ignored by user input.

---

## Affected Areas

- **`src/agents/prompts/orchestrator.ts`** — Currently evaluates context but doesn't block; needs HARD gate logic
- **`src/agents/tools.ts`** — `get_project_overview` and `set_project_overview` tools; may need a new `check_profile_complete` tool
- **`src/app/api/chat/route.ts`** — Chat route accepts messages without profile validation; needs to reject incomplete profiles
- **`src/db/schema.ts`** — Schema is fine, but may add optional `profileComplete: boolean` flag or compute completeness
- **`src/lib/db-helpers.ts`** — May need a helper function `isProfileComplete(projectId)` to check completeness consistently
- **`src/skills/product_setup.ts`** — Skill should explicitly signal completion (via `set_project_overview` with a flag or marker)
- **`src/components/ChatInput.tsx`** — Could optionally disable input client-side if profile is incomplete (UX enhancement)

---

## Approaches

### Approach 1: Orchestrator-Only Gate (Instruction-Based)
Enhance the orchestrator prompt to treat incomplete profile as a HARD gate:
- When `get_project_overview` shows empty `buyerPersona` or `competitors`, the orchestrator REFUSES all non-setup requests
- Block ALL user input until profile is complete — even casual greetings like "hola"
- Rely on LLM instruction compliance (risky with smaller models like gpt-4o-mini)

**Pros:**
- Single point of change (just the prompt)
- No schema changes needed
- Works without API layer modifications

**Cons:**
- LLM compliance is probabilistic, not deterministic (gpt-4o-mini may not always follow)
- User can potentially bypass with creative prompts
- No server-side validation — vulnerable if client sends raw requests
- "Incomplete" criteria not explicit or validated

**Effort:** Low

---

### Approach 2: API Route + Hard Gate (Recommended)
Add a check in `src/app/api/chat/route.ts` before the orchestrator is invoked:
1. Extract `projectId` from the chat
2. Call `isProfileComplete(projectId)` — a new helper that checks if `buyerPersona` AND `competitors` are non-empty
3. If incomplete, return a 400 or 403 error with a message like: *"Profile incomplete. Please complete buyer persona and competitors before proceeding."*
4. Only let complete profiles reach the orchestrator

Define "complete" as:
- `buyerPersona` is not empty and not default
- `competitors` is not empty and not default
- All other fields are optional

**Pros:**
- Hard gate at the API layer — cannot be bypassed
- Clear, testable logic
- Works regardless of LLM behavior
- User gets immediate feedback on why they're blocked

**Cons:**
- Requires API route change
- Need to handle error response on client (currently just POSTs messages)
- Slightly more latency (extra DB query, but negligible)

**Effort:** Medium

---

### Approach 3: Hybrid (API Gate + Orchestrator Enforcement)
Combine both approaches:
1. API route rejects incomplete profiles with clear error
2. Orchestrator prompt is also hardened to refuse non-setup work if profile is incomplete (defensive)
3. Add optional `profileComplete` boolean flag to schema for faster checks (optional optimization)

**Pros:**
- Defense in depth
- API-level enforcement is bulletproof
- Orchestrator also acts as fallback (guards against LLM model changes)
- Clear, auditable profile state

**Cons:**
- More code changes
- Schema migration required for the flag
- Slight complexity in maintaining two checks

**Effort:** High

---

## Recommendation

**Approach 2 + Orchestrator Hardening** (Hybrid, but leaning on API as primary)

Here's why:
1. **API gate is non-negotiable** — FR-1 says "restrict the start of chat", which means server-side enforcement is required
2. **Orchestrator hardening is insurance** — Adds a second layer so the system fails safely even if API gate somehow passes
3. **Clear completeness definition** — `buyerPersona` AND `competitors` must both be non-empty strings

### Implementation Plan
1. Create `isProfileComplete(projectId: number): Promise<boolean>` in `src/lib/db-helpers.ts`
2. Add check in `src/app/api/chat/route.ts` — before calling `createOrchestratorAgent()`, verify profile is complete
3. Return clear error response if incomplete (status 400 + JSON: `{ error: "Profile incomplete", details: "..." }`)
4. Update orchestrator prompt to add a secondary check and refuse non-setup requests if profile is incomplete
5. Consider UX: on client, handle the 400 error and show a modal or redirect to onboarding

### What Counts as "Complete"
- `buyerPersona` is not empty string AND not the default ""
- `competitors` is not empty string AND not the default ""
- Other fields (`brandContext`, `description`) are optional for MVP

### What the Orchestrator Should Do (if profile is still incomplete)
- Refuse to execute any SEO/consulting tools
- Only allow `load_skill(product_setup)` and `set_project_overview` calls
- Prompt user: *"Tu perfil aún no está completo. Por favor, completa tu buyer persona y competidores antes de iniciar con análisis SEO."*

---

## Risks

- **UX disruption**: User trying to chat before setup is blocked with an API error. Need good error messaging on client.
- **False positives**: If profile check is too strict, legitimate users might be locked out (mitigate by clear completeness criteria)
- **Client-side bypass**: If client doesn't properly handle 400 error, user might see confusing state. Must handle gracefully.
- **LLM drift**: If LLM doesn't comply with orchestrator hardening, API gate alone has to catch it (should be fine)
- **Migration complexity**: If we add a schema flag, need to handle existing records (can use `CASE` in queries)

---

## Ready for Proposal

**Yes.** The exploration has identified:
1. ✅ Exact problem: SOFT gate vs required HARD gate
2. ✅ Clear definition of "complete profile": `buyerPersona` + `competitors` non-empty
3. ✅ Recommended approach: API route + orchestrator hardening
4. ✅ Files affected: 3-4 files (db-helpers, chat route, orchestrator prompt, optional schema)
5. ✅ Low-medium effort, clear implementation path

The orchestrator should tell the user: **"FR-1 requires a hard gate in the chat API. When a profile's buyer persona and competitors are empty, the system refuses to process any chat messages. This is enforced at the API layer and backed by orchestrator instructions."**
