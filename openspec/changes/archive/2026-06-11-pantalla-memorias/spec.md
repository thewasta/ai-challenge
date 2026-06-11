# Spec: Pantalla de Memorias

## Overview

This change introduces a read-only memory viewer for browsing stored memories organized by project. Users navigate through a two-level hierarchy: projects grid → memory cards for a project → full memory detail. The only destructive action is delete, with confirmation workflow. All pages must meet WCAG AA accessibility standards.

---

## Requirements

### Functional Requirements

**FR-1: Projects Grid Page (`/memories`)**
- Fetch all unique project IDs from memories table
- Filter out placeholder projects matching pattern `"Proyecto #..."` (numbers only)
- Display projects as clickable rectangles with project name and memory count
- Sort projects by creation date (most recent first)
- Show empty state when no projects exist

**FR-2: Memory Cards Page (`/memories/[projectId]`)**
- Fetch all memories for the selected project
- Sort by creation date (most recent first)
- Display memory cards with:
  - Title field (or first 50 chars if untitled)
  - Topic key if available
  - Preview text (truncated to 100 characters)
  - Creation date formatted as locale string
  - Delete button on each card
- Show empty state when no memories exist for project
- Provide breadcrumb or back button to projects grid

**FR-3: Memory Detail View**
- Click memory card to open expanded view
- Display full memory content (no truncation)
- Show all metadata: title, topic, date, project name
- Provide delete button with confirmation
- Allow close/return to card list

**FR-4: Delete Workflow**
- Delete button on card or detail view triggers confirmation dialog
- AlertDialog shows memory title preview (max 100 chars) and warning text
- User confirms or cancels deletion
- On confirmation: delete from database via `deleteMemory(id)` Server Action
- On success: remove card from UI without full page reload
- On error: show error message

**FR-5: Sidebar Integration**
- Add "Memorias" button in sidebar above "Nuevo Proyecto"
- Button navigates to `/memories`
- Use consistent styling with existing sidebar buttons

### Non-Functional Requirements

**NFR-1: Performance**
- Use `ScrollArea` with `content-visibility: auto` for memory lists
- Defer date formatting to client-side (`useEffect`) to prevent hydration mismatch
- Use Server Components for data fetching to avoid client-side waterfall

**NFR-2: Accessibility**
- All pages pass WCAG AA audit (axe DevTools, Lighthouse)
- Keyboard navigation: Tab through cards, Enter/Space to open, Delete key triggers confirmation
- Focus indicators: `:focus-visible` with 3px outline, 3:1 minimum contrast
- Color contrast: text 4.5:1 (AA), semantic tokens (`text-foreground`, `bg-background`)
- Touch targets: minimum 24×24 px (AA)
- Reduced motion: respect `prefers-reduced-motion: reduce` (no animations if set)
- Screen reader: semantic HTML (`<article>` for cards, `<section>` for grids), ARIA labels

**NFR-3: Hydration**
- No hydration mismatches: use ISO date strings from DB, format on client only
- Use inline script pattern if formatting in SSR context
- Suppress expected mismatches with `suppressHydrationWarning` if needed

**NFR-4: Mobile Responsiveness**
- Cards stack in single column on screens < 768px
- Touch targets meet 44×44 px (comfortable) on mobile
- Scrollable areas work smoothly with passive event listeners

### Accessibility Requirements (WCAG 2.2)

**A11Y-1: Semantic Structure (WCAG 1.3.1, 2.4.6)**
- Projects grid uses `<section aria-label="Projects">` wrapper
- Each project is `<article>` with project name as heading
- Memory cards use `<article>` with title as heading
- Grid uses `role="region"` or `<section>` with descriptive aria-label

**A11Y-2: Focus Management (WCAG 2.4.7, 2.4.11)**
- All interactive elements focusable (buttons, links, cards)
- Focus order matches visual order (left→right, top→bottom)
- Focus not obscured by sticky headers or overlays
- Focus indicator has ≥3:1 contrast against background

**A11Y-3: Keyboard Navigation (WCAG 2.1.1, 2.1.2)**
- Tab moves focus through all cards and buttons
- Enter or Space opens memory detail
- Delete key or Delete button triggers confirmation dialog
- Escape closes modals and returns to list
- No keyboard traps

