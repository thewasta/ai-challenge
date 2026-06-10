# Design: Agent Tools & Sub-Agents Setup

**Change:** `agent-tools-subagents-setup`  
**Based on:** [spec](../specs/agent-tools-subagents-setup.md)

---

## 1. Component Architecture

### 1.1 Component Tree

```
ChatLayout
└── ChatArea (modified)
    ├── AgentStatusBanner (NEW)        ← top of flex container, above ScrollArea
    ├── ScrollArea
    │   └── MessageBubble[] (modified)
    └── ChatInput (unchanged)
```

### 1.2 Responsibility Matrix

| Component | Responsibility | Changes |
|---|---|---|
| `ChatArea` | Orchestrates chat state, derives agent activity, renders layout | Add `deriveActivity()`, import `AgentStatusBanner` |
| `AgentStatusBanner` | Displays current agent activity or nothing | NEW file |
| `MessageBubble` | Renders message parts including tool parts | Add tool part handling (render null) |
| `ChatInput` | Text input + send button | Unchanged |

---

## 2. AgentStatusBanner — Detailed Design

### 2.1 States

The banner has exactly one visual state: **visible** or **hidden**. When visible, it shows an animated dot + text.

```
┌──────────────────────────────────────────────────────────────┐
│  ● Usando herramienta: load_skill (testing_skill)...         │  ← visible
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  ● Delegando a sub-agente...                                 │  ← visible
└──────────────────────────────────────────────────────────────┘
                                                               ← hidden (renders null)
```

### 2.2 Props Contract

```typescript
interface AgentStatusBannerProps {
  /**
   * Human-readable activity description.
   * - `null` → banner is hidden (renders nothing)
   * - `string` → banner is visible with text
   */
  activity: string | null;
}
```

### 2.3 Visual Spec

```
┌─ Container ──────────────────────────────────────────────────┐
│  px-4 py-1.5                                                  │
│  text-xs text-muted-foreground                                │
│  bg-muted/50                                                  │
│  border-b                                                     │
│  flex items-center gap-2                                      │
│                                                               │
│  ┌─ Dot ─────────┐  ┌─ Text ───────────────────────────────┐ │
│  │ size-1.5       │  │ "Usando herramienta: load_skill..."  │ │
│  │ rounded-full   │  │                                      │ │
│  │ bg-emerald-500 │  └──────────────────────────────────────┘ │
│  │ animate-pulse  │                                           │
│  └────────────────┘                                           │
└───────────────────────────────────────────────────────────────┘
```

- **Dot:** 6px × 6px (size-1.5 = 0.375rem), `emerald-500` green, `animate-pulse` for subtle breathing effect
- **Text:** `text-xs` (12px), `text-muted-foreground` for low prominence
- **Background:** `bg-muted/50` — half-transparent muted to blend with theme
- **Border:** `border-b` (bottom border) to separate from message area
- **Position:** Fixed at top of ChatArea flex container, between toolbar area and ScrollArea

### 2.4 Activity Messages (defined in `deriveActivity`)

| Condition | Message |
|---|---|
| `load_skill` tool in progress | `"Usando herramienta: load_skill ({skillName})..."` |
| `delegate_to_subagent` tool in progress | `"Delegando a sub-agente..."` |
| Idle (no tool activity) | `null` (hidden) |

---

## 3. `deriveActivity` — Logic Design

### 3.1 Algorithm

```
Input: messages: UIMessage[]
Output: string | null

1. Take the LAST message from the array
2. If no messages OR last message.role !== "assistant" → return null
3. Iterate through lastMessage.parts in order
4. For each part:
   a. If part.type === "tool-load_skill" AND state is not "input-streaming":
      → return "Usando herramienta: load_skill ({skillName})..."
   b. If part.type === "tool-delegate_to_subagent" AND state is "input-available":
      → return "Delegando a sub-agente..."
5. If no matching tool part found → return null
```

### 3.2 Why "last message only"

The banner reflects *current* activity, not historical. Only the most recent assistant message can have active tool calls. Previous messages with tools are already completed.

### 3.3 Why skip `output-available` for `delegate_to_subagent`

When `delegate_to_subagent` reaches `output-available`, the tool has finished and the orchestrator is integrating the result. At this point the banner should hide to let the streaming text take focus. The `load_skill` tool keeps the banner because it's fast and the result is used inline — but `delegate_to_subagent` may take longer and the transition to text streaming is the user's signal that progress was made.

### 3.4 TypeScript Considerations

The `UIMessage` parts from AI SDK are typed with string literal unions. Tool parts follow the pattern `tool-{toolName}`. Accessing `part.input` requires narrowing:

```typescript
// Narrowing pattern for tool parts
function deriveActivity(messages: UIMessage[]): string | null {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") return null;

  for (const part of lastMessage.parts) {
    if (part.type === "tool-load_skill") {
      if (part.state === "input-available" || part.state === "output-available") {
        // part.input is typed as { skillName: string } by AI SDK inference
        return `Usando herramienta: load_skill (${part.input.skillName})...`;
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

---

## 4. ChatArea — Integration Points

### 4.1 Current Structure (simplified)

```tsx
<div className="flex flex-col h-[calc(100vh-3.5rem)]">
  <ScrollArea className="flex-1">
    {/* messages */}
  </ScrollArea>
  <div className="border-t bg-background p-4">
    <ChatInput />
  </div>
  {/* error banners */}
