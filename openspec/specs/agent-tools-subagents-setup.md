# Spec: Agent Tools & Sub-Agents Setup

**Change:** `agent-tools-subagents-setup`  
**Based on:** [proposal](../proposals/agent-tools-subagents-setup.md)  
**AI SDK pattern:** `ToolLoopAgent` + `createAgentUIStreamResponse` (verified against `node_modules/ai/docs/` and `node_modules/ai/src/`)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                           │
│  ChatArea → MessageBubble (parts renderer)                       │
│           → AgentStatusBanner (tool/delegate indicators)         │
│           → ChatInput                                             │
│  useChat()                                                        │
└──────────────────────────┬───────────────────────────────────────┘
                           │ POST /api/chat { messages, chatId }
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              API ROUTE (createAgentUIStreamResponse)              │
│  orchestratorAgent: ToolLoopAgent                                 │
│    model: openai("gpt-4.1-nano")                                 │
│    instructions: ORCHESTRATOR_PROMPT                              │
│    tools: { load_skill, delegate_to_subagent }                    │
│                                                                   │
│  delegate_to_subagent.execute()                                   │
│    └─► subAgent.generate({ prompt: task, abortSignal })           │
│         subAgent: ToolLoopAgent                                   │
│           model: openai("gpt-4.1-nano")                          │
│           instructions: SUB_AGENT_PROMPT                          │
│           tools: {}                                               │
└──────────────────────────────────────────────────────────────────┘
```

## 2. File Structure

```
src/
├── app/api/chat/route.ts          ← REWRITTEN: ToolLoopAgent + createAgentUIStreamResponse
├── components/
│   ├── ChatArea.tsx               ← MODIFIED: add AgentStatusBanner
│   ├── MessageBubble.tsx          ← MODIFIED: render tool parts
│   ├── AgentStatusBanner.tsx      ← NEW: activity indicator
│   └── ChatInput.tsx              ← UNCHANGED
├── skills/
│   ├── index.ts                   ← NEW: barrel export (SKILLS array + SkillNames type)
│   └── testing-skill.ts          ← NEW: example skill
└── agents/
    ├── prompts/
    │   ├── index.ts               ← NEW: barrel export
    │   ├── orchestrator.ts        ← NEW: system prompt for orchestrator
    │   └── sub-agent.ts           ← NEW: system prompt for basic sub-agent
    └── tools.ts                   ← NEW: tool definitions (load_skill, delegate_to_subagent)
```

## 3. Skills Module

### 3.1 `src/skills/testing-skill.ts`

```typescript
export const TESTING_SKILL_CONTENT = `
# Testing Skill

This is a test skill used to verify the skill loading mechanism.

## Instructions
- When loaded, confirm that the skill was retrieved successfully
- Use the information in this skill to assist the user
`;
```

### 3.2 `src/skills/index.ts`

```typescript
import { TESTING_SKILL_CONTENT } from "./testing-skill";

export interface Skill {
  name: string;
  content: string;
}

export const SKILLS: Skill[] = [
  { name: "testing_skill", content: TESTING_SKILL_CONTENT },
] as const;

