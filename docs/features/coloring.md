# Coloring

## Current Status

Database-menu-backed prototype with bundled canvases.

## Purpose

Coloring gives children a drawing surface over bundled templates, with brush, eraser, fill, undo/redo, save, and share tools.

## User Flow

1. Child opens the Coloring tab.
2. Child selects one of the coloring cards.
3. The shared coloring screen opens with a template image.
4. Child draws with color and brush controls.
5. Child can undo, redo, clear, save to gallery, or share.

## Main Files Involved

- `components/child/AfricanThemeGameInterface.tsx`
- `app/child/games/coloring/coloring-game-base.tsx`
- `app/child/games/coloring/emblem.tsx`
- `app/child/games/coloring/king.tsx`
- `app/child/games/coloring/animals.tsx`
- `app/child/games/coloring/shapes.tsx`
- `app/child/games/coloring/mask.tsx`
- `components/child/AfricanColoringGame.tsx`

## Key Components, Screens, And Functions

- `ColoringGameScreen`
- `smoothPath`
- `handleUndo`
- `handleRedo`
- `handleFill`
- `saveToGallery`
- `shareImage`

## Data And Content Used

The exact-language Coloring menu is dynamic through the `content_items` `child_menu/coloring` row. It contains stable card IDs, order, copy, image keys, and route targets. The five currently published Luganda cards point to bundled template routes:

Active templates:

- Buganda Emblem: `assets/images/emblem.png`
- King: `assets/images/king.jpg`
- Cow/Animals: `assets/images/cow.png`
- Shapes: `assets/images/shapes.jpg`
- Mask: `assets/images/mask.png`

Each route still provides its own bundled template and palette. Those static assets and drawing configuration remain code-owned because the renderer and React Native asset bundler require them. Direct Coloring routes render their bundled canvas without waiting for database content; the database controls menu discovery, not the drawing mechanic. A language with no published Coloring menu receives no Luganda cards.

## State Management And Logic Notes

- Drawing paths live in local component state.
- Undo/redo stacks store previous path arrays.
- Drawing is rendered with `react-native-svg`.
- The canvas is wrapped with `react-native-view-shot` for capture.
- `expo-media-library` saves captures to a `ColoringBook` album.
- `expo-sharing` opens the device share sheet when available.
- `@openspacelabs/react-native-zoomable-view` provides zooming.

## API Or Database Usage

The menu is read through the shared exact-language content repository/cache. Saving artwork updates existing Coloring progress/activity behavior; the drawing surface does not edit database content.

## Tests

`app/child/games/coloring/__tests__/bundledColoringRoutes.test.tsx` verifies that all five direct Coloring routes render their bundled canvas without waiting for database content. Drawing gestures, undo/redo, saving, sharing, and native media permissions still require device coverage.

## Known Limitations Or Bugs

- `components/child/AfricanColoringGame.tsx` appears to be an older fully commented prototype, not the active implementation.
- Media-library permission behavior must be verified on native Android/iOS builds.
- `app.json` blocks some Android media read permissions, so save/share needs device QA.
- In-progress drawing paths are not restored after the screen closes. Saving artwork still uses the existing progress/activity behavior.

## Future MVP Improvements

- Add save/share permission testing.
- Consider restoring an unsaved drawing session if pilot feedback requires it.
- Consider a generic template payload only if future Coloring content outgrows the current route/asset map.
- Remove or archive the commented prototype file if no longer needed.

## Manual QA Checklist

- [ ] Open every coloring template from the Coloring tab.
- [ ] Draw with each visible color.
- [ ] Change brush size.
- [ ] Use brush, eraser, and fill.
- [ ] Test undo and redo.
- [ ] Clear canvas.
- [ ] Save artwork on Android and iOS.
- [ ] Share artwork on Android and iOS.
- [ ] Deny media permission and confirm the app handles it.
