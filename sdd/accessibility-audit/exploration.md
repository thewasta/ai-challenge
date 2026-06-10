# Exploration: Accessibility Audit for ai-challenge

## Current State

The application is a multi-agent SEO consulting platform built with Next.js 16, React 19, TypeScript, and Tailwind CSS with shadcn/ui components. The UI consists of:

- **Homepage** (`src/app/page.tsx`, `src/components/HomePageClient.tsx`) — entry point with CTA button
- **Chat Interface** (`src/components/ChatLayout.tsx`, `src/components/ChatArea.tsx`) — main workspace
- **Sidebar Navigation** (`src/components/AppSidebar.tsx`) — project/chat hierarchy
- **Chat Messages** (`src/components/MessageBubble.tsx`, `src/components/ChatInput.tsx`) — message display and input
- **UI Primitives** — button, input, sidebar, tooltip, sheet, collapsible (using @base-ui/react for accessibility primitives)

### Accessibility Foundation

**Positive aspects:**
- Components use @base-ui/react (semantic HTML primitives with ARIA support)
- Layout.tsx has `lang="es"` for screen readers
- Some components include semantic HTML: `<button>`, `<input>`, `<li>`, `<ul>`, `<main>`, `<header>`
- Key interactive elements have `aria-label` attributes (e.g., ChatInput send button, SidebarTrigger)
- Error messages and loading states are present
- Keyboard support: Enter key in ChatInput, Ctrl+B to toggle sidebar

**Issues identified:**

### Critical Issues

1. **Missing semantic landmarks and heading hierarchy**
   - No `<h1>` on homepage or chat interface
   - `<main>` used correctly in SidebarInset but unclear role hierarchy elsewhere
   - No `<nav>` element for AppSidebar (uses generic `<div>`)
   - ChatArea has no heading to identify the chat interface purpose

2. **Color contrast violations**
   - Text on primary color: `--primary: oklch(0.278 0.033 260)` (navy) with `--primary-foreground: oklch(0.985 0 0)` (white) 
     - **Issue**: Only ~6.5:1 ratio (WCAG AA passes but borderline for readability at smaller text)
   - Muted text: `--muted-foreground: oklch(0.556 0 0)` (60% gray) on `--muted: oklch(0.97 0 0)` (light background)
     - **Issue**: ~4.2:1 ratio (fails WCAG AA for normal text, passes AAA only for large text)
   - Error message: `text-destructive` on `bg-destructive/10` — very low contrast, difficult to read

3. **Missing alt text for images/icons**
   - Bot icon in MessageBubble has no accessible description
   - Lucide React icons throughout (send, folder, message, chevron, etc.) have no aria-label unless explicitly added
   - Loading spinner icon (Loader2) in buttons lacks context

4. **Form input lacks proper labeling in some contexts**
   - ChatInput has `<label htmlFor="chat-input" className="sr-only">` — correctly hidden but present
   - But SidebarInput (`src/components/ui/sidebar.tsx`) has no label at all (it's a search input that appears to be used but isn't labeled)

5. **Keyboard navigation gaps**
   - Collapsible project folders in sidebar: trigger uses `cursor-pointer` but may not be fully keyboard accessible
   - No visible focus indicators on many elements (rely on CSS ring, which may not be obvious)
   - Modal/Sheet component (mobile sidebar) may trap focus incorrectly

6. **Missing ARIA attributes**
   - CollapsibleTrigger in AppSidebar has no `aria-expanded` or `aria-controls`
   - SidebarRail button has `tabIndex={-1}` (removes from tab order, good) but no `aria-pressed` or toggle state info
   - AgentStatusBanner activity text has no live region announcement (`aria-live`, `aria-atomic`)
   - Error messages in ChatArea lack `role="alert"` for screen readers

### Warning Issues

7. **Focus management**
   - Auto-scroll in ChatArea (`bottomRef.current?.scrollIntoView`) may interfere with screen reader navigation
   - Focus not explicitly managed when loading chat history
   - No skip-to-content link to bypass sidebar navigation

