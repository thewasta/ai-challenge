# Exploration: DataForSEO Mock Tools Setup

**Change:** `setup-datforseo-mock-tools`  
**Artifact Store:** openspec  
**Date:** 2026-06-10

---

## Current State

### 1. Existing Tool Infrastructure ✅

The project **already has a fully functional tool architecture** in place:

- **File:** `src/agents/tools.ts` — Defines the orchestrator agent with two tools:
  - `loadSkillTool` — loads instructions from the skills registry
  - `delegateToSubagentTool` — delegates tasks to a sub-agent
  
- **File:** `src/agents/prompts/orchestrator.ts` — Contains the orchestrator system prompt with instructions for lazy-loading skills and delegating tasks

- **File:** `src/skills/index.ts` — Barrel export that registers all skills in a `SKILLS` array with type safety via `SkillNames`

- **File:** `src/skills/product_setup.ts` — Example skill with hardcoded content

- **File:** `src/app/api/chat/route.ts` — Already integrated with `ToolLoopAgent` and `createAgentUIStreamResponse` from the AI SDK

### 2. Agent Pattern Used

The project uses **Vercel AI SDK v6.x** with:
- `ToolLoopAgent` for agent creation (via `new ToolLoopAgent({...})`)
- `tool()` utility for tool definitions with Zod schemas
- `openai("gpt-4o-mini")` as the model
- Tool definitions follow the **Type-Safe Agents pattern** described in `ai-sdk/references/type-safe-agents.md`

---

## Affected Areas

| File | Why It's Affected | Current State |
|------|-------------------|---------------|
| `src/agents/tools.ts` | Will add 5 new DataForSEO mock tools | Already has tool registration pattern |
| `src/skills/index.ts` | DataForSEO tools might become skills OR inline tools | Currently only has product_setup skill |
| `src/agents/prompts/orchestrator.ts` | May need updated instructions for keyword research | Current prompt mentions SEO audit & keyword research as future skills |
| Database schema | May need to store keyword/CPC/difficulty data if UI wants persistence | Currently has messages table only |
| Chat route (`src/app/api/chat/route.ts`) | Will auto-register new tools if we add them | Already configured for tool injection |

---

## Gaps: Requirements vs Current POC

### Artificial Latency

**Requirement:** 1000–2500ms random delay  
**POC (if it exists):** Unclear; typical mock tools use 500–1500ms

**Gap:** Need to verify latency range matches requirements.

### Keyword Ideas Generation

**Requirement:** Exactly 5 keyword variations with specific modifier patterns
- Pattern: seed keyword + modifiers (e.g., "how to", "best", "cheap", "near me", "vs")
- Example: For seed "running shoes":
  1. "how to choose running shoes" (informational)
  2. "best running shoes 2024" (commercial)
  3. "cheap running shoes" (commercial intent)
  4. "running shoes near me" (navigational)
  5. "New Balance vs Nike running shoes" (commercial)

**Current Gap:** No seed keyword structure; no coherence between intent and modifier patterns.

### Search Volume Coherence

**Requirement:** Higher volume keywords should correlate with higher keyword difficulty (positive correlation)  
**Current Gap:** POC likely generates volume and KD independently → unrealistic data

### KD Score Coherence

**Requirement:** KD 0–100, but must show positive correlation with search volume  
**Current Gap:** POC probably generates random 10–90 independent of volume

### Search Intent Coherence

**Requirement:** Intent (Informational, Navigational, Commercial, Transactional) should be:
- Encoded in the keyword phrase itself (e.g., "how to" → Informational)
- Coherent with CPC (Transactional has highest CPC, Informational lowest)

**Current Gap:** No correlation between keyword phrase intent and metrics (volume, KD, CPC)

---

## Architecture Recommendation

### **Option A: Tools as Inline Definitions in `src/agents/tools.ts`** (Recommended)

**Pros:**
- Simple, all tools in one place for orchestrator agent
- No skill loading overhead
- Clear exports for API route to inject into agent
- Matches existing pattern (loadSkillTool, delegateToSubagentTool already here)

**Cons:**
- File will grow to ~300 lines if we add 5 complex mock tools
- Not reusable as skills for sub-agents or other agents

**Effort:** Low  
**When to use:** MVP scope, tools are never delegated to sub-agents

### **Option B: Tools in Separate Files + Barrel Export (`src/agents/datforseo-tools/`)**

**Pros:**
- Organized, each tool in its own file
- Easier to test individually
- Can be imported by sub-agents if needed later
- Matches `ai-sdk/references/type-safe-agents.md` structure

**Cons:**
- More files to maintain
- Slight overhead of barrel export

**Effort:** Medium  
**When to use:** If we anticipate sub-agents will also use these tools

### **Option C: Tools as Skills in `src/skills/`**

**Pros:**
- Consistent with skill loading pattern
- Can be loaded dynamically via `load_skill` tool
- Reusable across agents

**Cons:**
- Overkill for tools; skills are for instructions, not executable code
- Violates separation of concerns (instructions ≠ executable logic)