**A11Y-4: Screen Reader Support (WCAG 4.1.2, 4.1.3)**
- Delete button has `aria-label="Delete memory"` or icon with `aria-hidden="true"` + text
- AlertDialog announces dialog role and purpose
- Focus moves to dialog on open (modal focus trap)
- Live region announces deletion success/error

**A11Y-5: Color Contrast (WCAG 1.4.3)**
- Normal text vs background: 4.5:1 minimum
- Delete icon/button vs background: 3:1 minimum
- Focus outline inherits currentColor (already contrast-checked)

**A11Y-6: Touch & Motor Control (WCAG 2.5.8, 2.5.7)**
- Minimum touch target: 24×24 px (AA), 44×44 px recommended
- Delete button padding ensures 24px minimum
- No hover-only interactions (also support click/tap)

**A11Y-7: Motion & Animation (WCAG 2.3.3)**
- Respect `prefers-reduced-motion: reduce` media query
- Disable all transitions/animations for users with preference set
- Modal entrance/exit may have subtle fade (allowed with prefersReducedMotion check)

---

## User Scenarios

### Scenario 1: User navigates to memories from sidebar

**Given** user is logged in on the home page  
**When** user clicks the "Memorias" button in the sidebar  
**Then**:
- Page navigates to `/memories`
- All projects display as rectangles with names and memory counts
- Empty state shown if no projects exist
- Focus returns to page content (focus management)

### Scenario 2: User views memories for a project

**Given** user is on the projects grid (`/memories`)  
**When** user clicks on a project  
**Then**:
- Page navigates to `/memories/[projectId]`
- All memories for that project display as cards (most recent first)
- Each card shows title, topic, 100-char preview, date, and delete button
- Breadcrumb or back button allows return to projects
- Empty state shown if no memories exist

### Scenario 3: User opens memory detail

**Given** user is viewing memory cards for a project  
**When** user clicks on a memory card  
**Then**:
- Modal or dedicated page opens with full memory content
- Full title, topic, date, and project name visible
- No truncation of content
- Delete button and close option available
- Focus trapped in modal (can close with Escape)

### Scenario 4: User deletes a memory

**Given** user is viewing a memory (card or detail)  
**When** user clicks the delete button  
**Then**:
- AlertDialog appears with confirmation message
- Dialog shows memory title preview (max 100 chars)
- User sees "Delete" and "Cancel" buttons
- **If user clicks Cancel:**
  - Dialog closes, no changes
  - Focus returns to previous element (delete button)
- **If user clicks Delete:**
  - Calls `deleteMemory(memoryId)` Server Action
  - Card is removed from list immediately (optimistic update)
  - Toast or confirmation message shown
  - If error: shows error message, card reappears

### Scenario 5: User experiences keyboard navigation

**Given** user is viewing the projects grid  
**When** user presses Tab  
**Then**:
- Focus moves through each project card in order (left→right, top→bottom)
- Focus indicator (3px outline) clearly visible

**When** user presses Enter on a focused project  
**Then**:
- Navigates to memory cards for that project

**When** user is on a memory card and presses Delete key  
**Then**:
- Confirmation dialog appears

**When** user presses Escape in dialog  
**Then**:
- Dialog closes, focus returns to delete button

### Scenario 6: Screen reader user navigates

**Given** screen reader is active (NVDA, VoiceOver, JAWS)  
**When** screen reader announces page  
**Then**:
- Announces page as: "Memories, main region"
- Each project announces as: "Heading level 2, [Project Name], 5 memories"
- Buttons announce as: "[Icon/Label], button, [aria-label or text]"

**When** user navigates to detail  
**Then**:
- Dialog announced as: "Delete memory, dialog, [Title preview]"
- Buttons announced as: "Delete, button" and "Cancel, button"

### Scenario 7: User on mobile device

**Given** user is on device with screen width < 768px  
**When** page loads  
**Then**:
- Cards stack in single column
- Touch targets are 44×44 px or larger
- Scrolling is smooth (passive event listeners)
- All content remains readable without horizontal scroll

### Scenario 8: User with reduced motion preference

