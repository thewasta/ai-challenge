# Code Context: vml-ai-challenge Project

## Files Retrieved

### Entry Points & Core App Logic
1. `src/app/layout.tsx` (lines 1-20) - Root layout with metadata, Spanish language, tailwind theme classes
2. `src/app/page.tsx` (lines 1-18) - HomePage with landing page UI, Button link to "/projects/new"
3. `src/app/globals.css` (full file) - Complete design system with OKLch color tokens, brand palette, chart colors

### Database Layer
4. `src/db/schema.ts` (lines 1-54) - Drizzle ORM tables: `projects` (brand context), `chats` (conversation sessions), `messages` (user/assistant/tool interactions)
5. `src/db/index.ts` (lines 1-12) - Better-sqlite3 + Drizzle setup with WAL mode enabled

### Components
6. `src/components/ui/button.tsx` (full file) - Base-UI Button wrapper with class-variance-authority, supports 6 variants (default, outline, secondary, ghost, destructive, link) and 8 sizes

### Configuration & Utilities
7. `src/lib/utils.ts` (lines 1-8) - `cn()` helper: clsx + tailwind-merge utility
8. `package.json` (full) - Full dependency list with versions
9. `tsconfig.json` (full) - Strict TypeScript, ESNext, path aliases `@/*`
10. `next.config.ts` (full) - Next.js 16 with Turbopack, `better-sqlite3` as server external
11. `drizzle.config.ts` (full) - Drizzle kit configured for SQLite with `./sqlite.db` path
12. `components.json` (full) - shadcn config with `base-nova` style, lucide icons, CSS variables
13. `biome.json` (full) - Formatter/linter rules: 100-char line width, no `any`, trailing commas
14. `postcss.config.mjs` (full) - PostCSS plugin for Tailwind CSS v4

---

## Key Code

### Database Schema
**Location:** `src/db/schema.ts`

```typescript
// projects table: stores brand/project profiles
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  buyerPersona: text("buyer_persona").notNull().default(""),
  competitors: text("competitors").notNull().default(""),
  brandContext: text("brand_context").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(() => new Date()),
});

// chats table: conversation sessions scoped to a project
export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nuevo chat"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(() => new Date()),
});

// messages table: stores user, assistant, and tool interaction messages
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] }).notNull().default("user"),
  content: text("content").notNull().default(""),
  toolName: text("tool_name"),
  toolResult: text("tool_result"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
```

**Schema Status:**
- ✅ Tables defined correctly with cascade deletes
- ❌ No migrations generated yet (`drizzle/` folder does not exist)
- ℹ️ `sqlite.db` file exists in repo root (WAL mode enabled)

### Design System (Tailwind CSS + OKLch)
**Location:** `src/app/globals.css`

**Color Palette (Light Mode):**
- **Primary (Navy):** `oklch(0.278 0.033 260)` → Brand color
- **Secondary (Slate):** `oklch(0.366 0.027 260)` → Secondary UI
- **Success (Emerald):** `oklch(0.696 0.168 162)` → Positive metrics (chart-1)
- **Warning (Amber):** `oklch(0.795 0.164 84)` → Warnings/audits (chart-2)
- **Destructive (Red):** `oklch(0.637 0.237 26)` → Errors (chart-3)

**Dark Mode:** Adjusted lightness values for contrast, sidebar layer included.

**CSS Variables:** All standard shadcn variables (background, foreground, card, primary, secondary, muted, destructive, border, input, ring) mapped to OKLch values.

### Button Component
**Location:** `src/components/ui/button.tsx`

Uses `@base-ui/react` Button with class-variance-authority variants:
- **Variants:** default (navy bg), outline (border + bg-background), secondary, ghost, destructive, link
- **Sizes:** xs (6h), sm (7h), default (8h), lg (9h), icon (8x8), icon-xs (6x6), icon-sm (7x7), icon-lg (9x9)
- **Features:** Focus ring support, disabled state, aria attributes, SVG icon sizing

### Dependencies Overview
**Location:** `package.json`

**Core:**
- `next@16.2.7` (App Router)
- `react@19.2.7`, `react-dom@19.2.7`
- `typescript@6.0.3` (strict mode)