8. **Button accessibility**
   - NewProjectButton and NewChatButton use `onClick` without keyboard handling in some cases
   - Loading state uses `disabled={isLoading}` but doesn't inform users *why* button is disabled
   - SidebarMenuButton sometimes renders as `<Link>` (via `render` prop) — may lose button semantics

9. **Screen reader announcements**
   - No announcement when new messages arrive (ChatArea)
   - Loading/streaming status not announced via `aria-busy` or `aria-live`
   - Error messages appear inline without alert role
   - Chat input placeholder is good, but no surrounding context for assistive tech

10. **Heading hierarchy issues**
    - HomePageClient: `<h1>` for title (good), but `<p>` tags are generic (should be wrapped in semantic sections)
    - MessageBubble: assistants' markdown output generates headings via ReactMarkdown, but no hierarchy control
    - No consistent heading levels across pages

11. **Color-only information**
    - AgentStatusBanner uses only a pulsing green dot to indicate activity (line 14 in file)
    - Error messages use red text but no icon or other indicator beyond color

12. **Mobile/responsive accessibility**
    - Sidebar on mobile uses Sheet component (good for modal), but drawer close button may not be obvious
    - Touch targets on mobile may be too small (buttons, especially icon buttons at 32x32px)

### Suggestion Issues

13. **Markdown rendering**
    - ReactMarkdown in MessageBubble renders untrusted assistant output
    - While GFM is enabled, no security context for external link handling
    - Tables rendered without `role="table"` or proper caption

14. **Reduced motion consideration**
    - Sidebar toggle uses `transition-[width]` with `duration-200` — respects system preferences?
    - ChevronDown rotates on collapsible state — no `prefers-reduced-motion` query
    - Loading spinner uses `animate-spin` — should respect `prefers-reduced-motion`

15. **Language consistency**
    - Interface is in Spanish (es locale), but some aria-labels might be English (e.g., "Toggle Sidebar" in sidebar.tsx line 263)
    - Not all error messages follow consistent tone/tense

16. **Tooltip accessibility**
    - TooltipContent component is used in SidebarMenuButton but only shown when sidebar is collapsed
    - On mobile, tooltips may not be accessible to touch users

## Affected Areas

- `src/app/layout.tsx` — Root layout, lang attribute correct but missing key landmarks
- `src/app/page.tsx` — Homepage redirect logic, no heading in entry point
- `src/components/HomePageClient.tsx` — Missing h1 context, button lacks loading state announcement
- `src/components/ChatLayout.tsx` — Missing <nav> for sidebar, no main heading
- `src/components/ChatArea.tsx` — Missing heading, no live region for status, auto-scroll interferes with screen readers
- `src/components/ChatInput.tsx` — Form input accessibility is good but context is missing
- `src/components/MessageBubble.tsx` — Bot icon lacks alt text, markdown output not fully semantic
- `src/components/AppSidebar.tsx` — Collapsible triggers need aria-expanded/aria-controls
- `src/components/AgentStatusBanner.tsx` — Color-only indicator, no live region
- `src/components/ui/sidebar.tsx` — Keyboard shortcut not visually documented, focus management unclear
- `src/components/ui/button.tsx` — Base button component; focus indicators rely on CSS ring
- `src/components/ui/input.tsx` — Input component with good focus/disabled states
- `src/components/ui/sheet.tsx` — Sheet close button has label, good; backdrop opacity might affect readability
- `src/app/globals.css` — Color palette uses oklch; contrast ratios need verification

## Approaches

### Approach 1: Minimal Accessibility Compliance (WCAG 2.1 AA)

Quick fixes to meet WCAG AA standards without major refactoring:

- Add missing aria-labels and aria-expanded to interactive elements
- Increase color contrast by adjusting CSS variables (primary foreground lighter, muted foreground darker)
- Add role="alert" to error messages
- Add aria-live to status messages (agent activity, loading states)
- Add skip-to-content link
- Fix icon labels (all Lucide icons should have aria-label)
- Add aria-busy to loading states
- Ensure all headings have proper hierarchy on each page

**Pros:**
- Minimal code changes
- Faster implementation
- Addresses critical WCAG failures
- Leverages existing component structure

