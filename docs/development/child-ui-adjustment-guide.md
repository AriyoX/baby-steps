# Child UI adjustment guide

This guide maps the child-facing UI and identifies the safest places to change its appearance later. It is intentionally descriptive: it does not prescribe a redesign or change game, story, progress, activity, or achievement behavior.

## Design boundaries

When adjusting child UI:

- Keep scoring, win conditions, progress saving, activity logging, and achievement evaluation separate from presentation changes.
- Prefer changing layout and render branches after tracing the state transition that reaches them.
- Let backgrounds extend edge-to-edge, but keep headers, buttons, progress indicators, cards, and footer actions inside safe areas.
- Preserve the child route orientation unless the product decision is explicitly to support portrait mode.
- Do not use a React Native `Modal` for a new result or completion screen. A normal render branch or an in-tree overlay is easier to size and test.
- Use existing brand colors, Quicksand text variants, `StyledText`, `CachedImage`, and current child controls before adding new visual dependencies.

## Screen map

| Area | Main files | What to adjust there |
| --- | --- | --- |
| Child route shell | `app/child/_layout.tsx` | Orientation, route stack, child-level providers |
| Child tab bar | `app/child/(tabs)/_layout.tsx` | Tab height, icon size, label spacing, bottom inset handling |
| Games/Stories/Coloring shell | `components/child/AfricanThemeGameInterface.tsx` | Shared header, avatar, audio/parent controls, horizontal card rail |
| Learning tab | `app/child/(tabs)/learning.tsx` | Learning header and stage-card rail |
| Learning stage path | `app/child/learning/[stageId].tsx` | Stage header, lesson rail, lesson cards |
| Learning lesson shell | `app/child/learning/[stageId]/lesson/[lessonId].tsx` | Lesson header, progress dots, mechanic viewport, lesson completion |
| Learning mechanics | `components/learning/mechanics/*.tsx` | Individual activity card, feedback, result/continue state |
| Generic DB story | `components/stories/GenericStoryRenderer.tsx` | Reader header, page layout, quiz, settings, finish state |
| Learning Game | `components/games/LearningGameComponent.tsx` | Stage/level cards, learning cards, play layout, level result |
| Counting Game | `components/games/CountingGameComponent.tsx` | Counting canvas, options, feedback, stage result |
| Word Game | `components/games/WordGameComponent.tsx` | Header, letter controls, hints, level/full-game result |
| Cards Matching | `components/games/CardsMatchingComponent.tsx` | Board sizing, match-information overlay, game result |
| Puzzle Game | `components/games/PuzzleGameComponent.tsx` | Puzzle sizing, preview, controls, solved state |
| Achievement notice | `context/ChildNoticeContext.tsx` | Notice position only; avoid changing queue, timing, or award behavior |

## Safe-area strategy

The project uses `react-native-safe-area-context`.

### Stack screens

Child screens outside the tab navigator should protect all four edges:

```tsx
<SafeAreaView
  style={{ flex: 1 }}
  edges={["top", "bottom", "left", "right"]}
>
  {children}
</SafeAreaView>
```

This protects Android status/navigation areas, iPhone notches and home indicators, and landscape side cutouts.

### Tab screens

The tab bar should own the bottom inset. Tab content should normally protect only the top and sides:

```tsx
<SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
  {children}
</SafeAreaView>
```

Reserve enough content space for the actual tab-bar height, but do not add the bottom inset both to the screen and the tab bar. If the bar is absolutely positioned, calculate one clearance value from the bar's base height plus `insets.bottom`.

### Overlays

An absolutely positioned child can bypass the visual padding of its parent. For an interactive in-tree overlay, apply inset-aware padding to the overlay itself:

```tsx
const insets = useSafeAreaInsets();

<View
  accessibilityViewIsModal
  style={{
    ...StyleSheet.absoluteFillObject,
    paddingTop: Math.max(insets.top, 16),
    paddingBottom: Math.max(insets.bottom, 16),
    paddingLeft: Math.max(insets.left, 20),
    paddingRight: Math.max(insets.right, 20),
  }}
>
  {content}
</View>
```

While an overlay is visible, hide underlying controls from accessibility traversal with `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`. Handle Android hardware back if dismissing or leaving the overlay is supported.

## Responsive sizing

Use `useWindowDimensions()` inside components that respond to rotation or window resizing. Avoid module-level `Dimensions.get("window")`, because its values do not react to later layout changes.

For a layout that must fit between landscape cutouts, calculate from the safe content size:

```tsx
const { width, height } = useWindowDimensions();
const insets = useSafeAreaInsets();
const safeWidth = width - insets.left - insets.right;
const safeHeight = height - insets.top - insets.bottom;
```

Use minimum and maximum sizes only after deriving the available safe width. Check that a minimum width cannot become wider than a small device's actual content area.