export type SkillNames = (typeof SKILLS)[number]["name"];
```

**Contract:** Adding a new skill requires:
1. Creating a new file in `src/skills/`
2. Importing and adding to the `SKILLS` array in `index.ts`
3. `SkillNames` is derived automatically from the array via `as const`

## 4. Agent Prompts Module

### 4.1 `src/agents/prompts/orchestrator.ts`

```typescript
export const ORCHESTRATOR_PROMPT = `
You are an SEO and Digital Marketing consultant (Orchestrator Agent).

You have access to these tools:
- **load_skill**: Loads instructions for a specific skill. Use when the user asks about a capability.
- **delegate_to_subagent**: Delegates a task to a sub-agent for processing.

## Delegation Rule
If the user's message starts with [DELEGATE] (case-insensitive), you MUST use the delegate_to_subagent tool.
Extract the task from the message (everything after the [DELEGATE] tag) and pass it as the task parameter.
Present the sub-agent's response directly to the user without modification.

## General Behavior
- Respond in Spanish
- Be concise and professional
- When the user asks for specific skills, use load_skill first
`;
```

### 4.2 `src/agents/prompts/sub-agent.ts`

```typescript
export const SUB_AGENT_PROMPT = `
You are a general-purpose sub-agent. You execute tasks delegated to you by the main agent.

## Instructions
- Complete the assigned task autonomously
- Respond directly and concisely
- Do not ask follow-up questions — deliver the result
- Respond in Spanish
- IMPORTANT: Write a clear summary of your findings as your final response
`;
```

### 4.3 `src/agents/prompts/index.ts`

```typescript
export { ORCHESTRATOR_PROMPT } from "./orchestrator";
export { SUB_AGENT_PROMPT } from "./sub-agent";
```

## 5. Tools Definition

### 5.1 `src/agents/tools.ts`

All tools are defined in a single file for the orchestrator agent:

```typescript
import { tool, ToolLoopAgent, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { SKILLS } from "@/skills";
import { SUB_AGENT_PROMPT } from "@/agents/prompts";

// ── Sub-agent definition ──
const subAgent = new ToolLoopAgent({
  model: openai("gpt-4.1-nano"),
  instructions: SUB_AGENT_PROMPT,
  tools: {},
});

// ── Tool: load_skill ──
export const loadSkillTool = tool({
  description:
    "Loads the instructions for a specific skill. Use when the user asks about a particular capability.",
  inputSchema: z.object({
    skillName: z.string().describe("The name of the skill to load"),
  }),
  execute: async ({ skillName }) => {
    const skill = SKILLS.find((s) => s.name === skillName);
    if (!skill) {
      return `Error: Skill "${skillName}" not found. Available skills: ${SKILLS.map((s) => s.name).join(", ")}`;
    }
    return skill.content;
  },
});

// ── Tool: delegate_to_subagent ──
export const delegateToSubagentTool = tool({
  description:
    "Delegates a task to a sub-agent for processing. Use when the user's message starts with [DELEGATE].",
  inputSchema: z.object({
    task: z.string().describe("The task to delegate to the sub-agent"),
  }),
  execute: async ({ task }, { abortSignal }) => {
    const result = await subAgent.generate({
      prompt: task,
      abortSignal,
    });
    return result.text;
  },
});

// ── Orchestrator Agent ──
import { ORCHESTRATOR_PROMPT } from "@/agents/prompts";

export const orchestratorAgent = new ToolLoopAgent({
  model: openai("gpt-4.1-nano"),
  instructions: ORCHESTRATOR_PROMPT,
  tools: {
    load_skill: loadSkillTool,
    delegate_to_subagent: delegateToSubagentTool,
  },
});
```

**Design decisions (verified against AI SDK docs):**

| Decision | Rationale |
|---|---|
| `ToolLoopAgent` sobre `streamText` directo | Es el patrón canónico del AI SDK para agentes con tools. Maneja el loop tool→response automáticamente |
| `generateText` para sub-agent (sin streaming) | MVP pragmático. `generateText` bloquea hasta completar, luego el resultado se integra en la respuesta del orquestador |
| `subAgent` definido en `tools.ts` | Mantiene encapsulado el sub-agente junto a las tools que lo usan |
| `tools: {}` en sub-agent | Sub-agente básico sin tools propias por ahora |

## 6. API Route (REWRITTEN)

### 6.1 `src/app/api/chat/route.ts`

```typescript
import { createAgentUIStreamResponse, createIdGenerator } from "ai";
import { orchestratorAgent } from "@/agents/tools";
import { getMessagesByChat, saveMessage } from "@/lib/db-helpers";
import type { UIMessage } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: number } =
    await req.json();

  // Load previous messages from the database
  const previousMessages = await getMessagesByChat(chatId);

  // Merge: previous messages + new client messages (deduped by id)
  const existingIds = new Set(previousMessages.map((m) => m.id));
  const newMessages = messages.filter((m) => !existingIds.has(m.id));
  const allMessages = [...previousMessages, ...newMessages];

  return createAgentUIStreamResponse({
    agent: orchestratorAgent,
    uiMessages: allMessages,
    originalMessages: allMessages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onFinish: async ({ messages: finalMessages }) => {
      for (const msg of finalMessages) {
        await saveMessage(chatId, msg);
      }
    },
  });
}
```

**Key changes from current implementation:**
- `streamText` → `createAgentUIStreamResponse` + `ToolLoopAgent`
- `convertToModelMessages` ya no se llama manualmente (lo maneja `createAgentUIStream` internamente)
- `system` prompt → `instructions` en `ToolLoopAgent`
- `maxDuration` incrementado a 60s para dar margen a llamadas del sub-agente

## 7. UI Components

### 7.1 `AgentStatusBanner.tsx` (NEW)

```typescript
"use client";

interface AgentStatusBannerProps {
  /** Current activity description, or null when idle */
  activity: string | null;
}