**Given** OS has `prefers-reduced-motion: reduce` enabled  
**When** page loads  
**Then**:
- No animations or transitions play
- Modal entrance/exit has no fade effect
- All interactions feel instant
- Page remains fully functional

### Scenario 9: Empty state — no projects

**Given** user has no projects with memories  
**When** user navigates to `/memories`  
**Then**:
- Empty state message displayed: "No projects yet. Create one to start storing memories."
- No projects grid shown
- Optional link back to create project

### Scenario 10: Empty state — project with no memories

**Given** user is on `/memories/[projectId]` for a project with no memories  
**When** page loads  
**Then**:
- Empty state message displayed: "No memories for this project yet."
- Back/breadcrumb button still available
- Option to return to projects grid

---

## Edge Cases

- **Placeholder projects**: Projects with names like "Proyecto 1", "Proyecto 2" (regex `^Proyecto \d+$`) are filtered from display
- **Very long memory titles**: Truncated to 50 chars on card, full displayed in detail and deletion dialog (max 100 in preview)
- **Very long memory content**: Show scrollable area in detail view; list card with truncated preview (100 chars)
- **Simultaneous delete**: If user deletes same memory from two tabs, second tab shows error or refreshes list
- **Race conditions**: Optimistic delete followed by network error shows error and re-renders card
- **Date formatting**: ISO strings stored in DB; formatted on client only (via `useEffect` or with `suppressHydrationWarning`)
- **Missing projectId in URL**: Redirect to `/memories` or show 404 state
- **Large memory lists**: Use `ScrollArea` with `content-visibility: auto` to maintain performance
- **Deleted project**: If last memory in a project is deleted, project card disappears from grid

---

## Out of Scope

- Memory creation or editing (read-only viewer only)
- Bulk delete operations
- Search/filter across all memories
- Memory tagging or custom organization beyond projects
- Analytics or usage statistics
- Export/sharing of memories
- Memory recovery/trash bin
- Memory versioning or history
- Collaboration or shared memories

---

## Component and File Structure

| File | Type | Purpose |
|------|------|---------|
| `app/memories/page.tsx` | New | Projects grid page (Server Component) |
| `app/memories/[projectId]/page.tsx` | New | Memory cards page (Server Component) |
| `components/ui/MemoryCard.tsx` | New | Card component for memory (Client Component) |
| `components/ui/MemoryDetailModal.tsx` | New | Modal/drawer for full memory content (Client Component) |
| `components/ui/MemoryDeleteDialog.tsx` | New | Delete confirmation dialog (Client Component) |
| `app/(layout)/sidebar.tsx` | Modified | Add "Memorias" button |
| `lib/db/queries.ts` | Modified | Add `deleteMemory(id)` function |
| `lib/db/schema.ts` | None | Existing `memories` table (FTS5) |

---

## Acceptance Criteria

- [ ] User can navigate from sidebar "Memorias" button to `/memories`
- [ ] Projects display as rectangles with name and memory count
- [ ] Clicking project shows all memories as cards (sorted most recent first)
- [ ] Memory cards display: title, topic, 100-char preview, date, delete button
- [ ] Clicking memory card opens detail view with full content
- [ ] Delete button triggers AlertDialog with memory title preview
- [ ] User can cancel or confirm deletion in dialog
- [ ] On confirm, `deleteMemory()` is called and card is removed
- [ ] On error, card reappears and error message shown
- [ ] Placeholder projects (matching `"Proyecto #..."`) are filtered from grid
- [ ] Empty states shown when no projects or no memories
- [ ] All pages pass WCAG AA audit (axe, Lighthouse)
- [ ] Keyboard navigation: Tab, Enter, Delete, Escape all work as expected
- [ ] Focus indicator visible (3px outline, 3:1 contrast)
- [ ] Screen reader announces page structure, cards, and buttons correctly
- [ ] Touch targets ≥24×24 px (AA), ≥44×44 px (mobile recommended)
- [ ] Mobile responsive: cards stack in single column on <768px
- [ ] Reduced motion respected: no animations if preference set
- [ ] No hydration mismatches: dates format on client only
- [ ] Performance: lists use ScrollArea + content-visibility for large memory counts