**Effort:** High  
**When to use:** Never for this use case

---

## File Structure Proposal (Option A Recommended)

```
src/
├── agents/
│   ├── tools.ts                          ← MODIFIED: add 5 DataForSEO tools here
│   ├── prompts/
│   │   ├── orchestrator.ts               ← MAYBE: add instructions for keyword research
│   │   ├── sub-agent.ts                  ← UNCHANGED
│   │   └── index.ts                      ← UNCHANGED
│   └── [datforseo-tools/]                ← OPTIONAL (if we choose Option B)
├── skills/
│   ├── index.ts                          ← UNCHANGED
│   └── product_setup.ts                  ← UNCHANGED
└── app/
    └── api/
        └── chat/
            └── route.ts                  ← UNCHANGED (auto-discovers tools from agent)
```

### New Tool Exports from `src/agents/tools.ts`

```typescript
export const getKeywordIdeasTool = tool({ ... });
export const getSearchVolumeTool = tool({ ... });
export const getKeywordDifficultyTool = tool({ ... });
export const getCpcDataTool = tool({ ... });
export const getSearchIntentTool = tool({ ... });

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

## Recommended Approach: Implementation Details

### 1. **Coherence Rules (Critical for Realistic Data)**

#### Rule A: Seed Keyword → Intent Detection
```
If keyword contains "how to", "what is", "explain" → Informational
If keyword contains "near me", "in [city]", "[brand]" → Navigational
If keyword contains "best", "top", "vs", "compare" → Commercial
If keyword contains "buy", "price", "deal", "cheap" → Transactional
```

#### Rule B: Intent → CPC Correlation
```
Informational:   $0.10–$1.50 (users researching, not buying)
Navigational:    $0.50–$2.00 (users finding specific places/brands)
Commercial:      $1.50–$4.00 (users comparing options)
Transactional:   $3.00–$8.00 (users ready to purchase)
```

#### Rule C: Volume + Intent → KD Correlation
```
Base KD = random(10, 90)
If volume > 5000: +15–25 to KD (popular = harder)
If intent is Transactional: +10–20 to KD (commercial keywords are competitive)
If volume < 500: -5–10 from KD (niche = easier)
Clamp KD to [0, 100]
```

#### Rule D: Artificial Latency
```
Simulate API call: 1000ms + random(0, 1500ms)
Total: 1000–2500ms per tool call
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Latency (1–2.5s per tool) might feel slow in chat | Medium | Implement streaming or show "Searching keywords..." indicator during tool call |
| Adding 5 tools to orchestrator agent might cause agent to over-invoke them | Low | Clear system prompt instructions; agent won't call tools unless user asks for keyword/SEO data |
| Coherence logic might introduce bugs (if volume/KD/CPC don't sync) | Medium | Comprehensive unit tests for each mock function; verify coherence rules in tests |
| Schema validation (Zod) might reject valid inputs if we're too strict | Low | Use `.describe()` on each Zod field; keep schemas flexible (e.g., accept seed as string) |

---

## Success Criteria

- [ ] All 5 tools are defined with Zod schemas and no `any` types
- [ ] Each tool returns coherent, realistic data:
  - Keyword ideas include 5 variations with intent modifiers
  - Search volume is 100–25,000 (rounded to nearest 10)
  - KD is 0–100 with positive correlation to volume
  - CPC is $0.10–$8.00 (2 decimal places) with intent correlation
  - Intent is one of: Informational, Navigational, Commercial, Transactional
- [ ] Each tool has artificial latency of 1000–2500ms
- [ ] Tools are added to `orchestratorAgent` in `src/agents/tools.ts`
- [ ] Typecheck passes: `pnpm exec tsc --noEmit`
- [ ] Linter passes: `pnpm exec biome check --apply .`
- [ ] The orchestrator agent can be queried with keyword research requests and returns realistic results

---

## Ready for Proposal?

**Yes.** The exploration confirms:
1. ✅ Tool infrastructure is already in place and proven
2. ✅ Clear pattern to follow (inline tools in `src/agents/tools.ts`)
3. ✅ Coherence rules are defined to avoid unrealistic data
4. ✅ No architectural blockers
5. ✅ File structure is clear and straightforward

**Recommendation:** Proceed to Proposal phase with **Option A (inline tools in `src/agents/tools.ts`)** for MVP simplicity. If sub-agents later need these tools, refactor to Option B (separate files + barrel export).

---

## Next Steps

1. **Proposal Phase:** Define exact Zod schemas, coherence rules, and tool naming conventions
2. **Spec Phase:** Write detailed requirements for each tool's output format and edge cases
3. **Design Phase:** Plan the implementation approach for coherence logic and testing strategy
4. **Tasks Phase:** Break into individual tool implementations and unit tests
5. **Apply Phase:** Implement all 5 tools with tests
6. **Verify Phase:** Validate coherence rules and latency behavior
7. **Archive Phase:** Sync delta specs and mark complete