**Database:**
- `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10` (no migrations yet)
- `better-sqlite3@12.10.0` (embedded DB)

**UI/Styling:**
- `@base-ui/react@1.5.0` (headless component library)
- `tailwindcss@4.3.0`, `@tailwindcss/postcss@4.3.0`, `postcss@8.5.15`
- `shadcn@4.11.0` (shadcn/ui CLI, base-nova style)
- `lucide-react@1.17.0` (icons)
- `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.6.0` (utilities)

**AI Integration (Installed but not integrated):**
- `@ai-sdk/openai@3.0.68` (OpenAI integration)
- `ai@6.0.198` (Vercel AI SDK Core)
- `zod@4.4.3` (schema validation for tools)

**Content Rendering:**
- `react-markdown@10.1.0`, `remark-gfm@4.0.1` (Markdown + GitHub flavored syntax)

**Dev Tools:**
- `@biomejs/biome@2.4.16` (linter/formatter with noExplicitAny errors, noUnusedImports/Variables warnings)
- `@types/node@25.9.2`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`

---

## Architecture

### Current State
The project is in **early MVP stage**, with foundation infrastructure in place but no core feature implementations:

```
src/
├── app/
│   ├── layout.tsx       ← Root layout (Spanish, theme classes)
│   ├── page.tsx         ← HomePage: landing page with CTA button
│   └── globals.css      ← Complete design system (OKLch tokens)
├── db/
│   ├── schema.ts        ← Drizzle tables: projects, chats, messages
│   └── index.ts         ← Better-sqlite3 + Drizzle ORM client
├── components/
│   └── ui/
│       └── button.tsx   ← Base-UI Button wrapper with CVA
└── lib/
    └── utils.ts         ← cn() utility (clsx + tailwind-merge)
```

### Missing Implementation (Critical for MVP)
1. **No API routes** for chat, tools, or agent orchestration
2. **No agent definitions** or AI SDK tool schemas (Zod-based)
3. **No project/chat creation pages** (Homepage links to "/projects/new" which doesn't exist)
4. **No chat interface** (message rendering, user input, streaming)
5. **No Drizzle migrations** (tables defined but not migrated to `sqlite.db`)
6. **No mock tool implementations** (Lighthouse audit mock, DataForSEO keywords mock)

### Data Flow (Intended, Not Yet Implemented)
```
User Input (Chat Page)
    ↓
POST /api/chat (Server Action or API Route)
    ↓
AI SDK Core + Orchestrator Agent
    ↓
[Agent detects intent] → Activates Tools
    ├─ Tool: mockLighthouseAudit (Zod schema defined)
    └─ Tool: mockDataForSeoKeywords (Zod schema defined)
    ↓
Tool execution + LLM response generation
    ↓
Messages saved to SQLite (projects → chats → messages)
    ↓
