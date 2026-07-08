# Child Mode And Navigation

## Current Status

Implemented prototype.

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
6. Games, coloring, and stories render `AfricanThemeGameInterface` with different cards. Learning renders a dedicated hub with placeholder stages for the upcoming learning path.
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

Navigation cards are loaded through the content repository where available, with local fallback content for MVP readiness. The Learning hub uses `content/learningHubContent.json` through `content/learningHubRepository.ts` for its official MVP stage placeholders instead of routing children into older standalone games. Practice Mix remains locked until future lesson progress can unlock review practice.

## State Management And Logic Notes

- Child mode checks `activeChild`; if missing, it redirects to `/parent`.
- Child routes lock orientation to landscape.
- Parent/settings screens generally lock or return to portrait.
- Android hardware back in child dashboard routes to `/child/parent-gate`.
- The parent gate clears `activeChild` when the random PIN is entered correctly.

## API Or Database Usage

None directly. Child mode depends on a child profile selected from Supabase-backed parent screens.

## Tests

No tests currently cover child mode navigation, route guards, orientation, or parent gate behavior.

## Known Limitations Or Bugs

- `activeChild` is in memory only.
- The tab route is named `Stories` with uppercase `S`, which should be preserved when linking.
- The legacy Museum tab route is intentionally hidden from child tab navigation during the Learning replacement. Museum routes, assets, and `react-native-webview` usage remain archived in place because the feature may return after redesign.
- The default fallback card list still points to placeholder `tester` targets, though the normal `index` tab path maps to the real games card list.
- Orientation behavior needs device testing.

## Future MVP Improvements

- Add child mode route recovery for reloads/cold starts.
- Add parent gate tests and device QA.
- Normalize card metadata into typed content.
- Confirm route naming conventions before adding more tabs.

## Manual QA Checklist

- [ ] Launch child mode from a real child detail screen.
- [ ] Confirm child name and age appear.
- [ ] Confirm device rotates/locks to landscape.
- [ ] Visit Games, Coloring, Stories, and Learning tabs.
- [ ] Tap Games, Coloring, and Stories cards and confirm they route to existing screens.
- [ ] Tap every Learning stage and confirm it opens the friendly placeholder notice instead of an older game.
- [ ] Press Android hardware back and confirm parent gate opens.
- [ ] Enter wrong PIN and confirm it does not return to parent dashboard.
- [ ] Enter displayed PIN and confirm return to `/parent`.
