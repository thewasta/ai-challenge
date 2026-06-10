# Design: WCAG 2.2 AA Accessibility Fixes

## Technical Approach

Apply a layered fix strategy: (1) CSS-global rules that affect every component at once (`globals.css`), (2) mechanical JSX attribute patches (`aria-hidden`, `role`, `aria-live`) that follow a single uniform pattern across all components, (3) targeted logic changes for two independent concerns — motion-aware auto-scroll and dynamic page titles. No new dependencies are required; every fix uses patterns already present in the stack (Tailwind CSS v4, Next.js App Router, shadcn/ui, ReactMarkdown).

---

## Architecture Decisions

### Decision 1: Skip Link — CSS `sr-only / focus:not-sr-only` vs React Portal

| Option | Trade-off | Decision |
|--------|-----------|----------|
| CSS `sr-only focus:not-sr-only` on `<a>` | Zero JS, works before hydration, single element | ✅ **CHOSEN** |
| React Portal to `document.body` | Requires `useEffect`, hydration complexity, overkill | ✗ Rejected |

**Rationale:** The skip link must be the first focusable element in DOM order, before `<SidebarProvider>`. A plain `<a>` placed as the first child of `<SidebarInset>` (which is the first visible structural wrapper) achieves this without JS. The Tailwind classes `sr-only focus:not-sr-only` are already in the project's utility set. A portal would add hydration timing risk with no benefit.

**Trade-off:** The skip link must be placed carefully — it needs to be the very first focusable child in `SidebarInset`, not inside `AppSidebar`, to respect DOM order.

---

### Decision 2: Icon ARIA Strategy — `aria-hidden` prop on each icon vs wrapper component vs lint rule

| Option | Trade-off | Decision |
|--------|-----------|----------|
| `aria-hidden="true"` on each `<Icon />` inline | Explicit, grep-able, zero abstraction | ✅ **CHOSEN** |
| Generic `<DecorativeIcon>` wrapper | Adds a component layer, hides intent | ✗ Rejected |
| Biome lint rule | Can't be added to per-project config without custom rule support | ✗ Rejected |

**Rationale:** The codebase uses Lucide icons directly (`<Bot />`, `<Zap />`, etc.). Adding `aria-hidden="true"` inline on each is the simplest, most discoverable fix. The audit identified 10+ exact locations; this is a mechanical batch edit, not an architectural problem. A wrapper component would obscure the intent without providing re-use value.

---

### Decision 3: Focus Management — CSS `:focus-visible` override vs JS focus trapping vs shadcn built-in

| Option | Trade-off | Decision |
|--------|-----------|----------|
| CSS `@layer base :focus-visible` override in globals.css | Single source of truth, zero JS, project-wide | ✅ **CHOSEN** |
| JS focus trapping (focus-trap-react) | Only needed for modal dialogs; proposal confirms no modals exist in MVP | ✗ Not needed |
| shadcn built-in focus | Shadcn's `outline-ring/50` opacity is the reported bug; must override | ✗ Insufficient |

**Rationale:** The audit found `outline-ring/50` at line 162 of `globals.css` causing the 50% opacity on focus outlines. The fix is a single CSS `@layer base` override for `:focus-visible`. P0-003 (modal focus traps) is explicitly skipped — there are no modals in the current codebase.

---

### Decision 4: Motion Preferences Strategy — CSS media query + JS matchMedia (both)

| Option | Trade-off | Decision |
|--------|-----------|----------|
| CSS `@media (prefers-reduced-motion: reduce)` only | Covers Tailwind animations globally; doesn't affect `scrollIntoView()` JS call | Partial |
| JS `window.matchMedia` in `ChatArea.tsx` only | Fixes scroll; doesn't cover CSS animations globally | Partial |
| Both: CSS global + inline JS `matchMedia` per use | Complete coverage; CSS for all animations, JS for imperative scroll | ✅ **CHOSEN** |

**Rationale:** Two independent mechanisms produce the animations: (a) Tailwind CSS classes (`animate-spin`, `animate-pulse`) and (b) the imperative `scrollIntoView({ behavior: "smooth" })` in `ChatArea`. CSS alone cannot affect the JS call; JS alone cannot affect CSS animations. Both are required. The JS check is a direct `.matches` read (no subscription), so no hook is needed — it's a single inline check inside the existing `useEffect`.

---

