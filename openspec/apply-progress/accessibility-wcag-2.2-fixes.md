# Apply Progress: accessibility-wcag-2.2-fixes

**Change**: accessibility-wcag-2.2-fixes  
**Mode**: Standard  
**Delivery**: single PR  
**Status**: 20/23 tasks complete

## Completed Tasks

- [x] 1.1 Update `src/app/globals.css` focus outline and scroll margin behavior
- [x] 1.2 Add reduced-motion global CSS overrides
- [x] 2.1 Add decorative icon `aria-hidden` in `src/components/AppSidebar.tsx`
- [x] 2.2 Add decorative icon `aria-hidden` in `src/components/ChatInput.tsx`
- [x] 2.3 Add decorative icon `aria-hidden` in `src/components/HomePageClient.tsx`
- [x] 2.4 Add decorative icon `aria-hidden` in `src/components/ChatArea.tsx`
- [x] 2.5 Add decorative icon `aria-hidden` in `src/components/MessageBubble.tsx`
- [x] 3.1 Confirm collapsible trigger semantics and add explicit `aria-controls`
- [x] 3.2 Add `id="main-content"` to chat main region
- [x] 3.3 Add skip link to `src/components/ChatLayout.tsx`
- [x] 3.4 Update chat input label with keyboard hint
- [x] 3.5 Add screen-reader-only send button text
- [x] 3.6 Raise disabled-state opacity in chat input controls
- [x] 3.7 Add polite live-region semantics to chat error messages
- [x] 4.1 Respect reduced-motion in chat auto-scroll
- [x] 4.2 Respect reduced-motion in agent status animation
- [x] 5.1 Create markdown image renderer with fallback alt text
- [x] 5.2 Wire markdown image renderer into `ReactMarkdown`
- [x] 6.1 Add dynamic chat metadata with fallbacks
- [x] 7.2 Run Lighthouse accessibility audit on chat page

## Remaining Tasks

- [ ] 7.1 Run axe-core CLI audit on home page and chat page
- [ ] 7.2 Run Lighthouse accessibility audit on chat page
- [ ] 7.3 Run manual keyboard navigation smoke test
- [ ] 7.4 Run manual reduced-motion smoke test

## Files Changed

- `src/app/globals.css`
- `src/components/AppSidebar.tsx`
- `src/components/ChatInput.tsx`
- `src/components/HomePageClient.tsx`
- `src/components/ChatArea.tsx`
- `src/components/ChatLayout.tsx`
- `src/components/MessageBubble.tsx`
- `src/components/AgentStatusBanner.tsx`
- `src/app/projects/[id]/chats/[chatId]/page.tsx`
- `openspec/tasks/accessibility-wcag-2.2-fixes.md`

## Deviations

- Replaced the single-line chat input control with a styled multiline `<textarea>` so the new accessibility hint about `Shift+Enter` matches real behavior instead of misleading assistive-tech users.

## Verification

- `pnpm exec biome check --write .` completed with warnings only:
  - `globals.css` reduced-motion rule uses `!important` by design to satisfy the accessibility spec
  - `MessageBubble.tsx` custom markdown image renderer intentionally uses `<img>` to preserve arbitrary markdown image compatibility
  - Existing `document.cookie` warning remains in `src/components/ui/sidebar.tsx`
- `pnpm exec tsc --noEmit` ✅
- `pnpm exec next build` ✅
- `pnpm dlx lighthouse http://localhost:3000/projects/1/chats/1 --only-categories=accessibility ...` ✅ score 1.0 (100/100)
- `pnpm dlx @axe-core/cli ...` blocked by local CLI environment: missing `chromedriver` binary (`ENOENT`)
- Manual checks 7.3 and 7.4 not executed in this apply batch
