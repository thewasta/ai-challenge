# Tasks: Agent Tools & Sub-Agents Setup

**Change:** `agent-tools-subagents-setup`  
**Based on:** [spec](../specs/agent-tools-subagents-setup.md) | [design](../designs/agent-tools-subagents-setup.md)

---

## Dependency Graph

```
T1 (skills) ──┐
              ├──► T3 (tools + agents) ──► T7 (API route)
T2 (prompts) ─┘

T4 (AgentStatusBanner) ──► T6 (ChatArea)

T5 (MessageBubble) ── independent
```

**Parallelizable pairs:** T1+T2, T4+T5

---

## Task List

### T1: Create skills module

**Files:**
- `src/skills/testing-skill.ts` (NEW)
- `src/skills/index.ts` (NEW)

- [x] Create `src/skills/testing-skill.ts` with `TESTING_SKILL_CONTENT` constant
- [x] Create `src/skills/index.ts` with `Skill` interface, `SKILLS` array (`as const`), and `SkillNames` derived type
- [x] Verify: `pnpm exec tsc --noEmit` — no errors in new files

### T2: Create prompts module

**Files:**
- `src/agents/prompts/orchestrator.ts` (NEW)
- `src/agents/prompts/sub-agent.ts` (NEW)
- `src/agents/prompts/index.ts` (NEW)

- [x] Create `orchestrator.ts` with `ORCHESTRATOR_PROMPT` — includes delegation rule, tool descriptions, Spanish response instruction
- [x] Create `sub-agent.ts` with `SUB_AGENT_PROMPT` — basic agent, Spanish, summary instruction
- [x] Create `index.ts` barrel export
- [x] Verify: `pnpm exec tsc --noEmit` — no errors

### T3: Create tools and agent definitions

**Files:**
- `src/agents/tools.ts` (NEW)

**Depends on:** T1, T2

- [x] Define `subAgent` as `ToolLoopAgent` with `openai("gpt-4o-mini")`, `SUB_AGENT_PROMPT`, empty tools *(model upgraded from nano for better tool calling)*
- [x] Define `loadSkillTool` using `tool()` — `inputSchema` with `skillName: z.string()`, `execute` searches `SKILLS` array
- [x] Define `delegateToSubagentTool` using `tool()` — `inputSchema` with `task: z.string()`, `execute` calls `subAgent.generate()`
- [x] Export `orchestratorAgent` as `ToolLoopAgent` with model, `ORCHESTRATOR_PROMPT`, both tools
- [x] Verify: `pnpm exec tsc --noEmit` — no type errors in tools.ts

### T4: Create AgentStatusBanner component

**Files:**
- `src/components/AgentStatusBanner.tsx` (NEW)

- [x] Create component with `activity: string | null` prop
- [x] Return `null` when `activity` is null
- [x] Render banner with animated green dot + activity text when active
- [x] Apply tailwind classes: `px-4 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b flex items-center gap-2`
- [x] Dot: `size-1.5 rounded-full bg-emerald-500 animate-pulse` with `aria-hidden="true"`
- [x] Verify: component renders in isolation without errors

### T5: Modify MessageBubble — tool part handling

**Files:**
- `src/components/MessageBubble.tsx` (MODIFY)

- [x] Add handling for `part.type === "tool-load_skill"` → render `null`
- [x] Add handling for `part.type === "tool-delegate_to_subagent"` → render `null`
- [x] Existing text rendering unchanged
- [x] Verify: `pnpm exec tsc --noEmit` — no errors in MessageBubble.tsx

### T6: Modify ChatArea — integrate AgentStatusBanner

**Files:**
- `src/components/ChatArea.tsx` (MODIFY)

**Depends on:** T4

- [x] Import `AgentStatusBanner`
- [x] Add `deriveActivity(messages: UIMessage[]): string | null` function
- [x] Place `<AgentStatusBanner activity={deriveActivity(messages)} />` between top of flex container and `ScrollArea`
- [x] Verify: `pnpm exec tsc --noEmit` — no errors in ChatArea.tsx
- [x] Verify: `pnpm exec biome check .` — no lint errors

### T7: Rewrite API route with ToolLoopAgent

**Files:**
- `src/app/api/chat/route.ts` (REWRITE)

**Depends on:** T3

- [x] Replace `streamText` with `createAgentUIStreamResponse`
- [x] Use `orchestratorAgent` from `@/agents/tools`
- [x] Pass `uiMessages`, `originalMessages`, `generateMessageId`, `onFinish`
- [x] Keep `maxDuration = 60`
- [x] Keep message persistence logic in `onFinish`
- [x] Keep existing merge logic (previousMessages + newMessages deduped by id)
- [x] Remove manual `convertToModelMessages` call (handled internally)
- [x] Add `[delegate]` pre-processing fast path (beyond spec, pragmatic fix for small model tool-calling)
- [x] Verify: `pnpm exec tsc --noEmit` — no errors in route.ts

---

## Verification Gates

After ALL tasks are complete:

- [x] **Typecheck:** `pnpm exec tsc --noEmit` — 0 errors
- [x] **Lint:** `pnpm exec biome check .` — 0 errors (2 pre-existing warnings)
- [x] **Build:** `pnpm exec next build` — successful
- [x] **A11y:** `AgentStatusBanner` dot has `aria-hidden`, text is accessible
- [x] **Manual smoke test:**
  - [x] Send "Cargá la skill testing_skill" → banner shows tool activity, agent responds
  - [x] Send "[DELEGATE] explicame qué es SEO" → banner shows delegation, response from sub-agent
  - [x] Send normal message → no banner, normal streaming