Useful breakpoints should be based on layout needs rather than device names. In the current child landscape UI, screen height is often the limiting dimension.

## Common visual adjustments

### Headers

- Keep back/close buttons at least 44 by 44 points.
- Give long titles `flex: 1`, `minWidth: 0`, and controlled wrapping or `adjustsFontSizeToFit`.
- Avoid combining a large fixed top padding with safe-area padding.
- Test the header while an achievement notice is visible.

### Cards and copy

- Prefer `maxWidth` plus available-width calculation over fixed percentage widths.
- Let descriptions wrap instead of relying on a single line.
- Use `flexShrink: 1` and `minWidth: 0` inside horizontal rows.
- Keep result values tied to real state: score, matches, moves, correct answers, levels, or pages.

### Buttons

- Maintain a minimum 44-point touch target.
- Add `activeOpacity` or pressed styling and a visible disabled state.
- Allow action rows to wrap on small screens.
- Put destructive or exit actions after the primary continue/retry action in accessibility order.

### Images and emoji

- Derive sizes from the shorter safe dimension.
- Keep a bounded minimum and maximum.
- Use `CachedImage` and existing fallback assets for content-driven images.

## Completion and result UI

`components/child/ChildCompletionCard.tsx` is a presentation-only completion card. It is currently used by `GenericStoryRenderer` after a story completion has been saved. It accepts:

- `title` and effort-focused `message`
- genuine `metrics`
- caller-owned `actions`
- optional icon/accent color
- optional safe `availableWidth`

Game rules and navigation should remain in the game component:

```tsx
<ChildCompletionCard
  title="Round complete!"
  message="You kept trying until the end."
  metrics={[{ label: "Moves", value: moves }]}
  actions={[
    { label: "Play Again", onPress: resetGame },
    { label: "Back to Games", onPress: goBack, variant: "quiet" },
  ]}
/>
```

Before adding a completion render branch, trace the existing rule that marks the activity complete. Guard persistence separately from the UI state so repeated presses and rerenders cannot save twice.

### Generic stories

The current DB-backed route is `app/child/stories/[storyId].tsx`, rendered by `GenericStoryRenderer`. The eight named story routes redirect into this route. Its Finish action saves completion and then renders `ChildCompletionCard` with Read Again and Back to Stories actions. When changing that flow:

1. Do not save merely because the final page rendered.
2. Require an explicit final action.
3. Save once behind a synchronous ref guard.
4. Show completion without immediately navigating away.
5. Let Read Again reset reader state without resetting the saved-completion guard.

The old named story component files still contain a separate `StoryProgress` path. Do not update those unless the routes are reactivated.

### Learning Hub mechanics

Each mechanic owns its interaction state and calls `onComplete(ItemResult)` to hand control back to the lesson shell.

- `mini_quiz`: keep question progression, answer attempts, and correctness in the mechanic. A future result screen should appear before `onComplete` and Continue should be the only action that calls it.
- `story_bite`: intermediate pages should only update the page index. The explicit final action can show an internal finished state; Continue then calls `onComplete` once.
- Do not add a second blocking overlay over the lesson-completion screen.

## Modal guidance

Before changing a child `Modal`, record its purpose and whether it requires a native window.

- Keep native Modal for a genuinely full-screen media viewer or a focused utility dialog when platform presentation is important.
- Add `onRequestClose` for Android.
- Declare supported orientations when the child route is landscape-only.
- Put interactive content in a four-edge `SafeAreaView`.
- For a normal result state, prefer a render branch or in-tree overlay.

Current child-mode native Modals include Word Game utility dialogs, the generic story accessibility dialog, dormant legacy story settings dialogs, and the archived Museum art video viewer. Full-window translucent dialogs should set both status-bar and navigation-bar translucency so the dim backdrop covers system safe areas consistently. Do not refactor them as part of unrelated UI work.

## Adjustment workflow

1. Identify the exact render branch and the state that reaches it.
2. Record current behavior with screenshots on a small Android device and a notched iPhone.
3. Change one layer at a time: safe area, structure, spacing, typography, then decoration.
4. Keep persistence and achievement calls unchanged unless the task explicitly concerns their timing.
5. Test long translated text and missing images.
6. Verify completion with an achievement notice visible.
7. Run:

```text
npm run typecheck
npm run lint
npm test -- --runInBand
git diff --check
```

## Device checklist

Android:

- small phone with status and navigation bars
- gesture navigation
- landscape status-bar and side-cutout behavior
- hardware back on visible overlays and native Modals

iOS:

- notched iPhone in the supported orientation
- home-indicator clearance
- landscape left/right side insets
- native Modal rotation and dismissal

Flows:

- open and finish a generic story, then read again
- complete `story_bite` and `mini_quiz`
- finish and retry each standalone game
- show an achievement notice while a completion screen is visible
