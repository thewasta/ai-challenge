# Tasks: WCAG 2.2 AA Accessibility Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180–220 (additions + deletions) |
| 1300-line budget risk | **Low** |
| Chained PRs recommended | No |
| Delivery strategy | ask-always |

**Decision needed before apply**: No  
**Chained PRs recommended**: No  
**Chain strategy**: Not needed (single PR, well under budget)  
**1300-line budget risk**: Low  

---

## Implementation Strategy

All changes are **mechanical** (attribute additions), **CSS-only** (no JS framework changes), or **simple logic** (motion checks, image renderer). No new dependencies. No database migrations. Changes are isolated by component; can be applied independently but ordered for logical progression.

**Rationale for no chaining**: Even combined, Sprint 1 + Sprint 2 total ~180–220 lines (icon `aria-hidden` additions, CSS rules, simple hooks). This is well below the 1300-line budget. A single PR keeps review focused and avoids PR coordination overhead.

---

## Phase 1: Foundation — CSS & Global Rules (Sprint 1)

- [x] **1.1** Update `src/app/globals.css`: Remove outline opacity from `:focus-visible`, replace `outline-ring/50` with solid 2px currentColor, add `scroll-margin-top: 3.5rem` to prevent header overlap
  - **Files**: `src/app/globals.css`
  - **Spec Reference**: `accessibility-motion-preferences` (2.4.11, motion rules prep)
  - **Estimate**: 10m
  - **Dependencies**: None
  - **Verification**: DevTools inspect `:focus-visible` rule; no opacity in output

- [x] **1.2** Add `@media (prefers-reduced-motion: reduce)` block to `src/app/globals.css` at end of file
  - **Files**: `src/app/globals.css`
  - **Spec Reference**: `accessibility-motion-preferences` (2.3.3)
  - **Estimate**: 5m
  - **Dependencies**: 1.1 (same file)
  - **Verification**: Toggle `prefers-reduced-motion` in DevTools; all animations should collapse to 0.01ms

---

## Phase 2: Mechanical Icon Fixes (Sprint 1)

- [x] **2.1** Add `aria-hidden="true"` to 4 decorative icons in `src/components/AppSidebar.tsx` (Folder, ChevronDown, MessageSquare, Zap)
  - **Files**: `src/components/AppSidebar.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 10m
  - **Dependencies**: None
  - **Verification**: Axe audit: no redundant icon announcements; grep `aria-hidden` confirms presence

- [x] **2.2** Add `aria-hidden="true"` to 2 decorative icons in `src/components/ChatInput.tsx` (Loader2, Send)
  - **Files**: `src/components/ChatInput.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 8m
  - **Dependencies**: None
  - **Verification**: Axe audit; button aria-label from `.sr-only` text only

- [x] **2.3** Add `aria-hidden="true"` to 3 decorative icons in `src/components/HomePageClient.tsx` (Zap, Plus, Loader2)
  - **Files**: `src/components/HomePageClient.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 8m
  - **Dependencies**: None
  - **Verification**: Axe audit on home page

- [x] **2.4** Add `aria-hidden="true"` to 2 decorative icons in `src/components/ChatArea.tsx` (MessageSquare, existing icons in loading state)
  - **Files**: `src/components/ChatArea.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 8m
  - **Dependencies**: None
  - **Verification**: Axe audit on chat page

- [x] **2.5** Add `aria-hidden="true"` to Bot icon in `src/components/MessageBubble.tsx`
  - **Files**: `src/components/MessageBubble.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 5m
  - **Dependencies**: None
  - **Verification**: Axe audit on message render

---

## Phase 3: Component ARIA & Semantic Enhancements (Sprint 1)

- [x] **3.1** Verify CollapsibleTrigger in `src/components/AppSidebar.tsx` exposes `aria-expanded` and responds to Enter/Space (no changes likely needed; verify via DOM inspection)
  - **Files**: `src/components/AppSidebar.tsx`
  - **Spec Reference**: `accessibility-keyboard-navigation` (2.1.1), `accessibility-semantic-markup` (4.1.2)
  - **Estimate**: 10m
  - **Dependencies**: None
  - **Verification**: Tab + Enter/Space toggles Collapsible; DevTools inspect aria-expanded state change

- [x] **3.2** Add `id="main-content"` to ChatArea wrapper div in `src/components/ChatArea.tsx`
  - **Files**: `src/components/ChatArea.tsx`
  - **Spec Reference**: `accessibility-keyboard-navigation` (2.4.1)
  - **Estimate**: 3m
  - **Dependencies**: None
  - **Verification**: Skip link href matches this id

- [x] **3.3** Add skip link as first focusable child in `src/components/ChatLayout.tsx` (inside SidebarInset, before header)
  - **Files**: `src/components/ChatLayout.tsx`
  - **Spec Reference**: `accessibility-keyboard-navigation` (2.4.1)
  - **Estimate**: 10m
  - **Dependencies**: 3.2 (skip link target must exist)
  - **Verification**: Tab on page load focuses skip link; Enter jumps to ChatInput; no layout shift

- [x] **3.4** Update `ChatInput` label in `src/components/ChatInput.tsx` to include keyboard hint ("Shift+Enter para nueva línea")
  - **Files**: `src/components/ChatInput.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (4.1.2)
  - **Estimate**: 3m
  - **Dependencies**: None
  - **Verification**: Screen reader announces hint on input focus