### Decision 5: Markdown Alt Text Fallback — Custom `components` prop vs remark plugin vs linting AI output

| Option | Trade-off | Decision |
|--------|-----------|----------|
| `components={{ img: customRenderer }}` prop on `<ReactMarkdown>` | Zero new dependencies, follows existing ReactMarkdown API | ✅ **CHOSEN** |
| remark plugin | Requires a new npm package or custom plugin file | ✗ Overkill |
| Linting AI output server-side | Would require modifying `/api/chat` response transformation; coupling concerns | ✗ Wrong layer |

**Rationale:** ReactMarkdown already accepts a `components` prop for custom element renderers. The fix is a 4-line inline component defined at the module level (not inside the render function, per react-best-practices `rerender-no-inline-components` rule). The fallback text `"Imagen generada por el asistente"` matches the project language (Spanish) and the audit suggestion.

---

### Decision 6: Dynamic Page Titles — `generateMetadata` in chat route vs client-side `document.title`

| Option | Trade-off | Decision |
|--------|-----------|----------|
| `generateMetadata()` in `src/app/projects/[id]/chats/[chatId]/page.tsx` | Server-side, SEO-friendly, follows Next.js App Router conventions | ✅ **CHOSEN** |
| Client-side `document.title = ...` via `useEffect` | Works but doesn't populate SSR `<title>` tag; not idiomatic in App Router | ✗ Rejected |

**Rationale:** The chat page is already a `async` Server Component. Adding `generateMetadata` is idiomatic App Router and runs server-side, giving the correct `<title>` even on first load. The `project.name` is already fetched in the page; adding `chatId` to the title gives context like `"Chat 42 — Proyecto SEO | Consultor SEO"`.

---

### Decision 7: Error Announcement Strategy — `role="alert"` vs `aria-live` regions vs both

| Option | Trade-off | Decision |
|--------|-----------|----------|
| `role="alert"` only (implies `aria-live="assertive"`) | Interrupts screen readers immediately — too aggressive for soft errors | ✗ Rejected |
| `aria-live="polite"` + `role="status"` | Waits for AT to finish current speech — correct for error messages that appear after action | ✅ **CHOSEN** for `loadError` |
| Both `role="alert"` + `aria-live="polite"` on same element | `role="alert"` already sets `aria-live="assertive"`, making `aria-live="polite"` a no-op — mixed signal | ✗ Rejected |

