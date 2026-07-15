# Museum

## Current Status

Archived/hidden prototype.

## Purpose

Museum screens present Buganda cultural artifacts, artwork, instruments, and textiles through hardcoded galleries, modals, images, sounds, and videos. The child tab is currently hidden while Learning replaces it in primary navigation, but the route files remain archived for a future redesign.

## User Flow

1. Museum is not shown in the current child tab bar.
2. Direct legacy Museum routes are gated by an exact-language published `child_menu/museum` row. No such row is seeded, so child deep links show an unavailable/retry state instead of the archived Buganda galleries.
3. Child selects one of four museum cards.
4. The selected category screen opens.
5. Child taps gallery items to view details.
6. Some categories play local sounds or open YouTube/WebView video content.

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
- `WebView` video modal in `ArtScreen`
- Pinch gesture in `TextilesScreen`

## Data And Content Used

Museum content is hardcoded in screen-local arrays:

- Artifacts: 5 items with images, descriptions, and sounds.
- Art: 5 artwork entries with images, artist text, descriptions, and video URLs.
- Instruments: 5 instruments with images, descriptions, sounds, and how-to-play text.
- Textiles: 3 textiles with images, closeups, descriptions, and tap sounds.

## State Management And Logic Notes

- Selection and modal state are local to each museum screen.
- Audio uses `expo-av`.
- Android hardware back closes an open modal first, then navigates back.
- Art videos open in `react-native-webview`.
- Textiles use `react-native-gesture-handler` for pinch behavior.

## API Or Database Usage

The route layout uses the shared Supabase content repository only as an exact-language publication gate. The archived gallery arrays remain code-owned and cannot render until a future migration deliberately publishes a Museum menu. Museum activity logging is not currently wired, even though `schema.sql` allows an `activity_type` of `museum`.

## Tests

No tests currently cover museum category navigation, modals, sounds, videos, or gestures.

## Known Limitations Or Bugs

- All museum content is hardcoded in screen files.
- Museum is intentionally hidden from child navigation until it is redesigned.
- Some art video URLs are placeholders such as `exampleVideo2` and `exampleVideo5`.
- Museum interactions do not appear in parent activity history.
- Audio behavior depends on `expo-av`, which should be replaced later.

## Future MVP Improvements

- Decide how Museum should return to child navigation after redesign.
- Move museum content into typed content files or database-backed content.
- Replace placeholder video URLs.
- Decide whether museum interactions should write activities.
- Add QA coverage for WebView and audio behavior.

## Manual QA Checklist

- [ ] Open each museum category from the Museum tab.
- [ ] Tap every item and confirm detail modal content.
- [ ] Play every available sound.
- [ ] Confirm sounds stop/cleanup when closing modals or leaving screens.
- [ ] Open every art video and confirm valid playback or remove placeholder links.
- [ ] Test Android hardware back with and without modals open.
- [ ] Confirm museum interactions are not expected in activity history until tracking is implemented.
