# Accessibility: Semantic Markup and ARIA Specification

**WCAG 2.2 AA Conformance**  
**Criteria Covered**: 1.1.1 (Text Alternatives), 4.1.2 (ARIA States/Properties), 4.1.3 (Status Messages)

---

## Purpose

Ensure all content is semantically meaningful and properly labeled for assistive technologies. ARIA attributes MUST be used to supplement DOM semantics, and all icons, form controls, and dynamic content MUST have accessible names and descriptions.

---

## Requirements

### Requirement: Decorative Icons Use `aria-hidden="true"`

The system MUST hide decorative icons from assistive technologies using `aria-hidden="true"`.

**WCAG Criterion**: 1.1.1 — Text Alternatives  
**Component Scope**: AppSidebar, MessageBubble, ChatArea, HomePageClient, AgentStatusBanner

An icon is **decorative** when:
- It provides no additional information (e.g., a folder icon next to project name that is already text)
- The text label alone conveys the function
- Removing the icon does not reduce understanding

For decorative icons, MUST use:
```jsx
<Icon aria-hidden="true" />
```

#### Scenario: Decorative folder icon in project list does not expose to screen readers

- **Given** a project list item with text "Project A" and a folder icon
- **When** a screen reader scans the page
- **Then**:
  - Screen reader announces: "Project A" (not "folder Project A")
  - Icon is completely hidden from screen reader (aria-hidden="true" applied)
  - Visual appearance unchanged

#### Scenario: Icon without accessible name announces redundantly

- **Given** a message bubble with avatar icon and text "Assistant:"
- **When** icon does NOT have aria-hidden="true"
- **Then** (incorrect — for illustration):
  - Screen reader announces: "image, Assistant:" (redundant)
  - (This MUST be fixed by adding aria-hidden="true")

#### Scenario: Multiple decorative icons in one control stay hidden

- **Given** a button with [Loader2 spinner, Send icon, text "Sending..."]
- **When** the button is loading
- **Then**:
  - Screen reader announces: "Sending..." (only text or aria-label)
  - Both icons have aria-hidden="true"
  - No double announcements occur

---

### Requirement: Icon Buttons Have Accessible Names

The system MUST provide accessible names for icon-only buttons using `aria-label` or visually hidden text.

**WCAG Criterion**: 1.1.1 — Text Alternatives

Icon-only buttons MUST have one of:
- `aria-label="[descriptive name]"` — preferred for simple cases
- Child text with `.sr-only` class — for longer descriptions
- Native `<button>` with tooltip (tested with screen reader)

#### Scenario: Icon button has aria-label

- **Given** a send button with only a Send icon
- **When** a screen reader encounters the button
- **Then**:
  - Screen reader announces: "Send" (from aria-label)
  - User knows the button's purpose without guessing

#### Scenario: Icon button without aria-label is inaccessible

- **Given** a button: `<button><Send /></button>` (no aria-label, no text)
- **When** screen reader scans it
- **Then** (incorrect — MUST fix):
  - Screen reader announces: "button" (no purpose)
  - (Fix by adding aria-label="Send message")

---

### Requirement: Form Inputs Have Associated Labels

The system MUST ensure all form inputs have programmatically associated `<label>` elements or `aria-label`.

**WCAG Criterion**: 4.1.2 — ARIA States/Properties  
**Scope**: ChatInput, any future form fields

Each input MUST use one of:
- Explicit label: `<label htmlFor="input-id">Text</label><input id="input-id" />`
- Implicit label: `<label>Text<input /></label>`
- aria-label: `<input aria-label="Text" />`

#### Scenario: Text input with explicit label

- **Given** a chat message input
- **When** screen reader focuses the input
- **Then**:
  - Screen reader announces: "Edit text, Escribe tu mensaje..." (from label)
  - User knows what to type

#### Scenario: Input with visually hidden label (sr-only)

- **Given** an input with `.sr-only` label (no visual label on screen)
- **When** screen reader focuses input
- **Then**:
  - Screen reader announces the label
  - Visual design is not cluttered
  - Accessibility is maintained

---

### Requirement: Collapsible Has Correct ARIA Attributes

The system MUST ensure Collapsible components expose `aria-expanded` and `aria-controls` correctly.

**WCAG Criterion**: 4.1.2 — ARIA States/Properties  
**Component**: shadcn/ui `Collapsible`

CollapsibleTrigger MUST have:
- `aria-expanded="true"` when content is visible
- `aria-expanded="false"` when content is hidden
- `aria-controls="[content-id]"` pointing to the collapsible content container

#### Scenario: Collapsible expanded state is announced

- **Given** a project list item with Collapsible (expanded by default)
- **When** screen reader scans the trigger
- **Then**:
  - Screen reader announces: "button, Project A, expanded"
  - When collapsed, announces: "button, Project A, collapsed"
  - State change is audible when toggled

#### Scenario: aria-controls links trigger to content