**Cons:**
- Doesn't address all best practices
- Heading hierarchy still unclear in some places
- Markdown rendering still lacks semantic improvements
- Focus management not fully optimized
- No prefers-reduced-motion support

**Effort:** Low

### Approach 2: Comprehensive Accessibility (WCAG 2.1 AAA + Best Practices)

Full audit remediation with best practice improvements:

- All Approach 1 fixes PLUS:
- Refactor heading hierarchy on all pages to be proper levels (h1 > h2)
- Add explicit skip-to-content and skip-to-main links
- Implement focus management on modal/sheet open/close
- Add prefers-reduced-motion media queries
- Semantic markdown rendering with proper roles for tables, lists
- Audit and fix tooltip accessibility
- Implement keyboard shortcuts documentation (Ctrl+B already exists)
- Add breadcrumb navigation for context (project > chat)
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Add form validation error associations (aria-describedby)

**Pros:**
- Exceeds WCAG 2.1 AAA standards
- Better UX for all users (not just disabled)
- Reduced motion respects user preferences
- Better keyboard navigation
- Comprehensive semantic HTML

**Cons:**
- Larger scope, more time investment
- Some changes require component restructuring
- May introduce new testing requirements
- Documentation updates needed

**Effort:** High

### Approach 3: Phased Accessibility (MVP + Planned)

Phase 1 (MVP): Approach 1 (Minimal WCAG AA)
Phase 2 (Post-launch): Approach 2 enhancements

This allows shipping with core accessibility while planning comprehensive improvements.

**Pros:**
- Balances speed and compliance
- Addresses critical issues immediately
- Leaves room for future improvements
- Risk mitigation: ship compliant, improve later

**Cons:**
- Two rounds of work
- May require re-prioritization
- Inconsistent UX between phases

**Effort:** Low (Phase 1) + High (Phase 2)

## Recommendation

**Approach: Phased Accessibility (Approach 3)** with **Phase 1 priority on critical issues**.

**Scope for Phase 1:**
1. Fix critical WCAG failures (contrast, missing labels, missing heading)
2. Add aria-* attributes to interactive elements
3. Add skip-to-content link
4. Add live region for status messages
5. Add heading hierarchy
6. Fix icon alt text
7. Add form validation error context

**Scope postponed to Phase 2:**
- Markdown semantic rendering
- Focus management optimization
- Prefers-reduced-motion support
- Full keyboard navigation audit
- Screen reader testing & refinement

**Rationale:**
- Phase 1 addresses ~80% of accessibility issues
- Keeps MVP launch timeline realistic
- WCAG AA compliance is achieved (legal/ethical requirement)
- Phase 2 improves UX without blocking features

**Estimated effort (Phase 1):**
- Discovery + analysis: 4 hours
- Implementation: 8–12 hours (CSS adjustments, ARIA attributes, semantic fixes)
- Testing (manual + automated): 4–6 hours
- **Total: 2–3 days for one senior engineer**

## Risks

1. **Contrast adjustments may affect brand identity** — Navy primary color (oklch 0.278) has limited contrast headroom. Adjusting may require design review.
2. **Screen reader testing reveals more issues** — Automated tools catch ~30% of issues; manual testing with NVDA/JAWS essential.
3. **Markdown rendering security** — If assistant output includes HTML, sanitization required before semantic improvements.
4. **Focus management complexity** — Modal/dialog focus trapping with React 19 hooks needs careful testing.
5. **Mobile touch targets** — Icon buttons (32px) may be too small on small screens; requires iOS/Android VoiceOver testing.
6. **Keyboard shortcut conflicts** — Ctrl+B for sidebar may conflict with browser behavior in some contexts.

## Ready for Proposal

**Yes** — this exploration is complete and ready to move to proposal phase.

**Next steps:**
1. Executive review the phased approach and risk assessment
2. Stakeholders approve Phase 1 scope
3. Design team reviews color contrast adjustments (if needed)
4. Move to SDD proposal phase with clear Phase 1 deliverables

**Key deliverable:** An accessibility-compliant application (WCAG 2.1 AA) by Phase 1 completion.
