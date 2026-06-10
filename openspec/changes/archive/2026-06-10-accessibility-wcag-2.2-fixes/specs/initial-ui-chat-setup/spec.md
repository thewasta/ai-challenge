# Delta Spec: Initial UI Chat Setup — Accessibility Enhancements

**Change ID:** `accessibility-wcag-2.2-fixes`  
**Base Spec:** `initial-ui-chat-setup.md`

---

## MODIFIED Requirements

### Requirement: AppSidebar Component WCAG 2.2 AA Compliance

All components (AppSidebar, MessageBubble, ChatArea, ChatInput, HomePageClient, AgentStatusBanner) MUST render with WCAG 2.2 AA accessibility compliance.

**(Previously: AppSidebar only rendered styled UI; no ARIA or semantic markup requirements)**

#### Accessibility Changes

**1. Decorative Icons Must Use `aria-hidden="true"`**

All icons that are purely decorative (folder, chevron, message square, loader) MUST be hidden from screen readers:

```tsx
// BEFORE (inaccessible)
<FolderIcon className="size-4" />
<ChevronDownIcon className="ml-auto" />
<MessageSquareIcon className="size-4" />

// AFTER (compliant)
<FolderIcon className="size-4" aria-hidden="true" />
<ChevronDownIcon className="ml-auto" aria-hidden="true" />
<MessageSquareIcon className="size-4" aria-hidden="true" />
```

**2. CollapsibleTrigger Must Support Keyboard Activation**

CollapsibleTrigger MUST respond to Enter/Space keys. Verify that shadcn/ui Collapsible component:
- Has `role="button"` on trigger
- Exposes `aria-expanded="true"` or `aria-expanded="false"`
- Updates aria-expanded on toggle
- Supports Enter/Space activation natively

```tsx
// AFTER (verified and confirmed)
<CollapsibleTrigger asChild>
  <SidebarGroupLabel>
    {/* This button role element must have aria-expanded automatically from shadcn */}
    <FolderIcon aria-hidden="true" /> {project.name}
    <ChevronDownIcon className="ml-auto" aria-hidden="true" />
  </SidebarGroupLabel>
</CollapsibleTrigger>
```

**3. Active Chat Link Must Have `aria-current="page"`**

The currently active chat link MUST announce its state to screen readers:

```tsx
// AFTER (compliant)
<Link
  href={`/projects/${project.id}/chats/${chat.id}`}
  aria-current={chat.id === currentChatId ? "page" : undefined}
>
  <MessageSquareIcon className="size-4" aria-hidden="true" />
  {chat.title}
</Link>
```

#### Scenario: Keyboard user navigates sidebar and activates collapsible

- **GIVEN** a sidebar with 3 collapsed projects, each with CollapsibleTrigger
- **WHEN** keyboard user tabs to first trigger and presses Enter
- **THEN**:
  - Project expands (content becomes visible)
  - `aria-expanded` flips to "true"
  - Screen reader announces: "button, [project name], expanded"
  - Tab moves to next focusable element (not trapped)

#### Scenario: Screen reader user identifies active chat

- **GIVEN** a sidebar with multiple projects/chats
- **WHEN** screen reader scans the link for the current active chat
- **THEN**:
  - Screen reader announces: "link, [chat name], current page"
  - User immediately knows which chat is active
  - No visual inspection needed

#### Scenario: Decorative icons do not clutter screen reader output

- **GIVEN** a project list item with folder icon, name "Project A", and chevron
- **WHEN** screen reader scans the item
- **THEN**:
  - Screen reader announces: "Project A" or "button, Project A, expanded"
  - NOT: "folder Project A chevron down"
  - Icons are completely hidden from accessibility tree

---

### Requirement: ChatArea Component Keyboard Navigation

ChatArea MUST provide a skip link at the top of the page and ensure focus management for keyboard users.

**(Previously: ChatArea only rendered messages; no skip link or focus management)**

#### Changes

**1. ChatLayout (Parent) Must Provide Skip Link**

A skip link MUST be added to `ChatLayout` as the first focusable element:

