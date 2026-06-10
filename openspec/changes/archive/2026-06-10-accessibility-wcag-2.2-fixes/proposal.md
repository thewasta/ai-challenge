# Proposal: WCAG 2.2 AA Accessibility Fixes

## Intent

The application currently scores 58/100 on Lighthouse accessibility audit — below the MVP launch requirement of 80+. This change brings the app into compliance with WCAG 2.2 AA standards by fixing 16 documented issues across two sprints: 5 critical (P0) and 6 serious (P1) blockers that prevent keyboard navigation, screen reader support, and semantic understanding. Compliance is necessary for agency/consultant users with assistive technology needs.

## Scope

### In Scope (Sprints 1 & 2)

**Sprint 1 — Critical (P0):** ~2-3h
- P0-001: Add `aria-hidden="true"` to decorative icons (10+ places: AppSidebar, MessageBubble, ChatArea, HomePageClient, AgentStatusBanner)
- P0-002: Implement keyboard handling for CollapsibleTrigger (Shift+focus should activate expand/collapse)
- P0-003: Add focus trap to modal dialogs (if any exist; validate first)
- P0-004: Add skip link at top of ChatLayout (`<a href="#main-content" className="sr-only focus:not-sr-only">`)
- P0-005: Audit all `<input>` elements for associated `<label>` or `aria-label`

**Sprint 2 — Serious (P1):** ~4-6h
- P1-001: Add custom image renderer to ReactMarkdown in MessageBubble (fallback alt text: "Imagen generada por el asistente")
- P1-002: Verify contrast ≥3:1 on disabled button/input states
- P1-003: Validate tab order follows visual flow in ChatLayout
- P1-004: Remove opacity from focus outline; use solid 2px currentColor
- P1-005: Respect `prefers-reduced-motion: reduce` in auto-scroll behavior
- P1-006: Wrap all animations (`animate-spin`, `animate-pulse`) in `@media (prefers-reduced-motion: reduce)`
- P1-007: Implement dynamic page titles via `generateMetadata()` in chat routes
- P1-008: Add `role="alert"` and `aria-live="polite"` to error messages
- P1-009: Validate ARIA attributes on Collapsible (`aria-expanded`, `aria-controls`)

### Out of Scope

- **Sprint 3 (P2 — Moderados):** Post-MVP. Low-impact fixes: target size refinement, link state indication, multimedia captions, etc.
- Manual screen reader testing: Automated checks via sdd-verify phase only
- Upstream shadcn/ui changes (work with installed component base)

## Capabilities

### Modified Capabilities

- **`initial-ui-chat-setup`**: UI/component rendering now MUST respect WCAG 2.2 AA accessibility requirements. Changes affect icon ARIA attributes, focus management, keyboard activation, and semantic markup.
- **`chat-persistence`**: If message rendering includes images/markdown, alt text fallbacks MUST be applied.

### New Capabilities

- **`accessibility-keyboard-navigation`**: Skip links, focus management, keyboard handling for non-native controls (e.g. Collapsible).
- **`accessibility-semantic-markup`**: ARIA attributes, roles, labels for icons, form controls, live regions, alerts.
- **`accessibility-motion-preferences`**: Respecting `prefers-reduced-motion` in animations and auto-scroll.
- **`accessibility-page-metadata`**: Dynamic page titles and descriptions for multi-route navigation.

## Approach

1. **Mechanical fixes first (P0-001, P0-004):** Icon aria-hidden, skip link — copy patterns from accessibility skill
2. **Component validation (P0-002, P0-005, P1-009):** Inspect shadcn Collapsible and form inputs; verify ARIA is already present or add explicitly
3. **CSS global rules (P1-004, P1-006):** Update globals.css — remove focus outline opacity, add `@media (prefers-reduced-motion: reduce)` block
4. **React hooks (P1-005, P1-007):** useEffect for prefers-reduced-motion media query; generateMetadata for dynamic titles
5. **Component logic (P1-001, P1-002, P1-003, P1-008):** Custom ReactMarkdown renderer, error message role/aria-live, contrast validation

## Affected Areas

| Area | Impact | Change |
|------|--------|--------|
| `src/components/AppSidebar.tsx` | Modified | Icons + aria-hidden; Collapsible keyboard/ARIA validation |
| `src/components/ChatArea.tsx` | Modified | Error role="alert"; prefers-reduced-motion scroll; tab order review |
| `src/components/ChatInput.tsx` | Modified | Label audit; disabled contrast check |
| `src/components/MessageBubble.tsx` | Modified | Custom ReactMarkdown image renderer (alt fallback) |
| `src/components/ChatLayout.tsx` | Modified | Skip link added |
| `src/components/HomePageClient.tsx` | Modified | Icons + aria-hidden |
| `src/components/AgentStatusBanner.tsx` | Modified | prefers-reduced-motion + spinner size |
| `src/app/globals.css` | Modified | Focus outline solid; @media prefers-reduced-motion block |
| `src/app/layout.tsx` | Modified | Dynamic metadata via generateMetadata() (if needed) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Collapsible or Modal components don't exist yet | Medium | Validate in sdd-spec phase; skip P0-003 if no modals |
| Focus outline color inheritance fails in some contexts | Low | Test focus state on light/dark backgrounds; fallback to explicit color if needed |
| prefers-reduced-motion media query breaks in older browsers | Low | Feature support is >95% (IE11 excluded, acceptable for MVP) |
| Markdown alt fallback is too generic; AI output is harmed | Low | Fallback only applied when alt="" or missing; users can still provide custom alt in markdown |

## Rollback Plan

1. Revert Git commits in reverse order: rollback P1 fixes first, then P0
2. No data migrations needed (all changes are UI/CSS/component logic)
3. Lighthouse score will drop back to 58/100; app remains functional but non-compliant
4. Estimated rollback time: <5 min (git reset)

## Success Criteria

- [ ] Lighthouse accessibility score ≥80/100 (target: 82-85 after Sprint 2)
- [ ] All P0 issues resolved (keyboard nav, skip link, icons, input labels)
- [ ] All P1 issues resolved (motion, focus, ARIA, metadata, alt text)
- [ ] sdd-verify phase runs a11y checks via @axe-core/cli or Lighthouse CI — no regressions
- [ ] Manual keyboard navigation (Tab, Enter, Escape, Arrow) works in ChatArea, Sidebar, Modals
- [ ] Dark mode maintains ≥3:1 contrast on focus outlines

## Timeline

- **Sprint 1 (P0):** 2-3h — blocker for launch readiness
- **Sprint 2 (P1):** 4-6h — must complete before MVP
- **Verification:** 1h — sdd-verify phase
- **Total:** 7-10h (est.)

---

**Status:** Ready for Spec & Design phases  
**Next:** sdd-spec to define accessibility capability specs; sdd-design to detail implementation patterns  
**Audit Reference:** `.agents/audits/RESUMEN_EJECUTIVO.md`, `.agents/audits/FINDINGS_BY_COMPONENT.md`