</div>
```

### 4.2 Modified Structure

```tsx
<div className="flex flex-col h-[calc(100vh-3.5rem)]">
  <AgentStatusBanner activity={deriveActivity(messages)} />  {/* ← NEW: between top and scroll */}
  <ScrollArea className="flex-1">
    {/* messages */}
  </ScrollArea>
  <div className="border-t bg-background p-4">
    <ChatInput />
  </div>
  {/* error banners */}
</div>
```

### 4.3 Placement Rationale

- **Above ScrollArea, below top edge:** Banner is always visible regardless of scroll position
- **Before ChatInput:** Banner acts as a "what's happening" indicator, visually connecting to the input area where the user interacts
- **Doesn't push content:** `h-[calc(100vh-3.5rem)]` on the container + `flex-1` on ScrollArea means the banner takes minimal space (auto height) and content adapts

---

## 5. MessageBubble — Tool Part Handling

### 5.1 Current Part Handling

```tsx
message.parts.map((part, i) => {
  if (part.type === "text") {
    // renders text with ReactMarkdown
  }
  return null; // fallback
})
```

### 5.2 Modified Part Handling

```tsx
message.parts.map((part, i) => {
  if (part.type === "text") {
    // existing text rendering (unchanged)
  }
  if (
    part.type === "tool-load_skill" ||
    part.type === "tool-delegate_to_subagent"
  ) {
    // Tool parts are communicated via AgentStatusBanner.
    // Render nothing inline.
    return null;
  }
  return null;
})
```

### 5.3 Rationale

- **No inline rendering:** The `AgentStatusBanner` already shows "Usando herramienta..." / "Delegando...". Rendering tool parts in the chat history would duplicate info and add visual noise
- **Future-proofing:** When we add tools that produce visible results (like mock Lighthouse reports), the pattern will change. For now, MVP simplicity
- **No type errors:** `part.type` is a string — the check fails safely for unknown types, falling through to `null`

---

## 6. File Creation/Modification Summary

| File | Action | Lines (est.) |
|---|---|---|
| `src/skills/testing-skill.ts` | CREATE | ~10 |
| `src/skills/index.ts` | CREATE | ~15 |
| `src/agents/prompts/orchestrator.ts` | CREATE | ~20 |
| `src/agents/prompts/sub-agent.ts` | CREATE | ~15 |
| `src/agents/prompts/index.ts` | CREATE | ~5 |
| `src/agents/tools.ts` | CREATE | ~60 |
| `src/components/AgentStatusBanner.tsx` | CREATE | ~20 |
| `src/app/api/chat/route.ts` | REWRITE | ~40 |
| `src/components/ChatArea.tsx` | MODIFY | +15 |
| `src/components/MessageBubble.tsx` | MODIFY | +10 |

---

## 7. Edge Cases & States

### 7.1 Loading States

| State | Behavior |
|---|---|
| Chat history loading | `MessageSquare` icon + "Cargando historial..." (existing, unchanged) |
| Agent processing (tool) | `AgentStatusBanner` visible with tool activity |
| Agent streaming (text) | Text appears incrementally (existing streaming behavior) |
| Agent idle | `AgentStatusBanner` hidden, `ChatInput` enabled |

### 7.2 Error States

| Error | Behavior |
|---|---|
| Skill not found | Tool returns error string → model tells user skill wasn't found. Banner hides normally. |
| Sub-agent timeout | `generateText` throws → tool fails → model reports error. `error` state in ChatArea shows banner. |
| Network error (existing) | Red error banner at bottom (unchanged) |

### 7.3 Empty/Edge States

| Scenario | Behavior |
|---|---|
| No messages yet | `AgentStatusBanner` hidden, empty state prompt visible |
| Multiple rapid tool calls | Banner updates on each render as `messages` array changes |
| Message without tool parts | `deriveActivity` returns null → banner hidden |

---

## 8. Design Decisions Log

| Decision | Rationale |
|---|---|
| Banner instead of inline parts for tool activity | Banner is always visible (above scroll), doesn't scroll away. Inline parts would be buried in history |
| `deriveActivity` as a plain function, not a hook | No side effects, pure computation from messages. Simpler to test and reason about |
| `activity: string \| null` instead of enum | String gives flexibility to add new messages without changing the component API. Banner is presentational |
| Green dot (emerald-500) for activity | Green = active/processing. Avoids red (error connotation) and blue (too similar to primary theme) |
| Tool parts render `null` in MessageBubble | Banner handles visual communication. Avoids duplicating information |
| `subAgent` definition colocated with tools in `tools.ts` | The sub-agent is an implementation detail of the `delegate_to_subagent` tool. Keeps related code together |
