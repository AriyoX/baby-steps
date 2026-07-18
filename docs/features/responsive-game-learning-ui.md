# Responsive Game And Learning UI

## Current Status

Implemented for the landscape child experience. This pass preserves existing safe-area behavior and adjusts layout inside those boundaries.

## Learning Hub Mechanics

The shared mechanic frame keeps the primary action outside the content scroller and enables vertical scrolling only after measured content genuinely exceeds the available height. Short cards no longer move or show a scroll indicator. Mechanic cards now switch to split-column layouts from `620px` wide rather than waiting until `680px`, and their maximum widths make better use of tablets and wider phones.

Primary Next and Finish actions are slightly larger across all mechanics. Fixed lesson status and completion cards use centered, non-scrolling layouts, while compact spacing keeps them within short landscape screens.

Adjusted mechanics:

- Tap to Learn uses a slightly wider, shorter card with a fuller focal image and balanced translation spacing.
- Listen and Choose gives more width to answer choices and their images while keeping the replay control readable.
- Choose Correct Word uses an earlier split layout, wider choice area, and clearer option imagery.
- Match Word and Picture preserves a two-column option grid, enlarges its visual choices, and reduces unnecessary stacking.
- Mini Quiz gives question copy and answers distinct horizontal regions.
- Cultural Card balances a fuller visual/local-language panel against longer explanatory copy.
- Story Bite gives story text more room, makes the page illustration more prominent, and keeps page actions outside the scroll area.

## Story Reader

The generic story reader uses slightly larger reading text and 44-point-or-larger header and page controls. Its page panel stays fixed for short content and enables scrolling only when the measured story or final quiz content overflows. The accessibility panel uses a translucent full-window native modal so the status, navigation, and cutout areas dim consistently with the story content.

The lesson header is inset slightly farther from the top without changing `SafeAreaView` or its edge configuration.

## Game-by-Game Adjustments

- Word Game: a larger responsive prompt illustration opens into an enlarged preview when tapped. After five seconds without interaction, a dismissible coach-mark points to the hint button; any touch restarts the idle timer. The answer and letter area remains the primary region.
- Cards Matching: compact header stats on narrow landscape devices and slightly lower top controls; the board sizing remains based on measured available space.
- Counting Game: better horizontal proportions for the stage summary, counting canvas, and answer rail; redundant right-side header padding was removed.
- Legacy Learning Game: three-column level cards on wider landscape screens, shorter compact cards, tighter card-review spacing, and reduced quiz vertical overhead.
- Logic Puzzle: board and tile geometry now derive from normalized live window dimensions instead of a one-time module-level measurement.
- Ball Trail: live window dimensions and a lower exit control with more compact instruction spacing.
- Coloring: live canvas dimensions, a roomier header, tighter action spacing, and a horizontal palette layout that covers less of the drawing canvas.

All coloring routes share the same responsive base component, so Animals, Emblem, King, Mask, and Shapes receive the same changes.

## Responsive Intent

- Keep key text at readable sizes instead of solving overflow through aggressive font reduction.
- Prefer landscape columns and grids over vertical stacks when enough width is available.
- Preserve a scroll fallback for long translated or authored content.
- Keep primary touch targets comfortably sized.
- Avoid safe-area workarounds and route-specific screen offsets.

## Manual QA

Test at minimum:

- `640 x 360` compact Android landscape.
- `844 x 390` notched iPhone landscape.
- A landscape tablet or emulator at least `1024px` wide.

For every Learning Hub mechanic, confirm the content normally fits without vertical scrolling, the action button remains visible, long copy can still scroll, and text does not clip.

For every game, confirm header controls sit below the top edge, right-side controls do not overflow, the main interaction area receives most of the screen, and modals remain usable. In Word Game, wait five seconds without touching the screen to confirm the hint coach-mark appears, then tap the picture and verify the enlarged preview can be closed from either the backdrop or close button. For coloring, open the palette and confirm it does not hide most of the canvas. For Logic Puzzle, rotate/re-enter the route and confirm tiles align with the board.

## Automated Coverage

- All seven focused Learning Hub mechanic suites.
- Shared responsive-sizing tests for Word Game and Cards Matching.
- Puzzle and Cards Matching completion suites.
- Cross-child/language game hydration coverage.
- Shared bundled Coloring route coverage.