- **Given** a CollapsibleTrigger with `aria-controls="project-1-chats"`
- AND the collapsible content has `id="project-1-chats"`
- **When** screen reader follows the relationship
- **Then**:
  - Screen reader can navigate from trigger to its controlled content
  - Relationship is explicit in accessibility tree

---

### Requirement: Dynamic Content Uses Live Regions

The system MUST announce dynamic status changes (error messages, loading states) to screen reader users via `aria-live` regions.

**WCAG Criterion**: 4.1.3 — Status Messages (New in WCAG 2.2)

Dynamic messages (errors, alerts) MUST use:
```jsx
<div role="alert" aria-live="polite">
  [Dynamic message content]
</div>
```

Properties:
- `role="alert"` — announces immediately (implicitly sets `aria-live="assertive"`)
- `aria-live="polite"` — waits for a pause in speech; use for non-critical updates
- `aria-atomic="true"` — announce entire region, not just changes (for alerts)

#### Scenario: Error message announced to screen reader

- **Given** a chat message fails to send
- **When** error appears in UI
- **Then**:
  - Screen reader announces: "Alert: Error sending message" (from role="alert")
  - User is notified without moving focus
  - Error persists in DOM until dismissed

#### Scenario: Loading status is politely announced

- **Given** a message is streaming
- **WHEN** UI updates with "Respuesta en progreso..."
- **Then**:
  - Screen reader announces after current speech finishes (polite)
  - User hears: "Status: Response in progress"
  - Announcement does NOT interrupt current screen reader speech

#### Scenario: Multiple alerts are not over-announced

- **Given** two error messages in separate role="alert" regions
- **When** both appear simultaneously
- **Then**:
  - Screen reader announces both (not merged)
  - Each alert is individually perceivable

---

### Requirement: Markdown Image Fallback Alt Text

The system MUST ensure markdown-rendered images have alt text, using a default fallback if the markdown source omits it.

**WCAG Criterion**: 1.1.1 — Text Alternatives  
**Component**: MessageBubble (ReactMarkdown renderer)

ReactMarkdown MUST use a custom image component that:
- Accepts `alt` prop from markdown
- If `alt` is empty or missing, uses fallback: "Imagen generada por el asistente"
- Never renders `<img alt="">` (empty alt implies decorative, but AI images need description)

#### Scenario: Markdown with alt text is preserved

- **Given** markdown from AI: `![Gráfico de resultados](chart.png "Results chart")`
- **When** ReactMarkdown renders
- **Then**:
  - Image renders with `alt="Gráfico de resultados"`
  - Screen reader announces: "image, Gráfico de resultados"

#### Scenario: Markdown without alt text uses fallback

- **Given** markdown from AI: `![](chart.png)` (no alt text)
- **When** ReactMarkdown renders
- **Then**:
  - Image renders with `alt="Imagen generada por el asistente"`
  - User is informed the image is AI-generated, not left guessing

#### Scenario: Missing markdown image src with alt still accessible

- **Given** markdown: `![Chart description]()`  (missing src)
- **When** ReactMarkdown attempts to render
- **Then**:
  - Component does NOT crash
  - Fallback alt is applied if image renders
  - Or image is skipped gracefully with warning logged

---

### Requirement: Error Messages Marked with `role="alert"`

The system MUST ensure error messages are announced to screen readers using `role="alert"`.

**WCAG Criterion**: 4.1.3 — Status Messages

Error containers MUST use:
```jsx
<div role="alert" aria-live="assertive" aria-atomic="true">
  [Error message with icon + text]
</div>
```

#### Scenario: API error is announced immediately

- **Given** a chat API request fails with message "Connection timeout"
- **When** error appears in ChatArea
- **Then**:
  - Screen reader announces: "Alert: Connection timeout"
  - User is informed of the error without visual inspection
  - Error message persists until dismissed or retried

#### Scenario: Form validation error is accessible

- **Given** a required input is submitted empty
- **When** error displays below the input
- **Then**:
  - Error message has `id="error-msg-1"` (or similar)
  - Input has `aria-describedby="error-msg-1"` pointing to the error
  - Screen reader announces: "Edit text, [label], invalid entry, [error text]"

---

## Acceptance Criteria

- [ ] All decorative icons have `aria-hidden="true"` (audit: 10+ locations)
- [ ] All icon-only buttons have `aria-label` or `.sr-only` text
- [ ] All form inputs have associated `<label>` or `aria-label`
- [ ] Collapsible trigger exposes `aria-expanded` correctly
- [ ] Error messages use `role="alert"` and `aria-live`
- [ ] Markdown images have alt text (fallback: "Imagen generada por el asistente")
- [ ] Custom ReactMarkdown image component is implemented
- [ ] ARIA tree is correct per axe-core audit
- [ ] Screen reader announces all interactive elements correctly
- [ ] No ARIA conflicts or invalid combinations

---

## Implementation Priority

1. **P0 (Critical)**: aria-hidden on decorative icons, form labels
2. **P0.5**: aria-label on icon buttons, alt text fallback for images
3. **P1**: role="alert" on errors, aria-expanded on Collapsible validation
4. **P2**: Live region optimizations, aria-describedby on complex forms
