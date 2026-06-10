# Tasks: Setup DataForSEO Mock Tools

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 220–260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR to main |
| Delivery strategy | ask-always |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

---

## Phase 1: Types & Interfaces

- [x] 1.1 Add `SearchIntent` type union (4 values: Informational, Navigational, Commercial, Transactional)
- [x] 1.2 Add `IntentRange` interface with `min` and `max` number fields
- [x] 1.3 Add `ModifierPattern` interface with `pattern: string` and `intent: SearchIntent`
- [x] 1.4 Add output interfaces: `KeywordVolume`, `KeywordDifficulty`, `KeywordCpc`, `KeywordIntent`, `KeywordIdea`

**Verification:** `pnpm exec tsc --noEmit` passes with no type errors

---

## Phase 2: Shared Helpers & Constants

- [x] 2.1 Add `simulateLatency()` helper that returns `Promise<void>` resolving after `1000 + random(0, 1500)` ms
- [x] 2.2 Add `MODIFIER_PATTERNS` constant with ~20 `ModifierPattern` entries across 4 intents (5 per intent: Transactional, Commercial, Informational, Navigational)
- [x] 2.3 Add `CPC_RANGES` constant mapping each `SearchIntent` to `{ min, max }` per spec table
- [x] 2.4 Add `detectSearchIntent(keyword: string)` helper — scan keyword for intent keywords in priority order (Transactional → Navigational → Commercial), default Informational
- [x] 2.5 Add `generateKeywordDifficulty()` helper — 70% random(50–90), 30% random(10–49), clamp to [0, 100]
- [x] 2.6 Add `generateCpc(intent: SearchIntent)` helper — random within `CPC_RANGES[intent]`, formatted to 2 decimals

**Verification:** `pnpm exec tsc --noEmit` passes; `pnpm exec @biomejs/biome check --apply .` passes

---

## Phase 3: Tool Definitions

### 3.1 getKeywordIdeas Tool
- [x] 3.1.1 Define `getKeywordIdeasTool` using `tool()` with description
- [x] 3.1.2 Add Zod schema: `z.object({ keyword: z.string().min(2) })`
- [x] 3.1.3 Implement execute: slot-fill 1 modifier per intent + 1 random (5 total), apply patterns, shuffle
- [x] 3.1.4 Call `simulateLatency()` before return
- [x] 3.1.5 Return `{ seed_keyword, ideas: string[5] }`

### 3.2 getSearchVolume Tool
- [x] 3.2.1 Define `getSearchVolumeTool` using `tool()` with description
- [x] 3.2.2 Add Zod schema: `z.object({ keywords: z.array(z.string()) })`
- [x] 3.2.3 Implement execute: for each keyword, generate volume `Math.round(random(100, 25000) / 10) * 10`
- [x] 3.2.4 Call `simulateLatency()` before return
- [x] 3.2.5 Return `{ results: Array<{ keyword, search_volume }> }`

### 3.3 getKeywordDifficulty Tool
- [x] 3.3.1 Define `getKeywordDifficultyTool` using `tool()` with description
- [x] 3.3.2 Add Zod schema: `z.object({ keywords: z.array(z.string()) })`
- [x] 3.3.3 Implement execute: for each keyword, generate KD via `generateKeywordDifficulty()`
- [x] 3.3.4 Call `simulateLatency()` before return
- [x] 3.3.5 Return `{ results: Array<{ keyword, keyword_difficulty }> }`

### 3.4 getCpcData Tool
- [x] 3.4.1 Define `getCpcDataTool` using `tool()` with description
- [x] 3.4.2 Add Zod schema: `z.object({ keywords: z.array(z.string()) })`
- [x] 3.4.3 Implement execute: for each keyword, detect intent → generate CPC via `generateCpc(intent)`
- [x] 3.4.4 Call `simulateLatency()` before return
- [x] 3.4.5 Return `{ results: Array<{ keyword, cpc: number }> }`

### 3.5 getSearchIntent Tool
- [x] 3.5.1 Define `getSearchIntentTool` using `tool()` with description
- [x] 3.5.2 Add Zod schema: `z.object({ keywords: z.array(z.string()) })`
- [x] 3.5.3 Implement execute: for each keyword, call `detectSearchIntent(keyword)`
- [x] 3.5.4 Call `simulateLatency()` before return
- [x] 3.5.5 Return `{ results: Array<{ keyword, search_intent: SearchIntent }> }`

**Verification:** `pnpm exec tsc --noEmit` passes; `pnpm exec @biomejs/biome check --apply .` passes

---

## Phase 4: Integration & Export

- [x] 4.1 Export all 5 tools: `getKeywordIdeasTool`, `getSearchVolumeTool`, `getKeywordDifficultyTool`, `getCpcDataTool`, `getSearchIntentTool`
- [x] 4.2 Update `orchestratorAgent.tools` object to register all 5 tools with snake_case keys: `get_keyword_ideas`, `get_search_volume`, `get_keyword_difficulty`, `get_cpc_data`, `get_search_intent`
- [x] 4.3 Verify all imports are present (no unused imports after cleanup)

**Verification:** `pnpm exec tsc --noEmit` passes; `pnpm exec @biomejs/biome check --apply .` passes

---

## Phase 5: Verification & Linting

- [x] 5.1 Run `pnpm exec tsc --noEmit` — ensure no type errors
- [x] 5.2 Run `pnpm exec @biomejs/biome check --apply .` — ensure formatting and linting pass
- [x] 5.3 Verify file compiles by importing in test context (no runtime errors)
- [x] 5.4 Spot-check: each tool returns correct shape per spec examples

**Verification:** All checks pass; file is ready for review

---

## Implementation Order

**Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5**

- **Phase 1** (Types): Foundation for all later code; must be first
- **Phase 2** (Helpers): Used by multiple tools; must complete before Phase 3
- **Phase 3** (Tools): Each tool independent once helpers exist; can parallelize within phase
- **Phase 4** (Integration): Final registration step after all tools defined
- **Phase 5** (Verification): Confirm build and lint pass before review

---

## Key Implementation Notes

1. **Modifier Patterns**: Use string template format `"pattern {}"` — replace `{}` with seed keyword
2. **Intent Detection**: Scan in priority order **Transactional → Navigational → Commercial** to avoid false positives (e.g., "comprar" triggers Transactional even if keyword also contains "mejores")
3. **Latency**: All tools MUST call `simulateLatency()` before returning (1000–2500ms artificial delay)
4. **KD Distribution**: Weighted random ensures 70% high-competition (50–90), 30% niche (10–49)
5. **CPC Coherence**: CPC range is intent-dependent — Transactional highest ($3–$8), Informational lowest ($0.10–$1.50)
6. **Zod Schemas**: All input validation must use Zod (no `any` types) per AGENTS.md
