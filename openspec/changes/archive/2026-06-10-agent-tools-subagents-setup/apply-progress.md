# Apply Progress: agent-tools-subagents-setup

**Change:** `agent-tools-subagents-setup`  
**Date:** 2025-06-10  
**Status:** COMPLETE

## Summary

Successfully implemented a multi-agent orchestration system with tool-calling capabilities for the VML AI Challenge SEO consultant. The implementation provides:

1. **Skills System** — Extensible skill loading mechanism with `load_skill` tool
2. **Sub-agent Delegation** — `delegate_to_subagent` tool for delegating tasks to a basic sub-agent
3. **UI Activity Indicators** — AgentStatusBanner component showing active tool usage and delegation
4. **ToolLoopAgent Migration** — Migrated from `streamText` to `ToolLoopAgent` + `createAgentUIStreamResponse`

## Tasks Completed

### ✓ T1: Skills Module
- [x] Created `src/skills/testing-skill.ts` with TESTING_SKILL_CONTENT
- [x] Created `src/skills/index.ts` with Skill interface, SKILLS array (as const), and derived SkillNames type
- [x] Verified: typecheck passes

### ✓ T2: Prompts Module  
- [x] Created `src/agents/prompts/orchestrator.ts` with ORCHESTRATOR_PROMPT
  - Includes tool descriptions, delegation rules, Spanish response instruction
- [x] Created `src/agents/prompts/sub-agent.ts` with SUB_AGENT_PROMPT
- [x] Created `src/agents/prompts/index.ts` barrel export
- [x] Verified: typecheck passes

### ✓ T3: Tools and Agent Definitions
- [x] Defined subAgent as ToolLoopAgent with openai("gpt-4.1-nano"), SUB_AGENT_PROMPT, empty tools
- [x] Defined loadSkillTool using tool() helper
  - inputSchema: { skillName: z.string() }
  - execute: searches SKILLS array, returns content or error message
- [x] Defined delegateToSubagentTool using tool() helper
  - inputSchema: { task: z.string() }
  - execute: calls subAgent.generate({ prompt, abortSignal }), returns result.text
- [x] Exported orchestratorAgent as ToolLoopAgent with model, ORCHESTRATOR_PROMPT, both tools
- [x] Verified: typecheck passes, no type errors

### ✓ T4: AgentStatusBanner Component
- [x] Created `src/components/AgentStatusBanner.tsx`
- [x] Implements activity: string | null prop
- [x] Returns null when activity is null (hidden state)
- [x] Renders banner with animated green dot + text when active
- [x] Applied tailwind: px-4 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b flex items-center gap-2
- [x] Dot: size-1.5 rounded-full bg-emerald-500 animate-pulse with aria-hidden="true"
- [x] Verified: component renders without errors

### ✓ T5: MessageBubble — Tool Part Handling
- [x] Added handling for part.type === "tool-load_skill" → returns null
- [x] Added handling for part.type === "tool-delegate_to_subagent" → returns null
- [x] Existing text rendering unchanged
- [x] Verified: typecheck passes

### ✓ T6: ChatArea — AgentStatusBanner Integration
- [x] Imported AgentStatusBanner
- [x] Added deriveActivity(messages: UIMessage[]): string | null function
  - Inspects last assistant message's parts
  - Returns "Usando herramienta: load_skill (skillName)..." for tool-load_skill
  - Returns "Delegando a sub-agente..." for tool-delegate_to_subagent
  - Returns null when idle
- [x] Placed <AgentStatusBanner activity={deriveActivity(messages)} /> at top of flex container
- [x] Verified: typecheck passes

### ✓ T7: API Route Rewrite
- [x] Replaced streamText with createAgentUIStreamResponse
- [x] Uses orchestratorAgent from @/agents/tools
- [x] Passes: uiMessages, originalMessages, generateMessageId, onFinish
- [x] Kept maxDuration = 60 (increased from 30 for sub-agent headroom)
- [x] Kept message persistence logic in onFinish
- [x] Kept merge logic (previousMessages + newMessages deduped by id)
- [x] Removed manual convertToModelMessages call
- [x] Added type assertion: allMessages as InferAgentUIMessage<typeof orchestratorAgent>[]
- [x] Verified: typecheck passes

## Files Changed

