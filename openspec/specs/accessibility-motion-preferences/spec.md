# Accessibility: Motion and Timing Preferences Specification

**WCAG 2.2 AA Conformance**  
**Criteria Covered**: 2.2.3 (Animation from Interactions), 2.3.3 (Animation from Transitions)

---

## Purpose

Respect user preferences for reduced motion, ensuring animations and auto-scroll behaviors do not cause distraction or discomfort for users with vestibular disorders or motion sensitivity.

---

## Requirements

### Requirement: Auto-Scroll Respects `prefers-reduced-motion`

The system MUST check the `prefers-reduced-motion` media query before executing auto-scroll behavior.

**WCAG Criterion**: 2.2.3 — Animation from Interactions

When scrolling to new messages or bottom of chat:
- If `prefers-reduced-motion: reduce` is detected: use `behavior: "auto"` (instant scroll)
- If motion is allowed: use `behavior: "smooth"` (smooth animation, optional)

#### Scenario: User with motion preference sees instant scroll

- **Given** user has `prefers-reduced-motion: reduce` enabled in OS (macOS: System Preferences > Accessibility > Display > Reduce motion)
- **WHEN** new chat message arrives and component calls `scrollIntoView({ behavior: "smooth" })`
- **THEN**:
  - Scroll is instant, not animated
  - User is not exposed to motion that could trigger vestibular discomfort
  - New message is visible immediately

#### Scenario: User without motion preference sees smooth scroll

- **Given** user has NOT enabled `prefers-reduced-motion: reduce`
- **WHEN** new message arrives
- **THEN**:
  - Scroll animation plays smoothly over ~300ms
  - User sees visual feedback of new content location
  - User experience is polished

#### Scenario: Scroll margin prevents focus obscuration

- **Given** a new message receives focus after scrolling into view
- AND the chat header is sticky (position: sticky)
- **WHEN** the message scrolls into viewport
- **THEN**:
  - Message does NOT scroll behind the sticky header
  - Use `scroll-margin-top: [header-height]` to reserve space

---

### Requirement: CSS Animations Respect `prefers-reduced-motion`

The system MUST wrap all CSS animations in `@media (prefers-reduced-motion: reduce)` to disable or minimize motion.

**WCAG Criterion**: 2.3.3 — Animation from Transitions

**Global Scope**: All Tailwind animations used across the project (e.g., `animate-spin`, `animate-pulse`, `animate-bounce`)

All animations MUST be disabled when user prefers reduced motion:

```css
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

#### Scenario: Spinner animation is disabled for users with motion preference

- **Given** a loading spinner uses `animate-spin` (Tailwind animation)
- AND user has `prefers-reduced-motion: reduce` enabled
- **WHEN** the spinner displays
- **THEN**:
  - Spinner is static (no rotation animation)
  - User still sees the loading indicator (icon is present)
  - No motion-triggered discomfort occurs

#### Scenario: Transition animations are minimized

- **Given** a button has a hover transition: `transition-colors duration-300`
- AND user enables `prefers-reduced-motion: reduce`
- **WHEN** user hovers the button
- **THEN**:
  - Color change is immediate (duration: 0.01ms)
  - No smooth transition animation plays
  - Button feedback is still visual but not animated

#### Scenario: Auto-scroll and smooth scroll are disabled together

- **Given** `scroll-behavior: smooth` is applied in CSS
- AND `prefers-reduced-motion: reduce` is active
- **WHEN** page scrolls (auto-scroll or link anchor navigation)
- **THEN**:
  - Scroll is instant (behavior: auto effective)
  - No smooth scroll animation plays
  - User experiences immediate viewport shift

---

### Requirement: AgentStatusBanner Respects Motion Preferences

The system MUST ensure animated spinner in AgentStatusBanner (if present) respects motion preferences.

**WCAG Criterion**: 2.3.3 — Animation from Transitions  
**Component**: AgentStatusBanner (or equivalent status display)

If a spinner or loading animation exists:
- Check `prefers-reduced-motion` on component mount
- Apply `animate-spin` if motion is allowed
- Apply no animation class if motion is reduced
- OR use global CSS rule to disable animation automatically

#### Scenario: Agent status spinner disables animation

- **Given** AgentStatusBanner displays "Agent thinking..." with spinner
- AND user has motion reduction enabled
- **WHEN** the banner renders
- **THEN**:
  - Spinner icon is visible but static (no rotation)
  - Text "Agent thinking..." is still visible
  - No vestibular trigger occurs

#### Scenario: Reduced motion preference persists across navigation

- **Given** user enables `prefers-reduced-motion: reduce` in OS
- AND navigates between pages
- **WHEN** each page renders a spinner or auto-scroll
- **THEN**:
  - Preference persists (browser/OS preference checked each render)
  - All animations on all pages respect the preference
  - No page requires user to re-enable motion preference

---

### Requirement: CSS Global Rule for Motion Reduction

The system MUST include a global CSS rule in `src/app/globals.css` that disables animations when `prefers-reduced-motion: reduce` is detected.

**Location**: `src/app/globals.css`

The rule MUST appear early (before component-specific styles) and use `!important` to ensure it overrides component animations.

#### Scenario: Global CSS rule disables all animations

- **Given** the following rule exists in `globals.css`:
  ```css
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
- **WHEN** any component uses `animation-*` or `transition-*` classes
- **THEN**:
  - Animation is disabled globally (no component override needed)
  - Developers do not need to add motion checks to individual components

