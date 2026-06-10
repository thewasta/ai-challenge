# Accessibility: Keyboard Navigation Specification

**WCAG 2.2 AA Conformance**  
**Criteria Covered**: 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap), 2.4.1 (Skip Link)

---

## Purpose

Enable full keyboard accessibility by implementing skip links, managing focus within interactive regions, and ensuring keyboard activation for non-native controls (Collapsible, custom buttons). All functionality MUST be operable via keyboard alone.

---

## Requirements

### Requirement: Skip Link Implementation

The system MUST provide a skip link that allows keyboard users to bypass repetitive navigation (sidebar) and jump directly to main content.

**WCAG Criterion**: 2.4.1 — Skip Link (Sufficient Technique: G1)

The skip link MUST:
- Be the first focusable element on the page (or immediately after browser UI)
- Be visually hidden by default (use `.sr-only` class)
- Become visible on `:focus` or keyboard navigation
- Link to `#main-content` (or equivalent anchor)
- Use semantic anchor markup: `<a href="#..." className="sr-only focus:not-sr-only">`

#### Scenario: Keyboard user bypasses sidebar navigation

- **Given** a user on ChatLayout with AppSidebar (80 projects × 5 chats = 400 focusable sidebar items)
- **When** Tab is pressed immediately upon page load
- **Then**:
  - Focus moves to the skip link (visible on `:focus`)
  - Skip link label reads "Saltar a contenido principal" or "Skip to main content"
  - Pressing Enter navigates to `#main-content` anchor in ChatArea
  - User can immediately start typing in chat input without tabbing through sidebar

#### Scenario: Skip link is keyboard-only (no visual clutter)

- **Given** the page is rendered in default visual mode (no :focus state)
- **When** the page displays
- **Then**:
  - Skip link is not visible in normal viewport
  - Skip link is NOT hidden from screen readers (use `sr-only`, not `display: none`)
  - No layout shift occurs when skip link gains focus

---

### Requirement: Focus Management for Collapsible Trigger

The system MUST ensure Collapsible trigger (from shadcn/ui) handles keyboard activation correctly (Enter/Space to toggle expand/collapse).

**WCAG Criterion**: 2.1.1 — Keyboard  
**Component**: shadcn/ui `Collapsible` + `CollapsibleTrigger`

The Collapsible trigger MUST:
- Support Enter key activation (native behavior from role="button")
- Support Space key activation (native behavior from role="button")
- Update `aria-expanded` state when toggled
- Not trap focus (user can Tab out after activation)

#### Scenario: CollapsibleTrigger responds to Enter/Space keyboard activation

- **Given** a CollapsibleTrigger (expand/collapse project list) has focus
- **When** user presses Enter or Space
- **Then**:
  - Collapsible content immediately expands or collapses (depending on prior state)
  - `aria-expanded` attribute flips from "false" to "true" or vice versa
  - Next Tab press moves focus to next sibling or adjacent focusable element
  - No keyboard trap occurs

#### Scenario: Collapsible preserves tab order

- **Given** three projects in sidebar, each with CollapsibleTrigger
- **When** user tabs through the page
- **Then**:
  - Tab order is: skip link → trigger 1 → trigger 2 → trigger 3 → chat links → input → send button
  - No loops or skips occur
  - Tab + Shift reverses order predictably

---

### Requirement: Focus Trap Prevention in Modals (if applicable)

The system MUST ensure that keyboard focus does NOT trap inside modal dialogs or panel overlays.

**WCAG Criterion**: 2.1.2 — No Keyboard Trap (Sufficient Technique: G21)

If a modal/dialog exists, it MUST:
- Allow Tab/Shift+Tab to cycle through focusable elements **within** the modal only
- Allow Escape key to close the modal and return focus to trigger element
- NOT prevent focus from exiting when dialog is closed

#### Scenario: Modal does not trap keyboard focus

- **Given** a modal dialog is open (e.g., delete confirmation)
- **When** user presses Tab repeatedly in the modal
- **Then**:
  - Focus cycles through modal buttons/inputs only
  - Focus does NOT escape to background content
  - Pressing Escape closes the modal
  - Focus returns to the element that opened the modal

#### Scenario: Modal closed via Escape returns focus correctly

- **Given** a modal is open and user presses Escape
- **When** the modal closes
- **Then**:
  - Modal is removed from DOM or hidden (aria-hidden="true")
  - Focus restores to the trigger element that opened the modal
  - Tab continues navigation from the trigger element

---

### Requirement: Keyboard Activation for Non-Native Controls

The system MUST ensure that any custom button or interactive element (non-`<button>`, non-`<a>`) that requires keyboard activation is properly configured.

**WCAG Criterion**: 2.1.1 — Keyboard

For any `<div role="button">` or custom interactive element, the implementation MUST:
- Set `tabindex="0"` to make the element focusable
- Listen to `keydown` events: Enter and Space MUST activate the element
- Execute the same action as a click event
- NOT double-fire on native `<button>` elements (Enter/Space are already native)

#### Scenario: Custom interactive element activates via keyboard

- **Given** a custom control (if any exists) marked with `role="button"`
- **When** user focuses the element and presses Enter or Space
- **Then**:
  - The element activates (executes onClick or onKeyDown handler)
  - Visual/screen-reader feedback occurs immediately
  - No duplicate events fire
  - Focus remains on the element (or moves per design)

#### Scenario: Native button elements do NOT have duplicate key handlers

- **Given** a native `<button>` element in the UI
- **When** user presses Enter or Space while focused
- **Then**:
  - Browser's native button activation fires (single event)
  - No custom keydown listener adds a second activation
  - User sees one action executed, not two

---

## Acceptance Criteria

- [ ] Skip link is present and visible on `:focus` in ChatLayout
- [ ] Skip link jumps to `#main-content` anchor in ChatArea
- [ ] CollapsibleTrigger in AppSidebar responds to Enter/Space with expand/collapse toggle
- [ ] `aria-expanded` attribute updates correctly on Collapsible toggle
- [ ] Tab order is logical and follows visual flow (no skips or loops)
- [ ] Escape key (if modals exist) closes modals and restores focus
- [ ] No keyboard trap can be created by rapid Tab/Shift+Tab cycling
- [ ] Custom controls (if any) do not have duplicate key event handlers on native buttons
- [ ] All keyboard interactions pass axe-core accessibility checks
- [ ] Manual keyboard navigation (Tab, Enter, Space, Escape) works as specified

---

## Implementation Notes

- Leverage shadcn/ui `Collapsible` component — it handles `aria-expanded` automatically
- Use Next.js `useRouter()` with client-side handlers for focus restoration on modal close
- Test keyboard navigation with Chrome DevTools (Disable JavaScript → Tab key tracing)
- Use VoiceOver (Mac) or NVDA (Windows) to verify screen reader announces state changes
