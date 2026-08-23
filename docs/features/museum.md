# Museum

## Current Status

Archived/hidden prototype.

## Purpose

Museum screens retain local Buganda gallery prototypes with modals, images, and sounds. The child tab is hidden while Learning replaces it in primary navigation. No Museum item is published for the closed beta, and all external video/WebView functionality has been removed.

## User Flow

1. Museum is not shown in the current child tab bar.
2. Direct legacy Museum routes are gated by an exact-language published `child_menu/museum` row. No such row is seeded, so child deep links show an unavailable/retry state instead of the archived Buganda galleries.
3. If a future reviewed exact-language Museum card is published, only an allowlisted local category route may start.
4. Category details and local sounds remain behind that publication gate.

## Main Files Involved

- `components/child/AfricanThemeGameInterface.tsx`
- `app/child/games/museum/ArtifactsScreen.tsx`
- `app/child/games/museum/ArtScreen.tsx`
- `app/child/games/museum/InstrumentsScreen.tsx`
- `app/child/games/museum/TextilesScreen.tsx`
- `assets/images/`
- `assets/sounds/`

## Key Components, Screens, And Functions

- `ArtifactsScreen`
- `ArtScreen`
- `InstrumentsScreen`
- `TextilesScreen`
- Category-local `playSound` helpers
- Pinch gesture in `TextilesScreen`

## Data And Content Used

Museum content is hardcoded in screen-local arrays:

- Artifacts: 5 items with images, descriptions, and sounds.
- Art: 5 artwork entries with local images, artist text, and descriptions.
- Instruments: 5 instruments with images, descriptions, sounds, and how-to-play text.
- Textiles: 3 textiles with images, closeups, descriptions, and tap sounds.

## State Management And Logic Notes

- Selection and modal state are local to each museum screen.
- Audio uses `expo-av`.
- Android hardware back closes an open modal first, then navigates back.
- Textiles use `react-native-gesture-handler` for pinch behavior.

## API Or Database Usage

The route layout uses the shared Supabase content repository only as an exact-language publication gate. The archived gallery arrays remain code-owned and cannot render until a future migration deliberately publishes a Museum menu. Museum activity logging is not currently wired, even though `schema.sql` allows an `activity_type` of `museum`.

## Tests

`app/child/games/museum/__tests__/museumRouteLayout.test.tsx` covers exact-language publication gating, empty content, retry, and rejection of external targets. Category modals, sounds, and gestures still require device QA if Museum is ever republished.

## Known Limitations Or Bugs

- All museum content is hardcoded in screen files.
- Museum is intentionally hidden from child navigation until it is redesigned.
- Museum interactions do not appear in parent activity history.
- Audio behavior depends on `expo-av`, which should be replaced later.

## Future MVP Improvements

- Decide how Museum should return to child navigation after redesign.
- Move museum content into typed content files or database-backed content.
- Decide whether museum interactions should write activities.
- Add device QA for local audio behavior before publishing any Museum card.

## Manual QA Checklist

- [ ] Confirm Museum is absent from the child tab and direct routes show an unavailable state for both `lg` and `nyn`.
- [ ] Confirm no child-facing video button, external browser, or WebView appears.
- [ ] If Museum is deliberately republished later, review every local claim and asset first, then test modals, sounds, cleanup, gestures, and Android hardware back.
