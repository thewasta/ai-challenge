# Design: Pantalla de Memorias

## Architecture Overview

Two-level RSC hierarchy: `MemoriesLayout` (sidebar + inset shell) → `ProjectsGrid` (server, fetches projects with counts) → `MemoryList` (server, fetches memories per project) → `MemoryCard` (client, delete + detail). Delete is a Server Action. Detail opens a `MemoryDetailDialog` (client, AlertDialog-based). Filter excludes projects whose names match `^Proyecto #\d+` (placeholder names from onboarding).

The shell reuses the existing `SidebarProvider` + `AppSidebar` + `SidebarInset` pattern from `ChatLayout.tsx` — no new layout primitives needed.

## Component Design

### Component Tree

```
MemoriesLayout (client)           ← SidebarProvider shell (mirrors ChatLayout)
├── AppSidebar (client)           ← existing — receives projects for nav
└── SidebarInset
    ├── MemoriesHeader (server)   ← static breadcrumb / page title
    ├── ProjectsGridPage (server) ← /memories route, fetches project summaries
    │   └── ProjectCard (client)  ← clickable rect → navigates to /memories/[id]
    └── MemoryListPage (server)   ← /memories/[projectId] route
        ├── MemoriesBreadcrumb    ← back link to /memories (server, static)
        └── MemoryCard (client)   ← per-memory card with delete
            └── MemoryDetailDialog (client) ← full content modal
```

### Key Components

#### ProjectsGridPage
- **Type**: Server Component (async)
- **Props**: none (reads from DB)
- **Responsibilities**: Fetches `getProjectsWithMemoryCount()`, renders `<section>` grid of `ProjectCard` items, shows `<Empty>` if none
- **Composition Pattern**: Data owner — fetches and maps; delegates rendering to `ProjectCard`

#### ProjectCard
- **Type**: Client Component (`"use client"`)
- **Props**: `{ id: number; name: string; memoryCount: number }`
- **Responsibilities**: Renders clickable `<article>` (shadcn `Card`) that navigates to `/memories/[id]`, shows `Badge` with count
- **Composition Pattern**: Explicit variant — no boolean props; receives exactly what it needs

#### MemoryListPage
- **Type**: Server Component (async)
- **Props**: `{ params: Promise<{ projectId: string }> }`
- **Responsibilities**: Fetches `getMemoriesByProject(projectId)` ordered by `createdAt DESC`, renders `<section>` list, redirects to `/memories` if project not found
- **Composition Pattern**: Data owner — same pattern as `ProjectsGridPage`

#### MemoryCard
- **Type**: Client Component (`"use client"`)
- **Props**: `{ id: number; title: string; contentPreview: string; topic: MemoryTopic; createdAt: string }`
- **Responsibilities**: Shows title, topic `Badge`, truncated preview (100 chars done server-side), `createdAt` ISO string formatted via `Intl.DateTimeFormat` inside the component (avoids hydration mismatch), delete `Button` + `AlertDialog`
- **Composition Pattern**: Compound-ready — `MemoryCard.Root`, `MemoryCard.Header`, `MemoryCard.Preview`, `MemoryCard.Actions` (internal, not exported separately for now — single file)

#### MemoryDetailDialog
- **Type**: Client Component (`"use client"`)
- **Props**: `{ title: string; content: string; topic: MemoryTopic; createdAt: string }`
- **Responsibilities**: Full-content modal; triggered by clicking card body; `ScrollArea` for long content
- **Composition Pattern**: Rendered inside `MemoryCard`; uses shadcn `Dialog` compound structure

#### MemoriesNavButton
- **Type**: Client Component (`"use client"`)
- **Props**: none
- **Responsibilities**: Sidebar `SidebarMenuButton` linking to `/memories`; inserted above `NewProjectButton` in `AppSidebar`
- **Composition Pattern**: Follows `NewProjectButton` pattern exactly

## Routing Design

```
/memories                       → ProjectsGridPage   (app/memories/page.tsx)
/memories/[projectId]           → MemoryListPage     (app/memories/[projectId]/page.tsx)
```

Both routes share a common layout shell at `app/memories/layout.tsx` that sets up `SidebarProvider` + `AppSidebar` (same pattern as `ChatLayout`). The layout receives `ProjectWithChats[]` from `getProjectsWithChats()` for sidebar nav.

**Params contract:**
- `projectId` → validated with `Number()`, `notFound()` if `isNaN`

## Data Flow

```
DB: memories JOIN projects
        │
        ▼
getProjectsWithMemoryCount()         ← new helper, single query (GROUP BY)
        │
        ▼
ProjectsGridPage (RSC)               ← renders grid, passes {id, name, count} as props
        │
        ▼
ProjectCard (client)                 ← router.push on click; no internal state

DB: memories WHERE project_id = ?
        │
        ▼
getMemoriesByProject(id)             ← new helper, ORDER BY created_at DESC
        │
  truncate to 100 chars (server)
        │
        ▼
MemoryListPage (RSC)                 ← renders list, passes serialized props
        │
        ▼
MemoryCard (client)
  ├── click body → MemoryDetailDialog (local state: open/closed)
  └── click delete → AlertDialog confirm → deleteMemory(id) Server Action
                                         → router.refresh()
```