export function AgentStatusBanner({ activity }: AgentStatusBannerProps) {
  if (!activity) return null;

  return (
    <div className="px-4 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b flex items-center gap-2">
      <span
        className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse"
        aria-hidden="true"
      />
      <span>{activity}</span>
    </div>
  );
}
```

### 7.2 `ChatArea.tsx` (MODIFIED)

Add `deriveActivity()` and `<AgentStatusBanner>`:

```typescript
import { AgentStatusBanner } from "./AgentStatusBanner";

// Derive current agent activity from the last assistant message's parts
function deriveActivity(messages: UIMessage[]): string | null {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") return null;

  for (const part of lastMessage.parts) {
    if (part.type === "tool-load_skill") {
      if (
        part.state === "input-available" ||
        part.state === "output-available"
      ) {
        const skillName = (part as { input: { skillName: string } }).input.skillName;
        return `Usando herramienta: load_skill (${skillName})...`;
      }
    }
    if (part.type === "tool-delegate_to_subagent") {
      if (part.state === "input-available") {
        return "Delegando a sub-agente...";
      }
    }
  }
  return null;
}
```

Place `<AgentStatusBanner activity={activity} />` between the top of the flex container and the `ScrollArea`.

### 7.3 `MessageBubble.tsx` (MODIFIED)

Add minimal rendering for tool parts. The AI SDK automatically generates tool parts (e.g., `tool-load_skill`, `tool-delegate_to_subagent`) in the message:

```typescript
// Inside the parts.map():
if (part.type === "tool-load_skill" || part.type === "tool-delegate_to_subagent") {
  // Tool parts are handled visually by AgentStatusBanner.
  // We render nothing inline to avoid clutter.
  return null;
}
```

**Rationale:** The `AgentStatusBanner` already communicates tool activity. Rendering tool parts inline would duplicate information and clutter the chat history.

## 8. Data Flow

### 8.1 Normal message

```
User → [text] → ToolLoopAgent → text response → UI (streaming)
                                        → AgentStatusBanner: null
```

### 8.2 `load_skill` flow

```
User: "Cargá la skill testing_skill"
  → ToolLoopAgent detects tool call (load_skill)
  → UI: AgentStatusBanner shows "Usando herramienta: load_skill (testing_skill)..."
  → execute(): finds skill in SKILLS → returns content
  → Model uses skill content in response
  → UI: AgentStatusBanner hides, text streams
```

### 8.3 `[DELEGATE]` flow

```
User: "[DELEGATE] explicame qué es SEO"
  → ORCHESTRATOR_PROMPT instructs agent to use delegate_to_subagent
  → UI: AgentStatusBanner shows "Delegando a sub-agente..."
  → execute(): subAgent.generate({ prompt: "explicame qué es SEO" })
  → sub-agent returns text result
  → Model presents result to user
  → UI: AgentStatusBanner hides, text streams
```

## 9. Verification Checklist

- [ ] `load_skill` returns correct content when skill exists
- [ ] `load_skill` returns error when skill doesn't exist
- [ ] `[DELEGATE]` (case-insensitive) triggers delegation to sub-agent
- [ ] `AgentStatusBanner` shows tool activity during `load_skill`
- [ ] `AgentStatusBanner` shows "Delegando a sub-agente..." during delegation
- [ ] `AgentStatusBanner` hides when idle
- [ ] `MessageBubble` gracefully handles tool parts (renders null)
- [ ] `pnpm exec tsc --noEmit` passes
- [ ] `pnpm exec biome check .` passes

## 10. AI SDK API Verification Log

| API | Source | Verified |
|---|---|---|
| `ToolLoopAgent` constructor | `node_modules/ai/docs/03-agents/02-building-agents.mdx` | `model`, `instructions`, `tools` |
| `tool()` helper | `node_modules/ai/docs/03-agents/02-building-agents.mdx` | `description`, `inputSchema: z.object(...)`, `execute: async ({...}) => {...}` |
| Sub-agent via `tool.execute()` | `node_modules/ai/docs/03-agents/06-subagents.mdx` | `subAgent.generate({ prompt, abortSignal })` |
| `createAgentUIStreamResponse` | `node_modules/ai/docs/07-reference/01-ai-sdk-core/18-create-agent-ui-stream-response.mdx` | `agent`, `uiMessages`, `originalMessages`, `generateMessageId`, `onFinish` |
| `ToolLoopAgentOnStepFinishCallback` | `node_modules/ai/src/agent/tool-loop-agent-settings.ts` | Type: `(OnStepFinishEvent) => Promise<void> \| void` |
| `UIMessageStreamOptions` | `node_modules/ai/src/generate-text/stream-text-result.ts` | `originalMessages`, `generateMessageId`, `onFinish`, `sendSources`, `sendReasoning` |