Markdown rendered in UI (react-markdown + remark-gfm)
```

### Technology Stack Alignment
- **Next.js 16 (App Router):** Routes at `src/app/[group]/[action]/page.tsx`, API routes at `src/app/api/[endpoint]/route.ts`
- **SQLite + Drizzle:** Lightweight, embedded, no server setup needed; ORM handles migrations
- **Tailwind CSS v4:** OKLch color space for better perceptual accuracy; shadcn/ui base-nova style
- **Vercel AI SDK:** Server-side LLM calls, tool invocation, streaming responses
- **React 19:** Functional components, composition patterns; Server Components in App Router
- **TypeScript strict:** No `any` allowed (enforced by Biome)
- **Biome linter:** Fast Rust-based linter; formats code to 100-char width

---

## Start Here

### 1. **First Step: Database Setup**
**File:** `src/db/schema.ts` and `src/db/index.ts`

- Schema is defined but migrations don't exist yet.
- **Next task:** Run `pnpm exec drizzle-kit push` to create migrations and initialize `sqlite.db` tables.
- Verify with: `pnpm exec drizzle-kit studio` to browse the database.

### 2. **Second Step: Pages & Layout**
**Files:** `src/app/layout.tsx`, `src/app/page.tsx`

- Root layout is ready; globals.css design system is complete.
- **Next tasks:**
  - Create `/projects/new` page for project onboarding form
  - Create `/projects/[id]/chats` page for chat interface
  - Create `/projects/[id]/chats/[chatId]` page for active chat

### 3. **Third Step: API Routes**
**New files needed:**

- `src/app/api/projects/route.ts` (POST: create project, GET: list projects)
- `src/app/api/chats/route.ts` (POST: create chat)
- `src/app/api/chat/messages/route.ts` (POST: stream messages, AI SDK + tools)

### 4. **Fourth Step: AI Integration**
**New files needed:**

- `src/lib/agents/orchestrator.ts` (Orchestrator agent prompt + tool definitions)
- `src/lib/tools/lighthouse.ts` (Mock Lighthouse audit tool with Zod schema)
- `src/lib/tools/keywords.ts` (Mock DataForSEO keywords tool with Zod schema)
- Integrate with Vercel AI SDK `generateObject()` or `streamObject()` for tool calling

### 5. **Fifth Step: Components**
**New files needed:**

- `src/components/ProjectForm.tsx` (Onboarding form with fields: name, description, buyerPersona, competitors)
- `src/components/ChatInterface.tsx` (Message thread + input box + loading states)
- `src/components/MessageRenderer.tsx` (react-markdown for Markdown + HTML rendering)
- `src/components/ToolIndicator.tsx` (Visual feedback when agent is calling tools)

### 6. **Configuration Files Already Set**
✅ `tsconfig.json` – Strict TypeScript  
✅ `biome.json` – Linter/formatter rules  
✅ `next.config.ts` – Turbopack + better-sqlite3  
✅ `drizzle.config.ts` – SQLite path configured  
✅ `components.json` – shadcn/ui configured  
✅ `postcss.config.mjs` – Tailwind CSS v4  

---

## Current State Assessment

### What Works ✅
1. **Design System:** Complete OKLch color palette with light/dark modes, all semantic tokens defined
2. **Database Schema:** Tables correctly defined with proper relationships and cascading deletes
3. **UI Component Library:** Button component ready with 6 variants and multiple sizes
4. **Configuration:** All tooling configured (TS strict, Biome linter, Next.js Turbopack, Tailwind CSS v4)
5. **Dependencies:** All required packages installed (AI SDK, Drizzle, React 19, etc.)
6. **Development Environment:** `pnpm` scripts for dev, build, typecheck, lint, db:push

### What's Missing ❌
1. **Database Migrations:** Schema defined but migrations not generated; `drizzle/` folder empty
2. **Pages:** Only HomePage exists; missing `/projects/new`, `/projects/[id]/chat`, etc.
3. **API Routes:** No routes for project creation, chat management, or message streaming
4. **AI SDK Integration:** Zero implementation of orchestrator agent or tool definitions
5. **Components:** No ProjectForm, ChatInterface, MessageRenderer, or ToolIndicator components
6. **Chat UI:** No message rendering, input handling, or streaming display
7. **Authentication:** No user/session management (MVP scope: monouseruser local use)

### Current State Summary
**The project is a **clean foundation** with:**
- ✅ Production-ready configuration and dev setup
- ✅ Complete design system (color tokens, spacing, typography ready)
- ✅ Database schema correctly modeled for the feature
- ✅ Dependencies installed and ready to use
- ❌ **Zero feature implementation** – only landing page exists

**Readiness for development:** The project is ready for the **Explore → Proposal → Spec → Design → Tasks → Apply** SDD phase. No blockers exist; all infrastructure is in place. The next agent should start by:
1. Pushing the database schema to create migrations
2. Creating the project onboarding flow
3. Implementing API routes for chat and message persistence
4. Building the chat interface with AI SDK integration

---

## Supervision Coordination

**No blockers identified.** The project is ready for feature development. All configuration, styling, and database schema are correct. Next agent should begin SDD phase work starting with database migration and page/route scaffolding.

---

**Generated by Scout Agent**  
Date: 2026-06-09  
Context: vml-ai-challenge MVP (Early Stage)