```tsx
// AFTER (in ChatLayout component)
<>
  {/* Skip link — first focusable element */}
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
  >
    Saltar a contenido principal
  </a>

  {/* Existing header, sidebar, etc. */}
  <header>...</header>

  {/* Chat area with id for skip link target */}
  <SidebarInset id="main-content">
    <ChatArea />
  </SidebarInset>
</>
```

**2. Auto-Scroll Must Respect `prefers-reduced-motion`**

ChatArea's auto-scroll behavior MUST check user's motion preference:

```tsx
// AFTER (in ChatArea useEffect)
useEffect(() => {
  if (messages.length === 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  } else {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [messages]);
```

**3. Error Messages Must Use `role="alert"`**

Error messages in ChatArea MUST announce to screen readers:

```tsx
// AFTER (in ChatArea render)
{error && (
  <div
    role="alert"
    aria-live="polite"
    aria-atomic="true"
    className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center"
  >
    <span className="inline-block mr-2">⚠️</span>
    Error: {error.message}
  </div>
)}
```

#### Scenario: Keyboard user skips sidebar to chat input

- **GIVEN** ChatLayout loads with AppSidebar (400+ focusable items) and ChatArea
- **WHEN** keyboard user presses Tab on page load
- **THEN**:
  - Focus goes to skip link (visible on `:focus`)
  - User reads: "Saltar a contenido principal"
  - User presses Enter
  - Focus jumps to ChatArea (id="main-content")
  - User can immediately type in chat input
  - No need to tab through entire sidebar

#### Scenario: Auto-scroll respects motion preference

- **GIVEN** user has `prefers-reduced-motion: reduce` enabled
- **WHEN** user sends a message and new assistant response appears
- **THEN**:
  - ChatArea auto-scrolls instantly (no animation)
  - User does not experience vestibular discomfort
  - New message is visible immediately

#### Scenario: Error message is announced to screen reader

- **GIVEN** chat API fails with "Connection timeout"
- **WHEN** error appears in ChatArea
- **THEN**:
  - Screen reader announces: "Alert: Error: Connection timeout"
  - User is informed without moving focus
  - Visual feedback (red background, warning icon) also present

---

### Requirement: MessageBubble Component Image Alt Text Fallback

MessageBubble's ReactMarkdown renderer MUST provide alt text fallback for images.

**(Previously: ReactMarkdown rendered images as-is; no alt text validation)*

#### Changes

**1. Custom ReactMarkdown Image Component**

Create a custom image component that applies alt text fallback:

```tsx
// AFTER (in MessageBubble)
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const customImageComponent = (props: any) => {
  const alt = props.alt && props.alt.trim() ? props.alt : "Imagen generada por el asistente";
  return (
    <img {...props} alt={alt} className="max-w-full rounded" />
  );
};

export function MessageBubble({ message }: MessageBubbleProps) {
  // ... existing code ...
  
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] rounded-lg px-4 py-3", /* ... */)}>
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return isUser ? (
                <p key={i} className="whitespace-pre-wrap">{part.text}</p>
              ) : (
                <ReactMarkdown
                  key={i}
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: customImageComponent,
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

#### Scenario: AI-generated image without alt text gets fallback

- **GIVEN** AI responds with markdown: `![](https://example.com/chart.png)` (no alt text)
- **WHEN** MessageBubble renders the markdown
- **THEN**:
  - Image renders with `alt="Imagen generada por el asistente"`
  - Screen reader announces: "image, Imagen generada por el asistente"
  - User knows the image is AI-generated

#### Scenario: Markdown with explicit alt text is preserved

- **GIVEN** AI responds with: `![Gráfico de ventas Q2](https://example.com/chart.png)`
- **WHEN** MessageBubble renders the markdown
- **THEN**:
  - Image renders with `alt="Gráfico de ventas Q2"`
  - Screen reader announces: "image, Gráfico de ventas Q2"
  - Original alt text is preserved, not overwritten

---

### Requirement: ChatInput Component Labels and Disabled State Contrast

ChatInput MUST have associated labels and sufficient contrast on disabled states.

**(Previously: ChatInput label was `.sr-only`; disabled states not contrast-checked)**

#### Changes

**1. Input Label Includes Keyboard Hint**

Label should describe keyboard shortcuts accessibly:

```tsx
// AFTER (in ChatInput)
<label htmlFor="chat-input" className="sr-only">
  Escribe tu mensaje (Shift+Enter para nueva línea)
</label>
<Input
  id="chat-input"
  placeholder="Escribe tu mensaje..."
  disabled={disabled}
  // ... existing onChange, onKeyDown, etc.
/>
```

**2. Icon Buttons Must Have `aria-hidden="true"`**

Send and Loader icons in button must be hidden from screen readers:

```tsx
// AFTER (in ChatInput)
<Button size="icon" disabled={disabled || !value.trim()}>
  {disabled ? (
    <>
      <Loader2 className="animate-spin size-4" aria-hidden="true" />
    </>
  ) : (
    <Send className="size-4" aria-hidden="true" />
  )}
  <span className="sr-only">
    {disabled ? "Enviando..." : "Enviar mensaje"}
  </span>
</Button>
```

**3. Disabled State Contrast**

Verify that disabled button/input backgrounds and text meet 3:1 contrast ratio:

```css
/* AFTER (in globals.css or component CSS) */
button:disabled,
input:disabled {
  color: hsl(var(--muted-foreground) / 0.8); /* Ensure ≥3:1 contrast */
  background-color: hsl(var(--muted) / 0.9);
  /* Verify actual colors meet WCAG AA */
}
```

#### Scenario: Keyboard user knows input function

- **GIVEN** ChatInput field with `.sr-only` label
- **WHEN** screen reader user focuses the input
- **THEN**:
  - Screen reader announces: "Edit text, Escribe tu mensaje (Shift+Enter para nueva línea)"
  - User knows to type and knows shift+enter creates new line
  - No guessing or trial-and-error

#### Scenario: Disabled send button is distinguishable

- **GIVEN** ChatInput in loading state (button disabled, spinner showing)
- **WHEN** user with high contrast mode or vision impairment views the button
- **THEN**:
  - Disabled button background is visibly different from enabled
  - Disabled button text meets ≥3:1 contrast against its background
  - User can see the button is disabled without needing color alone

#### Scenario: Icon button announces purpose without icon

- **GIVEN** send button with Loader2 spinner and no visible text
- **WHEN** screen reader scans the button
- **THEN**:
  - Screen reader announces: "button, Enviando..." (from `.sr-only` text)
  - NOT: "button" or "button, image" (from icon)
  - User knows button purpose despite icon-only visual

---

## Summary of Changes

| Component | Change | WCAG Criterion |
|-----------|--------|----------------|
| AppSidebar | Add `aria-hidden="true"` to all decorative icons | 1.1.1 |
| AppSidebar | Verify CollapsibleTrigger has `aria-expanded` + Enter/Space support | 2.1.1, 4.1.2 |
| AppSidebar | Add `aria-current="page"` to active chat link | 1.3.1 |
| ChatLayout | Add skip link as first focusable element | 2.4.1 |
| ChatArea | Auto-scroll respects `prefers-reduced-motion` | 2.2.3 |
| ChatArea | Error messages use `role="alert"` + `aria-live` | 4.1.3 |
| MessageBubble | Custom ReactMarkdown image component with alt fallback | 1.1.1 |
| ChatInput | Label includes keyboard hint ("Shift+Enter...") | 4.1.2 |
| ChatInput | Send/Loader icons use `aria-hidden="true"` | 1.1.1 |
| ChatInput | Button aria-label for icon-only send button | 1.1.1 |
| globals.css | Disabled state contrast ≥3:1 verified | 1.4.11 |

---

## Rules

- All icons must be individually evaluated: decorative → `aria-hidden="true"`, functional → `aria-label` or context
- All keyboard interactions must be testable with Tab/Enter/Space/Escape keys
- All motion/animation must respect `prefers-reduced-motion: reduce`
- All error messages must announce via `role="alert"`
- All form inputs must have associated `<label>` or `aria-label`
