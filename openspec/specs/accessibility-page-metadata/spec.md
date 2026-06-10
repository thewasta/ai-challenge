# Accessibility: Page Metadata and Dynamic Titles Specification

**WCAG 2.2 AA Conformance**  
**Criterion Covered**: 2.4.2 (Page Titled)

---

## Purpose

Ensure each page has a descriptive, context-specific title that helps users (especially screen reader users) understand the page content and navigate browser history or tab management.

---

## Requirements

### Requirement: Dynamic Page Titles via `generateMetadata`

The system MUST implement dynamic page titles using Next.js `generateMetadata()` function for all routes that have contextual content.

**WCAG Criterion**: 2.4.2 — Page Titled

**Scope**: 
- `/projects/[id]/chats/[chatId]` — chat-specific routes
- Any future multi-page contexts

Each route MUST define `generateMetadata()` that returns:
```typescript
export async function generateMetadata({
  params,
}: {
  params: { id: string; chatId: string };
}): Promise<Metadata> {
  const { id, chatId } = params;
  // Query database for project/chat names
  const project = await getProject(id);
  const chat = await getChat(id, chatId);

  return {
    title: `${chat.title} — Consultor SEO`,
    description: `Chat: ${chat.title} | Proyecto: ${project.name}`,
  };
}
```

#### Scenario: Chat page has descriptive title

- **GIVEN** user navigates to `/projects/123/chats/456`
- **AND** chat with id=456 has title "Estrategia Q2 2026"
- **AND** project with id=123 has name "Acme Corp"
- **WHEN** the page loads
- **THEN**:
  - Browser title bar shows: "Estrategia Q2 2026 — Consultor SEO"
  - Meta description shows: "Chat: Estrategia Q2 2026 | Proyecto: Acme Corp"
  - Screen reader announces: "Estrategia Q2 2026 — Consultor SEO"
  - User knows the page content without reading the page itself

#### Scenario: Home page has generic title (no params)

- **GIVEN** user navigates to `/`
- **WHEN** the page loads
- **THEN**:
  - Browser title shows: "Consultor SEO y Marketing Digital — Inicio"
  - Meta description shows: "Crea consultoría SEO multi-agente"
  - (No dynamic params; title is static)

#### Scenario: Title changes when navigating between chats

- **GIVEN** user is on chat "Estrategia Q2" (title: "Estrategia Q2 2026 — Consultor SEO")
- **WHEN** user clicks link to different chat "Auditoría técnica"
- **THEN**:
  - Browser title updates to: "Auditoría técnica — Consultor SEO"
  - Screen reader announces the new title
  - User knows they switched pages

#### Scenario: Browser history shows descriptive titles

- **GIVEN** user has visited 3 different chats
- **WHEN** user opens browser history (Cmd+Y on Mac, Ctrl+H on Windows)
- **THEN**:
  - History shows:
    - "Estrategia Q2 2026 — Consultor SEO"
    - "Auditoría técnica — Consultor SEO"
    - "Análisis competencia — Consultor SEO"
  - Each title is unique and descriptive
  - User can find the page they want without clicking each entry

#### Scenario: Tab management is clearer with dynamic titles

- **GIVEN** user has 5 browser tabs open, 3 of which are chats
- **WHEN** user glances at browser tabs
- **THEN**:
  - Tab titles show:
    - "Estrategia Q2 2026 — Consultor SEO"
    - "Auditoría técnica — Consultor SEO"
    - "Análisis competencia — Consultor SEO"
  - User can identify and switch to the correct chat tab quickly
  - (vs. all 3 showing "Chat — Consultor SEO")

---

### Requirement: Title Format Consistency

All page titles MUST follow a consistent format to aid in browser/screen-reader navigation.

**Format**: `{Context or "Consultor SEO"} — {Consultor SEO}`

Examples:
- Chat page: `{chat.title} — Consultor SEO`
- Project page (if future): `Proyecto: {project.name} — Consultor SEO`
- Home: `Consultor SEO y Marketing Digital — Inicio` or `Inicio — Consultor SEO`

#### Scenario: Title format is predictable

- **GIVEN** user navigates to any page in the app
- **WHEN** user reads browser title or screen reader announces title
- **THEN**:
  - Title always ends with " — Consultor SEO" (recognizable brand)
  - First part describes the page context
  - User builds mental model of app's structure

#### Scenario: Title does NOT repeat the app name excessively

- **GIVEN** a chat page
- **WHEN** screen reader announces title
- **THEN**:
  - Screen reader says: "Estrategia Q2 2026 — Consultor SEO"
  - NOT: "Chat: Estrategia Q2 2026 — Consultor SEO — Consultor SEO"
  - NOT: "Consultor SEO — Estrategia Q2 2026 — Consultor SEO"

---