**Serialization budget**: `MemoryCard` receives only: `id`, `title`, `contentPreview` (≤100 chars), `topic`, `createdAt` (ISO string). Full `content` only passed to `MemoryDetailDialog` trigger — fetched from separate prop on the card row, not serialized into every card.

> Wait — detail requires full content. Solution: pass `content` as a prop too (one string per card). This is acceptable; the list is paginated implicitly by project scope and SQLite is local.

## Database Design

### New query functions in `src/lib/db-helpers.ts`

```ts
// Single query: project summary with memory count
// Excludes placeholder names matching /^Proyecto #\d+$/
export interface ProjectMemorySummary {
  id: number;
  name: string;
  memoryCount: number;
}
export async function getProjectsWithMemoryCount(): Promise<ProjectMemorySummary[]>
// SELECT p.id, p.name, COUNT(m.id) as memoryCount
// FROM projects p
// INNER JOIN memories m ON m.project_id = p.id
// WHERE p.name NOT REGEXP '^Proyecto #\d+$'   ← SQLite: NOT LIKE 'Proyecto #%' OR length check
// GROUP BY p.id
// ORDER BY MAX(m.created_at) DESC
// (uses LIKE 'Proyecto #%' since SQLite has no REGEXP by default)

// Memories for one project, newest first
export async function getMemoriesByProject(
  projectId: number
): Promise<Memory[]>
// SELECT * FROM memories WHERE project_id = ? ORDER BY created_at DESC

// Delete a single memory by id
export async function deleteMemory(id: number): Promise<void>
// DELETE FROM memories WHERE id = ?
```

**Placeholder filter**: SQLite lacks native REGEXP. Use Drizzle `like(projects.name, 'Proyecto #%')` negated with `not()`. This correctly filters names like "Proyecto #1", "Proyecto #12", etc.

### New Server Action in `src/app/memories/actions.ts`

```ts
"use server"
export async function deleteMemoryAction(memoryId: number): Promise<void>
// calls deleteMemory(memoryId), revalidatePath('/memories/[projectId]')
```

## Files to Create

| File | Description |
|------|-------------|
| `src/app/memories/layout.tsx` | Sidebar shell — mirrors ChatLayout but simpler (no chat state) |
| `src/app/memories/page.tsx` | ProjectsGridPage — fetches + renders project grid |
| `src/app/memories/[projectId]/page.tsx` | MemoryListPage — fetches + renders memory cards |
| `src/app/memories/actions.ts` | `deleteMemoryAction` Server Action |
| `src/components/MemoriesNavButton.tsx` | Sidebar button linking to /memories |
| `src/components/ProjectCard.tsx` | Clickable project rectangle (client) |
| `src/components/MemoryCard.tsx` | Memory card with delete + detail dialog (client) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/db-helpers.ts` | Add `getProjectsWithMemoryCount()`, `getMemoriesByProject()`, `deleteMemory()` |
| `src/components/AppSidebar.tsx` | Add `<MemoriesNavButton>` above `<NewProjectButton>` inside `SidebarMenu` |

## shadcn Components Required

Components not yet installed (check before adding): `card`, `badge`, `alert-dialog`, `dialog`. The project already has: `button`, `scroll-area`, `skeleton`, `separator`, `sidebar`, `tooltip`.

Install via: `pnpm dlx shadcn@latest add card badge alert-dialog dialog`

## Accessibility Implementation

| Concern | Technique |
|---------|-----------|
| Semantic structure | `<section aria-label="Proyectos con memorias">`, `<article>` per card |
| Delete button label | `aria-label="Eliminar memoria: {title}"` |
| Dialog title | `DialogTitle` always present (sr-only if visually hidden) |
| Focus management | `AlertDialog` traps focus automatically via Radix; on delete confirm, focus returns to list |
| Keyboard nav | Tab through cards; Enter/Space on card body → detail; Delete key on focused card → confirm dialog |
| Color contrast | Semantic tokens only: `text-foreground`, `text-muted-foreground`, `bg-background` |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — no CSS transitions on card hover; use `motion-safe:` Tailwind prefix |
| Hydration | `createdAt` formatted inside component with `Intl.DateTimeFormat` — no `suppressHydrationWarning` needed if formatted only after mount via `useEffect` |
| Focus indicator | Existing Tailwind ring styles (`:focus-visible:ring-2`) — no override needed |
| Live region | After delete, `router.refresh()` re-renders list; no explicit `aria-live` needed |

**Keyboard shortcut for delete**: `onKeyDown` handler on the card article — `if (e.key === 'Delete') openConfirmDialog()`. Must check `e.target === e.currentTarget` to avoid conflicts with input inside dialog.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| DB helpers | `getProjectsWithMemoryCount` excludes placeholder names | Unit test with in-memory SQLite fixture |
| DB helpers | `deleteMemory` removes row | Unit test |
| Server Action | `deleteMemoryAction` calls helper + revalidates | Integration test with mock |
| ProjectCard | Navigates on click | React Testing Library + `userEvent` |
| MemoryCard | Delete flow — confirm → action called | RTL + mock Server Action |
| MemoryCard | Detail dialog opens on card click | RTL |
| Accessibility | axe-core scan on both routes | `@axe-core/react` in dev or Playwright axe plugin |
| Visual | Keyboard nav end-to-end | Playwright with `.keyboard.press('Tab')` |