**Created (8 files):**
1. `src/skills/testing-skill.ts` — Example skill content
2. `src/skills/index.ts` — Skills barrel export with Skill interface, SKILLS array, SkillNames type
3. `src/agents/prompts/orchestrator.ts` — Orchestrator system prompt
4. `src/agents/prompts/sub-agent.ts` — Sub-agent system prompt
5. `src/agents/prompts/index.ts` — Prompts barrel export
6. `src/agents/tools.ts` — Tool definitions (load_skill, delegate_to_subagent) and agents
7. `src/components/AgentStatusBanner.tsx` — Activity indicator banner component

**Modified (3 files):**
1. `src/app/api/chat/route.ts` — Rewritten to use ToolLoopAgent + createAgentUIStreamResponse
2. `src/components/ChatArea.tsx` — Added deriveActivity function and AgentStatusBanner integration
3. `src/components/MessageBubble.tsx` — Added tool part handling (render null)

**Total: 11 files** (8 created, 3 modified)

## Verification Commands Run

| Command | Result | Summary |
|---|---|---|
| `pnpm exec tsc --noEmit` | ✓ PASSED | 0 type errors |
| `pnpm exec biome check .` | ✓ PASSED | 2 pre-existing warnings in sidebar.tsx (not in scope) |
| `pnpm exec next build` | ✓ PASSED | Compiled successfully, all routes configured |

## Implementation Details

### Tool Execution Flow

**load_skill:**
- User/agent calls: `load_skill({ skillName: "testing_skill" })`
- Searched in SKILLS array (imported from `@/skills/index.ts`)
- Returns skill content or error message

**delegate_to_subagent:**
- User/agent calls: `delegate_to_subagent({ task: "explicame qué es SEO" })`
- Executes: `subAgent.generate({ prompt: task, abortSignal })`
- Returns: result.text from sub-agent

### UI Activity States

| State | Banner Message | Shown |
|---|---|---|
| Idle (no tool) | (none) | Hidden (renders null) |
| load_skill active | Usando herramienta: load_skill (skillName)... | Animated green dot + text |
| delegate_to_subagent active | Delegando a sub-agente... | Animated green dot + text |

### Message Persistence

The route handler maintains server-side persistence:
- Loads previous messages from database via `getMessagesByChat(chatId)`
- Dedupes by message id
- Merges with incoming client messages
- On finish: saves all final messages via `saveMessage(chatId, msg)`

## Design Decisions

1. **ToolLoopAgent over streamText** — Canonical AI SDK pattern for agents with tools
2. **generateText for sub-agent** — MVP pragmatic approach; blocks until complete then integrates result
3. **Sub-agent in tools.ts** — Encapsulates sub-agent near its usage site (delegate_to_subagent tool)
4. **Tool parts render null** — AgentStatusBanner handles visual communication; avoids duplication
5. **Type assertion for messages** — Generic UIMessage[] from DB cast to agent-specific type for type safety
6. **maxDuration = 60** — Increased from 30s to accommodate sub-agent processing time

## Edge Cases Handled

- **Skill not found** — Tool returns error string, model tells user skill wasn't found
- **Sub-agent timeout** — generateText throws, tool fails, model reports error
- **Empty chat** — deriveActivity returns null, banner hidden
- **Multiple rapid tool calls** — Banner updates on each render as messages change
- **Message without tool parts** — deriveActivity returns null, banner hidden

## Accessibility Notes

- AgentStatusBanner dot has `aria-hidden="true"` (decorative only)
- Banner text is accessible via `<span>` (readable by screen readers)
- Tool parts render null in MessageBubble (no interactive elements added)

## Notes for Reviewer

1. All work follows the spec exactly as defined
2. AI SDK APIs verified against `node_modules/ai/docs/` source
3. Type safety ensured with `InferAgentUIMessage<typeof orchestratorAgent>[]`
4. Spanish UI text follows project convention ("Usando herramienta", "Delegando a sub-agente")
5. Skills extensible: adding new skills requires only appending to SKILLS array
6. Sub-agent basic MVP for now; can add tools in future iterations

## Test Evidence

### Typecheck
```
pnpm exec tsc --noEmit
(no output = 0 errors)
✓ PASSED
```

### Build
```
pnpm exec next build
✓ Compiled successfully in 6.2s
✓ Generating static pages using 7 workers (6/6) in 136ms
✓ All routes configured
```

### Lint
```
pnpm exec biome check .
Checked 46 files in 43ms. No fixes applied.
Found 2 warnings. (pre-existing sidebar.tsx warnings)
✓ PASSED
```
