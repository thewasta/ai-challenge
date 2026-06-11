# Tasks: Pantalla de Memorias

## Review Workload Forecast

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total Changed Lines | ~950 | 1300 | ✅ Within Budget |
| Total Tasks | 7 | - | - |
| Estimated Effort | 16-18 hours | - | - |
| Chained PRs Recommended | No | - | - |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

## PR Strategy Recommendation

**Single PR** — All 7 tasks fit within the 1300-line budget with room to spare (~950 lines). The changes are tightly scoped: new routes (2 pages), reusable UI components (3), DB helpers (3 functions), 1 Server Action, and 1 sidebar integration. No complex dependencies or performance concerns that would justify splitting. All tasks should merge together to provide the complete feature.

## Progress Checklist

- [x] Task 1: Set Up Sidebar Navigation Button
- [x] Task 2: Create Database Helper Functions
- [x] Task 3: Create ProjectCard Component
- [x] Task 4: Create ProjectsGridPage Route
- [x] Task 5: Create MemoryCard and MemoryDetailDialog Components
- [x] Task 6: Create Memory List Page and Delete Server Action
- [ ] Task 7: Accessibility Audit and Final Polish

---

## Task Breakdown

### Task 1: Set Up Sidebar Navigation Button
- **Type**: feature
- **Effort**: S (1 hour)
- **Changed Lines**: ~30
- **Dependencies**: None
- **Files**:
  - Create: `src/components/MemoriesNavButton.tsx` (new navigation button)
  - Modify: `src/components/AppSidebar.tsx` (insert button above "Nuevo Proyecto")
- **Verification**: 
  - Button appears in sidebar above "Nuevo Proyecto"
  - Click navigates to `/memories`
  - Styling consistent with existing `NewProjectButton`
- **Commit Message**: `feat(sidebar): add Memorias navigation button`

### Task 2: Create Database Helper Functions
- **Type**: feature
- **Effort**: M (2 hours)
- **Changed Lines**: ~120
- **Dependencies**: None
- **Files**:
  - Modify: `src/lib/db-helpers.ts` (add 3 new query functions)
- **Verification**:
  - `getProjectsWithMemoryCount()` returns projects excluding "Proyecto #N" pattern
  - `getMemoriesByProject(id)` returns memories sorted DESC by createdAt
  - `deleteMemory(id)` removes memory from DB
  - Unit tests pass for each function
- **Commit Message**: `feat(db): add memory queries and delete helper`

### Task 3: Create ProjectCard Component
- **Type**: feature
- **Effort**: S (1.5 hours)
- **Changed Lines**: ~80
- **Dependencies**: Task 2
- **Files**:
  - Create: `src/components/ProjectCard.tsx` (clickable project rectangle)
- **Verification**:
  - Card renders project name and memory count badge
  - Click navigates to `/memories/[projectId]`
  - Keyboard navigation works (Tab + Enter)
  - Focus indicator visible and accessible
  - Touch target ≥24px
- **Commit Message**: `feat(components): add ProjectCard with navigation`

### Task 4: Create ProjectsGridPage Route
- **Type**: feature
- **Effort**: M (2 hours)
- **Changed Lines**: ~140
- **Dependencies**: Task 2, Task 3
- **Files**:
  - Create: `src/app/memories/layout.tsx` (sidebar shell)
  - Create: `src/app/memories/page.tsx` (projects grid)
- **Verification**:
  - Projects grid displays all non-placeholder projects
  - Empty state shown when no projects exist
  - Most recent projects appear first
  - Breadcrumb/header navigation works
  - Page passes axe accessibility audit
- **Commit Message**: `feat(memories): create projects grid page with layout`

### Task 5: Create MemoryCard and MemoryDetailDialog Components
- **Type**: feature
- **Effort**: M (2.5 hours)
- **Changed Lines**: ~220
- **Dependencies**: None (UI-only, used by Task 6)
- **Files**:
  - Create: `src/components/MemoryCard.tsx` (card + detail dialog + delete button)
  - Create: `src/components/MemoryDetailDialog.tsx` (full content modal)
- **Verification**:
  - Memory card displays title, topic badge, 100-char preview, formatted date
  - Click card body opens detail modal with full content
  - ScrollArea handles long content
  - Delete button visible on card
  - Focus management works in modals
  - Reduced motion respected
  - No hydration mismatches (date formatted via Intl inside component)
  - Components pass accessibility audit
- **Commit Message**: `feat(components): add MemoryCard with detail dialog`

### Task 6: Create Memory List Page and Delete Server Action
- **Type**: feature
- **Effort**: M (2.5 hours)
- **Changed Lines**: ~150
- **Dependencies**: Task 2, Task 5
- **Files**:
  - Create: `src/app/memories/[projectId]/page.tsx` (memory cards list)
  - Create: `src/app/memories/actions.ts` (deleteMemory Server Action)
- **Verification**:
  - Memory cards display for selected project, sorted newest first
  - Breadcrumb/back button returns to projects grid
  - Empty state shown when no memories exist
  - Delete confirmation dialog appears on delete button click
  - On confirm, memory is removed and list updates
  - On error, memory reappears with error toast
  - Invalid projectId redirects to `/memories`
  - Page passes accessibility audit