### Requirement: Page Metadata Fallback for Missing Data

If chat or project data cannot be retrieved (database error, not found), the system MUST provide a graceful fallback title.

**WCAG Criterion**: 2.4.2 — Page Titled (Sufficient Technique: G88)

#### Scenario: Chat not found returns fallback title

- **GIVEN** user navigates to `/projects/123/chats/999` (chat 999 does not exist)
- **WHEN** `generateMetadata()` queries for chat 999 and gets null
- **THEN**:
  - Browser title shows: "Chat no encontrado — Consultor SEO" (fallback)
  - Meta description shows: "Proyecto: [name] — Chat no encontrado"
  - Page does NOT crash
  - User is informed the chat was deleted or moved

#### Scenario: Project not found returns generic fallback

- **GIVEN** user navigates to `/projects/999/chats/123` (project 999 does not exist)
- **WHEN** `generateMetadata()` queries for project 999 and gets null
- **THEN**:
  - Browser title shows: "Consultor SEO" (generic fallback)
  - Meta description shows: "Proyecto no encontrado"
  - User sees error page but title is still descriptive

---

### Requirement: Description Meta Tag

The system MUST populate the `description` meta tag with contextual information.

**WCAG Criterion**: 2.4.2 — Page Titled (Supporting Technique: H25)

The description MUST:
- Be 120–160 characters (optimal for search results/previews)
- Include the chat/project context
- Be unique per page

#### Scenario: Meta description appears in search results

- **GIVEN** user shares chat URL with a colleague
- **WHEN** URL is previewed (Slack, WhatsApp, browser preview)
- **THEN**:
  - Preview shows title: "Estrategia Q2 2026 — Consultor SEO"
  - Preview shows description: "Chat: Estrategia Q2 2026 | Proyecto: Acme Corp"
  - Recipient knows what the link points to without visiting

#### Scenario: Meta description is accessible to screen readers

- **GIVEN** a screen reader user inspects page metadata
- **WHEN** screen reader reads page head
- **THEN**:
  - Description is available (robots/crawlers see it, accessibility tree includes it)
  - User can query "what is this page about" and get the description

---

## Acceptance Criteria

- [ ] `generateMetadata()` is implemented for `/projects/[id]/chats/[chatId]` route
- [ ] Chat titles are dynamic (reflected in browser title bar)
- [ ] All page titles follow `{context} — Consultor SEO` format
- [ ] Browser history shows descriptive, unique titles for each chat
- [ ] Browser tab titles are distinct (not all showing "Chat")
- [ ] Meta descriptions are 120–160 characters and contextual
- [ ] Fallback titles exist for missing/deleted chats or projects
- [ ] Screen reader announces title on page load
- [ ] Title changes when navigating between routes
- [ ] No "undefined" or "null" appears in titles or descriptions
- [ ] All pages with dynamic content have `generateMetadata()` defined

---

## Implementation Steps

1. Import `Metadata` type from `next`:
   ```typescript
   import type { Metadata } from "next";
   ```

2. Define `generateMetadata()` in `/projects/[id]/chats/[chatId]/page.tsx`:
   ```typescript
   export async function generateMetadata({
     params,
   }: {
     params: { id: string; chatId: string };
   }): Promise<Metadata> {
     const project = await getProject(Number(params.id));
     const chat = await getChat(Number(params.chatId));

     if (!project || !chat) {
       return {
         title: "Chat no encontrado — Consultor SEO",
         description: "Proyecto no encontrado o chat eliminado.",
       };
     }

     return {
       title: `${chat.title} — Consultor SEO`,
       description: `Chat: ${chat.title} | Proyecto: ${project.name}`,
     };
   }
   ```

3. Update `src/app/layout.tsx` to provide a fallback metadata:
   ```typescript
   export const metadata: Metadata = {
     title: "Consultor SEO y Marketing Digital",
     description: "Consultoría SEO y marketing digital potenciada por IA",
   };
   ```

4. Test:
   - Navigate to a chat → browser title updates
   - Browser history shows unique, descriptive titles
   - No "undefined" values in title or description
   - Screen reader announces title

---

## Testing Checklist

- [ ] Browser title (top of window) shows dynamic chat name
- [ ] Browser history (Cmd+Y / Ctrl+H) shows distinct chat titles
- [ ] Browser tabs show unique titles for each chat (not all "Chat")
- [ ] Meta description tag exists in `<head>` (DevTools > Elements > `<meta name="description">`)
- [ ] Page preview (Slack, WhatsApp, Twitter) shows title + description correctly
- [ ] Fallback title appears when chat/project not found
- [ ] No console errors for missing metadata
- [ ] Screen reader announces title on page load (VoiceOver / NVDA)
- [ ] Title updates when navigating between chats (not showing previous chat)
