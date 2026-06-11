# Proposal: Pantalla de Memorias

## Intent

Create a read-only memories viewer that allows users to browse their stored memories (AI notes/context) organized by project. This addresses the need to review previously stored context without creating or editing. Users will see a hierarchical interface: projects → memories for that project → full memory detail. The only destructive action available is delete, giving users control over their memory history.

## Scope

### In Scope
- Two-level hierarchical navigation: `/memories` (projects grid) → `/memories/[projectId]` (memory cards)
- Projects displayed as clickable rectangles on the main screen
- Memory cards showing content preview with delete functionality
- Full memory detail view on card click
- Delete action with confirmation dialog (AlertDialog)
- WCAG AA compliance minimum, AAA where feasible
- Sidebar button above "Nuevo Proyecto"
- Database query: `deleteMemory()` function (backend)
- UI components: MemoriesGridPage, MemoriesDetailPage, MemoryCard
- All pages pass accessibility audit

### Out of Scope
- Memory creation or editing
- Bulk delete operations
- Search/filter (future enhancement)
- Memory tagging or organization beyond project grouping
- Analytics or memory usage statistics
- Export/sharing functionality

## User Flow

1. **Entry**: User clicks "Memorias" button in sidebar
2. **Projects Grid** (`/memories`): Displays all unique projects as rectangles with project count
3. **Memory Cards** (`/memories/[projectId]`): Shows all memories for selected project as cards (title + truncated content)
4. **Memory Detail**: Click card → full memory content in modal or dedicated page
5. **Delete**: Delete button on card or detail view → confirmation dialog → delete from database
6. **Return**: Breadcrumb or back button to projects grid

## Technical Approach

- **Routes**: Next.js App Router, `/app/memories` and `/app/memories/[projectId]`
- **Components**: Compound component pattern (composition over boolean props)
  - `MemoriesGridPage`: Server component fetching projects via `select distinct projectId from memories`
  - `MemoriesDetailPage`: Server component fetching memories for `[projectId]`
  - `MemoryCard`: Client component (interactivity for card click + delete button)
  - `MemoryDetailModal`: Client component for expanded view
- **State**: Minimal client-side state; rely on server for data freshness
- **Delete Flow**: Server Action for `deleteMemory(memoryId)` with auth check
- **Icons**: Use `lucide-react` (LucideIcon) for delete action, 24px minimum target size
- **Styling**: shadcn/ui components (Card, Button, AlertDialog, ScrollArea, Badge for project count)
- **Accessibility**: 
  - Semantic HTML: `<article>` for cards, `<section>` for grids
  - ARIA labels on delete button (`aria-label="Delete memory"`)
  - Keyboard navigation: Tab through cards, Enter/Space to open, Delete key to remove
  - Focus indicators: `:focus-visible` with 3px outline
  - Color contrast: 4.5:1 for text (AA), semantic tokens (`text-foreground`, `bg-background`)
  - Reduced motion: respect `prefers-reduced-motion: reduce`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/memories/page.tsx` | New | Projects grid page |
| `app/memories/[projectId]/page.tsx` | New | Memory cards for project |
| `components/ui/MemoryCard.tsx` | New | Card component for individual memory |
| `components/ui/MemoryDetailModal.tsx` | New | Modal/drawer for full memory content |
| `app/(layout)/sidebar.tsx` | Modified | Add "Memorias" button above "Nuevo Proyecto" |
| `lib/db/queries.ts` | Modified | Add `deleteMemory(id)` function |
| `lib/db/schema.ts` | None | Existing `memories` table with FTS5 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidentally delete wrong memory | Medium | Confirmation dialog (AlertDialog) with memory preview before delete |
| Slow rendering of large memory lists | Low | Use `ScrollArea` with virtualization; `content-visibility: auto` on cards |
| Accessibility barriers (keyboard, screen reader) | Medium | Manual audit against WCAG 2.2; test with keyboard nav and VoiceOver/NVDA |
| Hydration mismatch in date formatting | Low | Use ISO strings from DB; format on client with `toLocaleString()` only in `useEffect` |
| N+1 queries when fetching projects and memory counts | Medium | Use single query: `select distinct projectId, count(*) from memories group by projectId` |

## Rollback Plan

1. **Remove routes**: Delete `/app/memories` directory
2. **Remove sidebar button**: Revert `app/(layout)/sidebar.tsx` to previous version
3. **Revert DB**: No schema changes needed; `deleteMemory()` is additive (can be unused)
4. **Revert components**: Delete `components/ui/MemoryCard.tsx`, `components/ui/MemoryDetailModal.tsx`
5. **No data loss**: All memories remain in DB; only UI is removed

## Success Criteria

- [ ] User can navigate from sidebar "Memorias" button to projects grid
- [ ] Projects display as rectangles with project name and memory count
- [ ] Clicking project shows all memories as cards (truncated content visible)
- [ ] Clicking memory card opens full content in modal or detail page
- [ ] Delete button appears on card; confirmation dialog shows before delete
- [ ] Deleted memory no longer appears in list after confirmation
- [ ] All pages pass WCAG AA audit (axe, Lighthouse)
- [ ] Keyboard navigation works: Tab through cards, Enter opens detail, Delete triggers confirm
- [ ] Focus indicator visible on all interactive elements (3px outline, 3:1 contrast)
- [ ] Reduced motion respected (no animations if `prefers-reduced-motion: reduce`)
- [ ] No hydration mismatches (client-server rendering consistent)
- [ ] Mobile responsive: cards stack in single column on small screens

## Complexity Estimate

**Medium** — involves UI hierarchy (grid → detail), accessibility audit, and database integration, but scoped and straightforward. No complex state management or external integrations. Primary complexity is ensuring WCAG compliance and composition pattern consistency.