- **Commit Message**: `feat(memories): add memory list page and delete action`

### Task 7: Accessibility Audit and Final Polish
- **Type**: test
- **Effort**: M (2 hours)
- **Changed Lines**: ~50 (adjustments + CSS utilities)
- **Dependencies**: Task 4, Task 6
- **Files**:
  - Modify: `src/components/MemoryCard.tsx` (accessibility refinements)
  - Modify: `src/components/MemoryDetailDialog.tsx` (focus management, ARIA)
  - Modify: `src/app/memories/page.tsx` (semantic structure)
  - Modify: `src/app/memories/[projectId]/page.tsx` (semantic structure)
- **Verification**:
  - ✅ axe-core scan: zero critical/serious violations
  - ✅ Lighthouse accessibility: 90+
  - ✅ Keyboard navigation: Tab → Enter → Delete → Escape all work
  - ✅ Screen reader (VoiceOver/NVDA): announces structure correctly
  - ✅ Focus indicators: visible (3px outline, 3:1 contrast)
  - ✅ Color contrast: 4.5:1 text, 3:1 UI elements
  - ✅ Touch targets: all ≥24px
  - ✅ Reduced motion: animations disabled if pref set
  - ✅ Mobile responsive: cards stack on <768px
- **Commit Message**: `chore(a11y): add accessibility audit and refinements`

---

## Dependencies Graph

```
Task 1 (Sidebar button)
  └─→ stands alone, no blocking

Task 2 (DB helpers)
  └─→ needed by Task 4 and Task 6

Task 3 (ProjectCard component)
  └─→ needed by Task 4
  └─→ depends on Task 2 data

Task 4 (ProjectsGridPage)
  ├─→ depends on Task 2, Task 3
  └─→ ready for test

Task 5 (MemoryCard + MemoryDetailDialog)
  └─→ stands alone (UI components)
  └─→ consumed by Task 6

Task 6 (MemoryListPage + Server Action)
  ├─→ depends on Task 2, Task 5
  └─→ ready for test

Task 7 (Accessibility audit)
  ├─→ depends on Task 4, Task 6 (testing target)
  └─→ refines all components
```

---

## Implementation Order

1. **Task 1**: Sidebar button first for quick visual feedback and team awareness
2. **Task 2**: Database helpers (no UI dependencies; foundation for Tasks 4 & 6)
3. **Task 3**: ProjectCard component (small, reusable, unblocked)
4. **Task 4**: ProjectsGridPage (uses Task 2 + 3)
5. **Task 5**: MemoryCard components (parallel work possible; no blockers)
6. **Task 6**: MemoryListPage + Server Action (uses Task 2 + 5)
7. **Task 7**: Accessibility audit (final pass on completed UI)

**Rationale**: Foundation-first (Tasks 1–2), then parallel UI work (Tasks 3–5), then integration (Task 6), then verification (Task 7). All tasks are small enough to fit in one 8-hour dev session if needed.

---

## Changed Lines Estimate Breakdown

| Task | Component | Estimate | Notes |
|------|-----------|----------|-------|
| 1 | Sidebar | ~30 | Button + sidebar integration |
| 2 | DB helpers | ~120 | 3 query functions + tests |
| 3 | ProjectCard | ~80 | Component + styles + keyboard handling |
| 4 | Routes (2 pages + layout) | ~140 | ProjectsGridPage + layout shell |
| 5 | Components (2 files) | ~220 | MemoryCard + MemoryDetailDialog + modals |
| 6 | Pages (list + actions) | ~150 | MemoryListPage + Server Action |
| 7 | Accessibility | ~50 | ARIA labels + focus utilities + refinements |
| **Total** | | **~950** | Within 1300-line budget |

---

## Key Constraints & Decisions

1. **Composition over Props**: Components use explicit variant pattern (no boolean prop proliferation) per React best practices
2. **Server-First Data**: All data fetching in RSC (ProjectsGridPage, MemoryListPage); no client-side waterfalls
3. **Minimal Client State**: Only `MemoryCard` holds UI state (detail dialog open/closed); everything else is reactive to URL or props
4. **Hydration Safety**: Dates formatted via `Intl.DateTimeFormat` inside component, not SSR, to prevent mismatches
5. **Accessibility Priority**: Every task includes a11y check; Task 7 is formal audit
6. **Placeholder Filter**: SQLite `NOT LIKE 'Proyecto #%'` to exclude onboarding projects
7. **Delete Optimism**: Card optimistically removed; reappears on error
8. **No Virtualization Yet**: `content-visibility: auto` CSS sufficient for medium-sized lists; full virtualization out of scope

---

## Success Criteria per Task

| Task | Must Achieve |
|------|--------------|
| 1 | Button in sidebar, navigation works |
| 2 | All 3 DB functions tested and integrated |
| 3 | Component renders, keyboard accessible, styling correct |
| 4 | Grid displays projects, breadcrumb works, a11y pass |
| 5 | Cards show content, modals work, delete visible |
| 6 | List loads, delete flow works, errors handled |
| 7 | axe + Lighthouse pass, keyboard nav verified, all WCAG AA met |