#### Scenario: Tailwind animations are minimized by global rule

- **Given** a component uses `animate-spin`, `animate-pulse`, `animate-bounce`
- AND `prefers-reduced-motion: reduce` is active
- **WHEN** the page renders
- **THEN**:
  - All animations collapse to 0.01ms duration
  - All animations play only 1 iteration
  - Visual feedback remains (icon present, but not moving)

---

### Requirement: JavaScript prefers-reduced-motion Hook

The system MAY implement a custom React hook to detect motion preference in JavaScript for dynamic scroll behavior.

**WCAG Criterion**: 2.2.3 — Animation from Interactions

Optional: Create a reusable hook for components that need to check motion preference at runtime.

```typescript
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

// Usage in ChatArea:
const prefersReducedMotion = usePrefersReducedMotion();
if (!prefersReducedMotion) {
  messageRef.current?.scrollIntoView({ behavior: "smooth" });
} else {
  messageRef.current?.scrollIntoView({ behavior: "auto" });
}
```

#### Scenario: Hook detects motion preference change at runtime

- **Given** a page is loaded with motion allowed
- WHEN user enables `prefers-reduced-motion: reduce` in OS while page is open
- **THEN**:
  - Hook detects the change (via `change` event listener)
  - Component updates behavior dynamically (no page reload needed)
  - Future scrolls use instant behavior

#### Scenario: Hook returns false by default (motion allowed)

- **Given** a fresh page load with no motion preference set
- **WHEN** `usePrefersReducedMotion()` is called
- **THEN**:
  - Hook returns `false` (motion is allowed by default)
  - Animations and smooth scrolling play normally

---

## Acceptance Criteria

- [ ] `prefers-reduced-motion: reduce` CSS rule exists in `globals.css`
- [ ] Auto-scroll in ChatArea checks motion preference before `scrollIntoView()`
- [ ] Spinner in AgentStatusBanner is static when motion is reduced
- [ ] All Tailwind `animate-*` classes are disabled by global rule
- [ ] Smooth scroll transitions collapse to 0.01ms when motion is reduced
- [ ] `usePrefersReducedMotion` hook (if implemented) detects preference dynamically
- [ ] Motion preference is read from browser/OS, not hardcoded
- [ ] No animations play when `prefers-reduced-motion: reduce` is enabled
- [ ] Animations resume when preference is disabled
- [ ] Manual keyboard navigation (Tab, Enter, etc.) is NOT affected by motion preference

---

## Testing Steps

1. **macOS**: System Preferences > Accessibility > Display > Enable "Reduce motion"
2. **Windows**: Settings > Ease of Access > Display > Turn on "Show animations"
3. **Browser DevTools**: DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion`
4. Reload page and verify animations do NOT play
5. Test auto-scroll by sending a chat message — scroll should be instant
6. Test spinner — icon should be static or minimally animated
7. Disable preference and reload — animations should resume