- [x] **3.5** Add `.sr-only` text wrapper to send button in `src/components/ChatInput.tsx` (visible state: "Enviar mensaje", loading state: "Enviando...")
  - **Files**: `src/components/ChatInput.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 5m
  - **Dependencies**: 2.2 (icons already have aria-hidden)
  - **Verification**: Screen reader announces button purpose; no icon announced

- [x] **3.6** Apply `disabled:opacity-70` to ChatInput Button and Input components (override default `disabled:opacity-50`) in `src/components/ChatInput.tsx`
  - **Files**: `src/components/ChatInput.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.4.11 contrast on disabled state)
  - **Estimate**: 5m
  - **Dependencies**: None
  - **Verification**: Measure disabled button text/background contrast ≥3:1 in light and dark mode

- [x] **3.7** Add error message ARIA attributes in `src/components/ChatArea.tsx` (role="status" + aria-live="polite" on error divs; optional aria-atomic="true")
  - **Files**: `src/components/ChatArea.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (4.1.3)
  - **Estimate**: 8m
  - **Dependencies**: None
  - **Verification**: Trigger error; screen reader announces message; no focus movement

---

## Phase 4: Motion-Aware Scroll & Animations (Sprint 1–2)

- [x] **4.1** Add motion preference check to ChatArea auto-scroll in `src/components/ChatArea.tsx` (inline `window.matchMedia` check in existing useEffect)
  - **Files**: `src/components/ChatArea.tsx`
  - **Spec Reference**: `accessibility-motion-preferences` (2.2.3)
  - **Estimate**: 8m
  - **Dependencies**: 1.2 (CSS @media rule provides fallback)
  - **Verification**: OS reduced-motion enabled → scroll is instant; disabled → smooth; Lighthouse audit confirms

- [x] **4.2** Update AgentStatusBanner spinner in `src/components/AgentStatusBanner.tsx` to use Tailwind motion-safe/motion-reduce variants (animate-pulse conditional or static opacity)
  - **Files**: `src/components/AgentStatusBanner.tsx`
  - **Spec Reference**: `accessibility-motion-preferences` (2.3.3)
  - **Estimate**: 8m
  - **Dependencies**: 1.2 (CSS @media rule)
  - **Verification**: Spinner static when motion reduced; animates when allowed

---

## Phase 5: Custom Markdown Image Renderer (Sprint 2)

- [x] **5.1** Create custom image renderer component in `src/components/MessageBubble.tsx` at module level (before component definition) with fallback alt text logic
  - **Files**: `src/components/MessageBubble.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1), `chat-persistence` delta spec
  - **Estimate**: 12m
  - **Dependencies**: None
  - **Verification**: Render markdown with missing alt; image shows fallback "Imagen generada por el asistente"; screen reader announces fallback

- [x] **5.2** Pass custom image renderer to ReactMarkdown `components` prop in `src/components/MessageBubble.tsx`
  - **Files**: `src/components/MessageBubble.tsx`
  - **Spec Reference**: `accessibility-semantic-markup` (1.1.1)
  - **Estimate**: 3m
  - **Dependencies**: 5.1
  - **Verification**: ReactMarkdown renders via custom component; no console warnings

---

## Phase 6: Dynamic Page Metadata (Sprint 2)

- [x] **6.1** Add `generateMetadata()` export to `src/app/projects/[id]/chats/[chatId]/page.tsx` with fallback for missing chats/projects
  - **Files**: `src/app/projects/[id]/chats/[chatId]/page.tsx`
  - **Spec Reference**: `accessibility-page-metadata` (2.4.2)
  - **Estimate**: 15m
  - **Dependencies**: None (can query project/chat data in parallel with component)
  - **Verification**: Navigate to chat → browser title updates; fallback appears on 404; DevTools inspect `<title>` tag

---

## Phase 7: Verification & Testing (Sprint 2)

- [ ] **7.1** Run axe-core CLI audit on home page and chat page (dev server running)
  - **Command**: `pnpm exec axe http://localhost:3000` && `pnpm exec axe http://localhost:3000/projects/1/chats/1`
  - **Spec Reference**: All specs
  - **Estimate**: 10m
  - **Dependencies**: 1.1–6.1 (all tasks complete)
  - **Verification**: Target: 0 critical/serious violations; pass all accessibility checks

