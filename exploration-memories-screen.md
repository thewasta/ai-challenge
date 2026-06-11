# Exploration: Memories Management Screen

## Executive Summary

The project has a solid database schema (SQLite + Drizzle ORM) with a `memories` table that stores project and personal memories. The task is to build a new screen to display stored memories with a two-level navigation: projects (top level) → memories by project (detail level). The implementation requires creating new routes, components following composition patterns and accessibility standards (WCAG AA/AAA).

**Key Finding:** The memories table is already in the schema with search functionality, but no UI exists yet to display, browse, or manage them. This is a pure UI/UX addition with minimal backend work.

---

## Current State

### Database Schema (✅ Ready)
- **Table:** `memories` (src/db/schema.ts:71-93)
  - `id`: integer (PK, auto-increment)
  - `projectId`: integer (FK → projects.id, cascade delete)
  - `title`: string (not null)
  - `topic`: enum (seo-strategy, technical-audit, content-plan, project-decision, user-preference)
  - `scope`: enum (project, personal) — default: "project"
  - `content`: text (not null) — the full memory content
  - `createdAt`: timestamp (auto-generated)

### Backend Functions (✅ Ready)
Located in src/lib/db-helpers.ts:
- `insertMemory()` — saves a new memory
- `searchMemoriesByProject()` — FTS5 (full-text search) across memories
- `formatMemoriesForPrompt()` — formats memories for LLM context
- `getMemoriesByProject()` — retrieves all memories for a project

### Sidebar Structure (✅ Exists)
- Located: src/components/AppSidebar.tsx
- Current button placement: "Nuevo Proyecto" button at the top of the sidebar (line 51)
- Structure: Uses shadcn/ui `Sidebar` with `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`
- The sidebar is a client component (`"use client"`) with collapsible project groups

### Routing Architecture (✅ Current Pattern)
- Projects: `/projects/[id]`
- Chats: `/projects/[id]/chats/[chatId]`
- **New route needed:** `/memories` or `/projects/[id]/memories`

---

## Affected Areas

| File/Path | Role | Impact | Why |
|-----------|------|--------|-----|
| `src/components/AppSidebar.tsx` | Navigation sidebar | MEDIUM | New button above "Nuevo Proyecto" |
| `src/app/memories/` | New route/screen | HIGH | Create 2 new pages: list projects, show memories |
| `src/components/MemoriesScreen.tsx` | New component (TBD) | HIGH | Main memories UI, routing logic |
| `src/components/MemoryCard.tsx` | New component (TBD) | MEDIUM | Individual memory card with delete action |
| `src/components/ProjectGrid.tsx` | New component (TBD) | MEDIUM | Grid of project rectangles |
| `src/lib/db-helpers.ts` | Database layer | LOW | May need `deleteMemory()` function |
| Accessibility patterns | A11y audit | HIGH | All new pages must pass WCAG AA/AAA |

---

## Technical Discoveries

### 1. **Routing Strategy Decision Required**
Two options:
- **Option A:** `/memories` (standalone route, shows all projects with memories)
  - Pros: Clean, separate concerns, independent of project context
  - Cons: Must load/filter memories from all projects
  
- **Option B:** `/projects/[id]/memories` (nested under project)
  - Pros: Already scoped to project, less data filtering
  - Cons: Must navigate into project first

**Recommendation:** Option A (standalone) — users might want to browse memories across all projects. Better matches the new feature intent.

### 2. **Component Composition Pattern**
Given the skill guidance on React composition patterns, the design should avoid boolean prop proliferation:
- ✅ **NOT:** One `MemoriesScreen` with boolean `isGridView`, `isDetailView`, etc.
- ✅ **YES:** Separate components:
  - `MemoriesGridPage` — shows projects in rectangles
  - `MemoriesDetailPage` — shows cards for one project's memories
  - Each is explicit about what it renders

### 3. **Accessibility Requirements**
From accessibility skill:
- All interactive elements must be keyboard accessible (Tab, Enter)
- Focus visible required (`:focus-visible`)
- ARIA labels for buttons and links
- Color contrast ≥ 4.5:1 for AA
- Interactive targets ≥ 24×24px (AA)
- Screen reader support (semantic HTML, `role`, `aria-label`)
- Skip link pattern already in place (ChatLayout.tsx:30-34)

### 4. **shadcn/ui Components Available**
From project context, these components are ready:
- `Button` — for delete actions and navigation
- `Card` / `CardHeader` / `CardTitle` / `CardContent` / `CardFooter` — for memory cards
- `Dialog` / `AlertDialog` — for delete confirmation
- `Input` / `Select` — if filtering needed later
- `Skeleton` — for loading states
- No `Grid` or `Badge` found installed yet (may need to add)

### 5. **Data Access Pattern**
- Memories are scoped to `projectId` — must pass project context
- Need function: `getMemoriesForProject(projectId)` (exists in db-helpers)
- Delete function: `deleteMemory(memoryId)` (needs to be created)
- Optional: pagination if project has 100+ memories

---

## Recommendations by Approach

