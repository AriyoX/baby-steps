# Child Mode And Navigation

## Current Status

Database-content-backed prototype.

## Purpose

Child mode gives the active child a landscape learning area with tabs for games, coloring, stories, and learning content. It also includes a parent gate for returning to the parent dashboard.

## User Flow

1. Parent opens a child detail screen.
2. Parent taps `Launch Child Mode`.
3. `ChildContext` stores the active child.
4. Child mode opens under `/child`.
5. Child tabs route to:
   - `/child/(tabs)/index` for games
   - `/child/(tabs)/coloring`
   - `/child/(tabs)/Stories`
   - `/child/(tabs)/learning`
6. Games, Coloring, and Stories render exact-language database menu cards through `AfricanThemeGameInterface`. Learning renders the published exact-language Learning Hub path.
7. The parent gate shows a random 3-digit PIN and returns to `/parent` after correct entry.

## Main Files Involved

- `app/child/_layout.tsx`
- `app/child/(tabs)/_layout.tsx`
- `app/child/(tabs)/index.tsx`
- `app/child/(tabs)/coloring.tsx`
- `app/child/(tabs)/Stories.tsx`
- `app/child/(tabs)/learning.tsx`
- `app/child/parent-gate.tsx`
- `components/child/AfricanThemeGameInterface.tsx`
- `context/ChildContext.tsx`

## Key Components, Screens, And Functions

- `TabLayout` in `app/child/_layout.tsx`
- `Tabs` layout in `app/child/(tabs)/_layout.tsx`
- `AfricanThemeGameInterface`
- `ParentGate`
- `setActiveChild` and `activeChild` from `ChildContext`

## Data And Content Used

Navigation cards and Learning Hub stages are loaded through the exact-language database content repository and its last-known-good cache. Missing content shows the existing unavailable/coming-soon state; it does not fall back to bundled Luganda records. Learning Hub remains separate from the supplementary standalone games, and Practice Mix remains locked with no renderer.

## State Management And Logic Notes

- Child mode checks `activeChild`; if missing, it redirects to `/parent`.
- Child routes lock orientation to landscape.
- Parent/settings screens generally lock or return to portrait.
- Android hardware back in child dashboard routes to `/child/parent-gate`.
- The parent gate clears `activeChild` when the random PIN is entered correctly.

## API Or Database Usage

Child mode depends on a child profile selected from Supabase-backed parent screens. Games, Stories, Coloring menu cards, and Learning Hub content are read through the shared exact-language Supabase repository/cache. Direct Coloring canvases remain bundled.

## Tests

Focused tests cover child tab navigation metadata, Learning loading/unavailable states, and selected route/layout behavior. Full route-guard recovery, native orientation, and parent-gate PIN flows still require device or end-to-end coverage.

## Known Limitations Or Bugs

- `activeChild` is in memory only.
- The tab route is named `Stories` with uppercase `S`, which should be preserved when linking.
- The legacy Museum tab is hidden, and its deep-link routes require an exact-language published Museum menu before the archived screens can render.
- Games, Stories, and Coloring cards come from the exact-language database bundle; there is no bundled fallback card list.
- Orientation behavior needs device testing.

## Future MVP Improvements

- Add child mode route recovery for reloads/cold starts.
- Add parent gate tests and device QA.
- Add schema-safe support for new menu card types only when a real route requires it.
- Confirm route naming conventions before adding more tabs.

## Manual QA Checklist

- [ ] Launch child mode from a real child detail screen.
- [ ] Confirm child name and age appear.
- [ ] Confirm device rotates/locks to landscape.
- [ ] Visit Games, Coloring, Stories, and Learning tabs.
- [ ] Tap Games, Coloring, and Stories cards and confirm they route to existing screens.
- [ ] Open every published/startable Learning stage and lesson; confirm locked Practice Mix remains locked.
- [ ] Select a language with no published content and confirm no Luganda menu or Learning Hub appears.
- [ ] Press Android hardware back and confirm parent gate opens.
- [ ] Enter wrong PIN and confirm it does not return to parent dashboard.
- [ ] Enter displayed PIN and confirm return to `/parent`.