- [x] **7.2** Run Lighthouse accessibility audit on chat page
  - **Command**: `pnpm exec lighthouse http://localhost:3000/projects/1/chats/1 --only-categories=accessibility --output=json`
  - **Spec Reference**: All specs
  - **Estimate**: 5m
  - **Dependencies**: 1.1–6.1
  - **Verification**: Score ≥80/100; report saved

- [ ] **7.3** Manual keyboard navigation smoke test (Tab, Enter, Space, Escape)
  - **Steps**: Load chat page → Tab on page load (skip link visible) → Enter (focus jumps to ChatInput) → Tab through sidebar (CollapsibleTrigger responds to Enter/Space) → no traps
  - **Spec Reference**: `accessibility-keyboard-navigation`
  - **Estimate**: 10m
  - **Dependencies**: 3.1–3.5 (keyboard handling)
  - **Verification**: All interactions work as documented; no keyboard traps

- [ ] **7.4** Manual motion preference test
  - **Steps**: Enable `prefers-reduced-motion: reduce` in DevTools → reload → spinner is static → send message → scroll is instant → disable preference → animations resume
  - **Spec Reference**: `accessibility-motion-preferences`
  - **Estimate**: 8m
  - **Dependencies**: 1.2, 4.1, 4.2
  - **Verification**: Preference respected in all contexts

---

## Summary by Sprint

### Sprint 1 (P0 — Critical)
**Tasks**: 1.1–1.2, 2.1–2.5, 3.1–3.6, 4.1–4.2  
**Focus**: Foundation CSS, icon aria-hidden, keyboard activation, skip link, disabled contrast  
**Estimated Time**: 2–3h  
**Completion Criteria**: Lighthouse ≥75/100; keyboard nav works; no opacity on focus

### Sprint 2 (P1 — Serious)
**Tasks**: 5.1–5.2, 6.1, 7.1–7.4  
**Focus**: Image alt fallback, dynamic titles, verification  
**Estimated Time**: 3–4h  
**Completion Criteria**: Lighthouse ≥80/100; axe-core 0 violations; motion preference works

---

## Task Ordering Rationale

1. **CSS first** (Phase 1): Foundation for all components; `:focus-visible` and motion rules affect everything
2. **Icon fixes** (Phase 2): Mechanical, high-impact, no dependencies
3. **Component ARIA** (Phase 3): Builds on CSS; enables keyboard and semantic enhancements
4. **Motion awareness** (Phase 4): Leverages CSS foundation from Phase 1
5. **Custom renderers** (Phase 5): Independent, can happen in parallel with 4.1–4.2
6. **Metadata** (Phase 6): Independent route-level change
7. **Verification** (Phase 7): Last, aggregates all changes

---

## File Summary

| File | Sprint | Tasks | Changes |
|------|--------|-------|---------|
| `src/app/globals.css` | 1 | 1.1–1.2 | Remove opacity, add motion rule, scroll-margin |
| `src/components/AppSidebar.tsx` | 1 | 2.1, 3.1 | aria-hidden on 4 icons; verify Collapsible ARIA |
| `src/components/ChatInput.tsx` | 1 | 2.2, 3.4–3.6 | aria-hidden on icons; label update; .sr-only button text; disabled:opacity-70 |
| `src/components/HomePageClient.tsx` | 1 | 2.3 | aria-hidden on 3 icons |
| `src/components/ChatArea.tsx` | 1–2 | 2.4, 3.2, 3.7, 4.1 | aria-hidden on icons; id="main-content"; error ARIA; motion-aware scroll |
| `src/components/ChatLayout.tsx` | 1 | 3.3 | Skip link as first child |
| `src/components/MessageBubble.tsx` | 2 | 2.5, 5.1–5.2 | aria-hidden on Bot icon; custom image renderer |
| `src/components/AgentStatusBanner.tsx` | 1–2 | 4.2 | Motion-safe/motion-reduce spinner variants |
| `src/app/projects/[id]/chats/[chatId]/page.tsx` | 2 | 6.1 | generateMetadata() export |

---

## Acceptance Criteria

- [ ] All 20 tasks completed and verified per spec
- [ ] Lighthouse accessibility score ≥80/100
- [ ] axe-core CLI: 0 critical/serious violations
- [ ] Keyboard navigation (Tab, Enter, Space, Escape) works end-to-end
- [ ] Motion preference respected: animations disabled when `prefers-reduced-motion: reduce`
- [ ] Focus visible with solid 2px outline (no opacity, no obscuration by header)
- [ ] Error messages announced to screen readers
- [ ] Skip link functional and first focusable element
- [ ] Icon aria-hidden applied consistently (10+ locations)
- [ ] Page titles dynamic and descriptive
- [ ] All form inputs have associated labels or aria-label
- [ ] No visual regression on light/dark mode
- [ ] No console accessibility warnings