### Approach 1: Simple List View (Lowest Effort)
**Effort:** Low | **Complexity:** Low

Structure:
1. Single page `/memories`
2. Show all projects as a horizontal scroll or vertical list of buttons
3. Click project → show that project's memories in a card list below
4. Each memory card shows title + topic + first 100 chars of content
5. Delete button on hover

**Pros:** Minimal components, fast to build
**Cons:** Not as polished visually, less discoverable

---

### Approach 2: Grid + Detail (Recommended)
**Effort:** Medium | **Complexity:** Medium

Structure:
1. `/memories` (grid page) — shows projects in small rectangles
2. `/memories/[projectId]` (detail page) — shows memories as cards

**Pros:**
- Matches request ("projects in small rectangles")
- Clear two-level navigation
- Each page has single responsibility
- Better UX flow

**Cons:**
- More routing logic
- Two separate components/pages

---

### Approach 3: Modal/Drawer (Highest Polish)
**Effort:** High | **Complexity:** High

Structure:
1. Button opens modal showing projects
2. Click project → transitions to memories grid
3. Back button returns to projects

**Pros:** Seamless, professional feel
**Cons:** More state management, potentially harder to a11y

---

## Recommended Approach: **Approach 2 (Grid + Detail)**

This balances the user request ("projects in rectangles" → "memories for that project") with reasonable implementation complexity.

### Implementation Plan

**Files to Create:**
1. `src/app/memories/page.tsx` — Server component, loads projects and renders grid
2. `src/app/memories/[projectId]/page.tsx` — Server component, loads memories for project
3. `src/components/MemoriesGridPage.tsx` — Client component, project grid
4. `src/components/MemoriesDetailPage.tsx` — Client component, memory cards + delete
5. `src/components/MemoryCard.tsx` — Client component, single memory card
6. `src/components/ProjectRectangle.tsx` — Client component, project selector

**Files to Modify:**
1. `src/components/AppSidebar.tsx` — Add "Historial" or "Mis Memorias" button
2. `src/lib/db-helpers.ts` — Add `deleteMemory()` function

**Database:** No schema changes needed (memories table exists)

---

## Accessibility Considerations

### Critical Requirements (WCAG AA)

1. **Keyboard Navigation**
   - All project rectangles and memory cards must be focusable (`<button>`, `<a>`, or `role="button"` + `tabindex="0"`)
   - Tab order must follow visual order (left-to-right, top-to-bottom)
   - Delete button must be keyboard accessible (Enter or Space to activate)

2. **Focus Visible**
   - CSS `:focus-visible` outline on all interactive elements
   - Contrast ≥ 3:1 against background

3. **Color Contrast**
   - Text vs background: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (AA)
   - Don't rely on color alone for status (e.g., red delete button must also have icon or label)

4. **Screen Reader Support**
   - Project rectangles should announce: "Project: [name], [count] memories"
   - Memory cards should announce: "Memory: [title], Topic: [topic], Created: [date]"
   - Delete button: `aria-label="Delete memory: [title]"`
   - No empty buttons (`<button>` with only icon must have `aria-label`)

5. **Target Size**
   - Interactive targets ≥ 24×24px (AA)
   - Delete button: at least 44×44px recommended

6. **Dynamic Content**
   - Loading state should announce with `aria-live="polite"` region
   - Delete confirmation dialog uses `<AlertDialog>` (handles focus trap automatically)
   - No focus obscured by sticky headers

### Nice-to-Have (WCAG AAA)

- Target size ≥ 44×44px (recommended for comfort)
- Contrast ≥ 7:1 for text
- Content visible at 200% zoom
- Reduced motion preference respected (`prefers-reduced-motion: reduce`)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Memories table is empty on new projects | User sees "no memories" screen, feels incomplete | Add hint text: "Memories appear as you interact with the consultant agent" |
| Delete action is destructive (no undo) | User accidentally deletes important memory | Show confirmation dialog before delete (shadcn `AlertDialog`) |
| Project has 1000+ memories | Performance issue, slow rendering | Add pagination (10-20 per page) or virtualization (React Window) later |
| A11y audit fails | Screen doesn't meet compliance requirement | Follow accessibility skill rules strictly; audit with axe-core before shipping |
| Sidebar button placement conflicts with responsive design | Button hidden on mobile | Use `SidebarMenuItem` pattern (already supports responsive hiding) |

---

## Next Steps

1. **Proposal Phase:** Define exact URL structure, button label, and confirmation on exact a11y targets (AA vs AAA)
2. **Spec Phase:** Write detailed requirements for each page's data loading, error handling, and delete flow
3. **Design Phase:** Sketch exact grid layout (how many columns for projects?), card styling (shadow? border?), and delete confirmation UX
4. **Implementation:** Follow composition patterns to avoid prop proliferation; use compound components if needed
5. **Verification:** Run accessibility audit (Lighthouse a11y + axe-core) before PR review

---

## Status

**Ready for Proposal:** YES

All technical investigations complete. Codebase is ready to implement. Database functions exist. No blockers identified.

