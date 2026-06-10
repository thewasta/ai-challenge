# Design: Setup DataForSEO Mock Tools

## Technical Approach

Add 5 mock tools inline in `src/agents/tools.ts` following the existing `tool()` pattern from Vercel AI SDK. Shared logic (intent detection, latency, KD/CPC generation) is extracted into private helpers in the same file to avoid duplication. All 5 tools are registered in `orchestratorAgent.tools`.

---

## Architecture Diagram

```
src/agents/tools.ts
│
├── [Types / Interfaces]
│   └── SearchIntent, IntentRange, ModifierPattern,
│       KeywordVolume, KeywordDifficulty, KeywordCpc,
│       KeywordIntent, KeywordIdea
│
├── [Private Helpers]
│   ├── simulateLatency()          → Promise<void>
│   ├── MODIFIER_PATTERNS          → ModifierPattern[]  (~20 entries)
│   ├── detectSearchIntent(kw)     → SearchIntent
│   ├── generateKeywordDifficulty() → number
│   └── generateCpc(intent)        → number
│
├── [Tool Definitions]
│   ├── getKeywordIdeasTool        ← uses MODIFIER_PATTERNS, simulateLatency
│   ├── getSearchVolumeTool        ← uses simulateLatency
│   ├── getKeywordDifficultyTool   ← uses generateKeywordDifficulty, simulateLatency
│   ├── getCpcDataTool             ← uses detectSearchIntent, generateCpc, simulateLatency
│   └── getSearchIntentTool        ← uses detectSearchIntent, simulateLatency
│
└── [orchestratorAgent]            ← registers all 7 tools
    ├── load_skill: loadSkillTool
    ├── delegate_to_subagent: delegateToSubagentTool
    ├── get_keyword_ideas: getKeywordIdeasTool
    ├── get_search_volume: getSearchVolumeTool
    ├── get_keyword_difficulty: getKeywordDifficultyTool
    ├── get_cpc_data: getCpcDataTool
    └── get_search_intent: getSearchIntentTool
```

---

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline helpers vs separate module | Separate module adds indirection for 5 tools; inline keeps file self-contained | **Inline** — file stays ~250 LOC, no extra module needed |
| `ModifierPattern.pattern` with `{keyword}` vs function | Function is more flexible but adds complexity | **String template** — simpler, declarative, easy to extend |
| Re-sample loop for intent diversity vs deterministic slot fill | Loop is simpler to read; deterministic is more predictable | **Deterministic slot fill** — select 1 modifier per intent, pick 1 bonus randomly; no unbounded loop |
| `zod` inline schema vs pre-declared schema const | Const adds names for reuse; inline is consistent with existing tools | **Inline** — matches `loadSkillTool` and `delegateToSubagentTool` pattern |

---

## Data Flow

### getKeywordIdeas
```
input.keyword
  → slot-fill: pick 1 modifier per intent (4 slots) + 1 random extra
  → apply each pattern: pattern.replace("{}", keyword)
  → shuffle result array
  → simulateLatency()
  → return { seed_keyword, ideas: string[5] }
```

### getSearchVolume
```
input.keywords[]
  → for each: Math.round(random(100, 25000) / 10) * 10
  → simulateLatency()
  → return { results: KeywordVolume[] }
```

### getKeywordDifficulty
```
input.keywords[]
  → for each: generateKeywordDifficulty()
      70% → random(50, 90)
      30% → random(10, 49)
      clamp to [0, 100]
  → simulateLatency()
  → return { results: KeywordDifficulty[] }
```

### getCpcData
```
input.keywords[]
  → for each:
      intent = detectSearchIntent(keyword)
      cpc = generateCpc(intent)
        → CPC_RANGES[intent]: random(min, max), toFixed(2)
  → simulateLatency()
  → return { results: KeywordCpc[] }
```

### getSearchIntent
```
input.keywords[]
  → for each: detectSearchIntent(keyword)
      scan ordered keyword lists per intent
      default → "Informational"
  → simulateLatency()
  → return { results: KeywordIntent[] }
```

---

## Interface Definitions

```typescript
type SearchIntent = "Informational" | "Navigational" | "Commercial" | "Transactional";

interface IntentRange { min: number; max: number }

interface ModifierPattern {
  pattern: string;   // e.g. "comprar {}" — {} is replaced with the seed keyword
  intent: SearchIntent;
}

interface KeywordVolume     { keyword: string; search_volume: number }
interface KeywordDifficulty { keyword: string; keyword_difficulty: number }
interface KeywordCpc        { keyword: string; cpc: number }
interface KeywordIntent     { keyword: string; search_intent: SearchIntent }
interface KeywordIdea       { seed_keyword: string; ideas: string[] }
```

---

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `simulateLatency()` | Returns `Promise<void>` that resolves after `1000 + random(0, 1500)` ms |
| `MODIFIER_PATTERNS` | Constant array of ~20 `ModifierPattern` objects covering all 4 intents |
| `detectSearchIntent(kw)` | String scan in priority order: Transactional → Navigational → Commercial → Informational; returns `SearchIntent` |
| `generateKeywordDifficulty()` | Weighted random: 70% → [50,90], 30% → [10,49]; clamped to [0,100] |
| `generateCpc(intent)` | Reads `CPC_RANGES[intent]`, returns `parseFloat(random(min,max).toFixed(2))` |
| `getKeywordIdeasTool` | Slot-fill modifier selection (1 per intent + 1 random); validates ≥2 char input |
| `getSearchVolumeTool` | Generates independent volumes per keyword; rounds to nearest 10 |
| `getKeywordDifficultyTool` | Maps keyword array through `generateKeywordDifficulty` |
| `getCpcDataTool` | Chains `detectSearchIntent` → `generateCpc` per keyword |
| `getSearchIntentTool` | Maps keyword array through `detectSearchIntent` |

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/agents/tools.ts` | Modify | Add types, helpers, 5 tool definitions, and update `orchestratorAgent.tools` |

No other files change.

---

## Registration Pattern

```typescript
// Follows existing pattern — snake_case keys, PascalCase exports
export const orchestratorAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: ORCHESTRATOR_PROMPT,
  tools: {
    load_skill: loadSkillTool,
    delegate_to_subagent: delegateToSubagentTool,
    get_keyword_ideas: getKeywordIdeasTool,
    get_search_volume: getSearchVolumeTool,
    get_keyword_difficulty: getKeywordDifficultyTool,
    get_cpc_data: getCpcDataTool,
    get_search_intent: getSearchIntentTool,
  },
});
```

---

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `detectSearchIntent` classification | Pure function — input/output assertions |
| Unit | `generateKeywordDifficulty` distribution | Call 100×, assert ~70% in [50,90] |
| Unit | `generateCpc` range by intent | Assert output is within intent range |
| Unit | `getKeywordIdeas` diversity | Assert 5 ideas, ≥3 distinct intents |
| Integration | Tool execution via `orchestratorAgent` | Not required for MVP |

---

## Migration / Rollout

No migration required. New tools are additive — existing `load_skill` and `delegate_to_subagent` are unchanged.

---

## Open Questions

- None