**Rationale:** `loadError` is a soft failure (history couldn't load) that shouldn't interrupt the user mid-sentence. `role="status"` + `aria-live="polite"` is correct. The `error` (AI communication error) is also polite — it appears after an action the user initiated. Using both `role="alert"` and `aria-live="polite"` on the same element creates conflicting ARIA semantics (assertive vs polite). The audit suggestion of `role="alert" aria-live="polite"` is technically incorrect per the ARIA spec and is corrected here.

---

### Decision 8: A11y Verification Strategy — axe-core CLI vs Lighthouse CI vs both

| Option | Trade-off | Decision |
|--------|-----------|----------|
| `@axe-core/cli` only | Fast, deep rule coverage (300+ rules), runs against live page | ✅ Primary |
| Lighthouse CI only | Integrates with CI pipelines, score-based, fewer a11y rules than axe | Secondary |
| Both | Maximum coverage; axe for depth, Lighthouse for score tracking | ✅ **CHOSEN** |

**Rationale:** The success criteria specifies "Lighthouse accessibility score ≥80/100". Lighthouse measures the score. axe-core provides the detailed rule-level feedback needed during development. Both are needed: axe catches issues Lighthouse misses (interactive ARIA states, focus management), Lighthouse tracks the headline score. Both are CLI-runnable against the dev server without a browser.

---

## Data Flow

```
User presses Tab
      │
      ▼
[Skip Link — first focusable in DOM]
  → href="#main-content" → jumps to ChatInput
      │
      ▼
[AppSidebar] — CollapsibleTrigger (shadcn handles aria-expanded natively)
  Icons: aria-hidden="true" → AT ignores them
      │
      ▼
[ChatLayout header] — SidebarTrigger
      │
      ▼
[id="main-content"] — ChatInput
  label → input (explicit association)
  Icons in Button: aria-hidden="true"
      │
[ChatArea]
  scrollIntoView() ─── matchMedia check ──→ behavior: "auto" | "smooth"
      │
  error divs ──────────── role="status" aria-live="polite" ──→ AT announces on polite queue
      │
[MessageBubble]
  Bot icon: aria-hidden="true"
  ReactMarkdown <img> → customImageRenderer → alt fallback applied
```

```
Page load (SSR)
      │
      ▼
generateMetadata() in /projects/[id]/chats/[chatId]/page.tsx
      │
  <title>Chat {chatId} — {projectName} | Consultor SEO</title>
      │
      ▼
globals.css loaded
  :focus-visible → outline: 2px solid currentColor (no opacity)
  @media prefers-reduced-motion → all animations: 0.01ms
```

---

## Component Patterns — Before / After

### `AppSidebar.tsx` — Icons

```tsx
// BEFORE
<Zap className="size-5 text-primary" />
<Folder className="size-4" />
<ChevronDown className="size-4 transition-transform duration-200 ..." />
<MessageSquare className="size-4" />

// AFTER
<Zap className="size-5 text-primary" aria-hidden="true" />
<Folder className="size-4" aria-hidden="true" />
<ChevronDown className="size-4 transition-transform duration-200 ..." aria-hidden="true" />
<MessageSquare className="size-4" aria-hidden="true" />
```

### `AppSidebar.tsx` — Collapsible ARIA (P0-002, P1-009)

`CollapsibleTrigger` from shadcn/ui (Radix `@radix-ui/react-collapsible`) natively manages `aria-expanded` and keyboard activation (Enter/Space). No manual override needed. The verification step confirms this via DOM inspection.

### `ChatLayout.tsx` — Skip Link (P0-004)

```tsx
// BEFORE — no skip link
<SidebarProvider className="h-svh">
  <AppSidebar ... />
  <SidebarInset>
    <header ...>

// AFTER — skip link as first child of SidebarInset
<SidebarProvider className="h-svh">
  <AppSidebar ... />
  <SidebarInset>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Saltar al contenido principal
    </a>
    <header ...>
    ...
    <div className="flex-1 min-h-0">
      <ChatArea chatId={currentChatId} />  {/* ChatInput gets id="main-content" */}
    </div>
```

The `id="main-content"` is placed on `ChatInput`'s wrapper `<div>` inside `ChatArea`, which is the first meaningful interactive region after the header.

### `ChatInput.tsx` — Icons + Label (P0-001, P1-002, P2-007)

```tsx
// BEFORE
<label htmlFor="chat-input" className="sr-only">
  Escribe tu mensaje
</label>
...
{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}

// AFTER
<label htmlFor="chat-input" className="sr-only">
  Escribe tu mensaje (Shift+Enter para nueva línea)
</label>
...
{isLoading
  ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
  : <Send className="size-4" aria-hidden="true" />
}
```

**Disabled contrast (P1-002):** shadcn/ui's `Input` and `Button` components inherit Tailwind's `disabled:opacity-50`. The `--muted-foreground` token at `oklch(0.556 0 0)` on white background (`oklch(1 0 0)`) at 50% opacity yields approximately 2.1:1 — below 3:1. Fix: override disabled opacity to `disabled:opacity-70` via `className` on both components, which brings the ratio above 3:1 while maintaining visual affordance.

### `ChatArea.tsx` — Motion-aware scroll + Error ARIA (P0-001, P1-005, P1-008)

```tsx
// BEFORE — loading state icon
<MessageSquare className="size-12 mb-4 stroke-1 text-muted-foreground" />

// AFTER
<MessageSquare className="size-12 mb-4 stroke-1 text-muted-foreground" aria-hidden="true" />
<p className="sr-only">Cargando historial del chat</p>

// BEFORE — auto-scroll effect
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

// AFTER — respects prefers-reduced-motion
useEffect(() => {
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  bottomRef.current?.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}, [messages]);

// BEFORE — error divs (no ARIA)
<div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
  {loadError}
</div>

// AFTER — announced to AT
<div
  role="status"
  aria-live="polite"
  className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center"
>
  {loadError}
</div>
```

Also: `id="main-content"` added to the outer `<div className="flex flex-col h-full">` of `ChatArea`'s return.

### `MessageBubble.tsx` — Bot icon + custom image renderer (P0-001, P1-001)

```tsx
// BEFORE
<Bot className="size-4 text-primary-foreground" />
...
<ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>

// AFTER — module-level renderer (not inside component, per rerender-no-inline-components)
const markdownComponents = {
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      src={src}
      alt={alt || "Imagen generada por el asistente"}
      {...props}
    />
  ),
};

// Inside component:
<Bot className="size-4 text-primary-foreground" aria-hidden="true" />
...
<ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
  {part.text}
</ReactMarkdown>
```

### `HomePageClient.tsx` — Icons (P0-001)

```tsx
// BEFORE
<Zap className="size-16 text-primary mb-6" />
{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}

// AFTER
<Zap className="size-16 text-primary mb-6" aria-hidden="true" />
{isLoading
  ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
  : <Plus className="size-4" aria-hidden="true" />
}
```

### `AgentStatusBanner.tsx` — Motion + size (P1-006)

```tsx
// BEFORE
<span
  className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse"
  aria-hidden="true"
/>

// AFTER — motion-safe/motion-reduce Tailwind variants
<span
  className="inline-block size-2 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:opacity-60"
  aria-hidden="true"
/>
```

**Note:** `size-2` (8px) is used instead of `size-1.5` (6px) to move closer to the 24px target. The dot is purely decorative (`aria-hidden`) so the target-size rule (2.5.8) does not apply to it — the finding in the audit is noted but the dot is not interactive.

### `layout.tsx` — Metadata stays static; `page.tsx` gains `generateMetadata` (P1-007)

```tsx
// src/app/projects/[id]/chats/[chatId]/page.tsx — AFTER

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}): Promise<Metadata> {
  const { id, chatId } = await params;
  const project = await getProject(Number(id));
  return {
    title: project
      ? `Chat ${chatId} — ${project.name} | Consultor SEO`
      : "Consultor SEO & Marketing Digital",
  };
}
```

---

## CSS Architecture

### `src/app/globals.css` — Changes

```css
/* ─── EXISTING (line 160-163): replace outline-ring/50 ─── */
@layer base {
  * {
    /* BEFORE: @apply border-border outline-ring/50; */
    /* AFTER: remove opacity from focus outline */
    @apply border-border;
  }

  /* Focus-visible: solid 2px, no opacity (P1-004 + P2-001) */
  :focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Scroll margin so focused elements clear the 56px sticky header (P2-005) */
  :focus {
    scroll-margin-top: 3.5rem; /* 56px = h-14 header */
  }

  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

/* ─── NEW BLOCK: at end of file (P1-006) ─── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Why `currentColor`:** The focus outline inherits the element's text color, which is already contrast-checked against the background. No hardcoded color needed.

**Why `scroll-margin-top: 3.5rem`:** The sticky header in `ChatLayout` is `h-14` (3.5rem). Focused elements that receive focus via Tab or programmatic focus won't slide behind the header.

---

## Hook Design

No new custom hooks are required. The motion preference check in `ChatArea` is a direct `.matchMedia().matches` read inside an existing `useEffect` — not a subscription, no re-render concern, no hook needed.

**If motion preference changes at runtime** (user toggles OS setting mid-session): The existing `useEffect` runs only when `messages` changes. A live `matchMedia` listener would be needed for instant reaction — this is **out of scope for Sprint 1/2** and has negligible UX impact (affects only the next message scroll after a system setting change).

`useSkipLink` and `useAriaLive` hooks are NOT created. The skip link is a static `<a>` element; `aria-live` regions are static `role="status"` divs. No JS coordination needed.

---

## Component Tree Changes

```
<html lang="es">
  <body>
    <TooltipProvider>
      ← home route: <HomePageClient />  (icons get aria-hidden)
      ← chat route:
        <SidebarProvider>
          <AppSidebar />        ← icons get aria-hidden="true"
                                ← CollapsibleTrigger ARIA already managed by Radix
          <SidebarInset>
            <a href="#main-content"          ← NEW: skip link (first focusable)
               className="sr-only focus:not-sr-only ...">
              Saltar al contenido principal
            </a>
            <header>                          ← sticky, z-10, h-14
              <SidebarTrigger />
              <projectName />
            </header>
            <div>
              <ChatArea id="main-content">   ← NEW: receives skip link target
                <AgentStatusBanner />        ← spinner: motion-safe/motion-reduce
                <ScrollArea>
                  <MessageBubble />          ← Bot icon aria-hidden
                                             ← ReactMarkdown custom img renderer
                </ScrollArea>
                <ChatInput />               ← icons aria-hidden; label hint updated
                <div role="status"          ← NEW: error region (aria-live)
                     aria-live="polite">
                  {loadError || error}
                </div>
              </ChatArea>
            </div>
          </SidebarInset>
        </SidebarProvider>
    </TooltipProvider>
  </body>
</html>
```

---

## File-by-File Implementation Map

| File | Sprint | Issues Fixed | Type of Change |
|------|--------|-------------|----------------|
| `src/app/globals.css` | Sprint 1+2 | P1-004, P1-006, P2-001, P2-005 | CSS: remove outline opacity, add reduced-motion block, add scroll-margin |
| `src/components/AppSidebar.tsx` | Sprint 1 | P0-001 (×4 icons), P0-002 (verify), P1-009 (verify) | JSX: `aria-hidden` on 4 icons; Collapsible ARIA confirmed |
| `src/components/ChatLayout.tsx` | Sprint 1 | P0-004, P1-003 | JSX: skip link `<a>` added as first child |
| `src/components/ChatInput.tsx` | Sprint 1+2 | P0-001 (×2 icons), P1-002, P2-007 | JSX: `aria-hidden` on icons; label hint text; `disabled:opacity-70` |
| `src/components/ChatArea.tsx` | Sprint 1+2 | P0-001 (×2 icons), P1-005, P1-008 | JSX: `aria-hidden`; motion-aware scroll; `role="status"` errors; `id="main-content"` |
| `src/components/MessageBubble.tsx` | Sprint 2 | P0-001 (Bot icon), P1-001 | JSX: `aria-hidden`; module-level `markdownComponents` with img fallback |
| `src/components/HomePageClient.tsx` | Sprint 1 | P0-001 (×3 icons) | JSX: `aria-hidden` on Zap, Plus, Loader2 |
| `src/components/AgentStatusBanner.tsx` | Sprint 1+2 | P1-006 | JSX: `motion-safe:animate-pulse motion-reduce:opacity-60`; size-2 |
| `src/app/projects/[id]/chats/[chatId]/page.tsx` | Sprint 2 | P1-007 | New `generateMetadata()` export |

---

## Testing Strategy

### Automated (sdd-verify phase)

**axe-core CLI:**
```bash
# Install once
pnpm add -D @axe-core/cli

# Run against dev server (start server first with: pnpm dev)
pnpm exec axe http://localhost:3000 --exit
pnpm exec axe http://localhost:3000/projects/1/chats/1 --exit
```

Target: zero critical/serious violations after Sprint 2.

**Lighthouse CLI:**
```bash
pnpm exec lighthouse http://localhost:3000/projects/1/chats/1 \
  --only-categories=accessibility \
  --output=json \
  --output-path=.agents/audits/lighthouse-post-fix.json \
  --chrome-flags="--headless"
```

Target: score ≥ 80.

### Manual Checklist (for reference — not required for sdd-verify)

These are documented for future sprint context but are NOT blocking for the automated verify phase:

- [ ] Tab through full chat page: skip link appears on first Tab, activates focus on `ChatInput`
- [ ] Sidebar `CollapsibleTrigger`: Enter/Space toggles open/closed; `aria-expanded` toggles in DOM
- [ ] Screen reader (VoiceOver): icons are not announced; Bot avatar is silent
- [ ] Error state: trigger a network failure; confirm AT announces the error message
- [ ] OS reduced-motion enabled: auto-scroll jumps instantly; spinner pulse stops
- [ ] Dark mode + forced colors: focus outline visible at ≥3:1 contrast

---

## Migration / Rollout

No data migrations required. All changes are UI/CSS/component logic.

Sprint 1 and Sprint 2 can be delivered in a single PR (estimated ~120-150 changed lines — well within 400-line budget). If the Collapsible ARIA investigation reveals unexpected complexity, P1-009 can be deferred to a follow-up PR.

---

## Open Questions

- [ ] **Collapsible ARIA (P0-002, P1-009):** Does `CollapsibleTrigger` from `@radix-ui/react-collapsible` already emit `aria-expanded` and handle keyboard activation natively? → Must confirm via DOM inspection during apply phase before deciding if manual override is needed.
- [ ] **Disabled contrast token (P1-002):** Is `disabled:opacity-70` the right value, or should a dedicated `--disabled-foreground` CSS token be added to `globals.css`? → Check rendered contrast value in both light and dark mode during apply.
