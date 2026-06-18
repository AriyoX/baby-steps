# Coloring

## Current Status

Implemented prototype.

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

Active templates:

- Buganda Emblem: `assets/images/emblem.png`
- King: `assets/images/king.jpg`
- Cow/Animals: `assets/images/cow.png`
- Shapes: `assets/images/shapes.jpg`
- Mask: `assets/images/mask.png`

Each route provides its own palette. The shared coloring base also has default colors.

## State Management And Logic Notes

- Drawing paths live in local component state.
- Undo/redo stacks store previous path arrays.
- Drawing is rendered with `react-native-svg`.
- The canvas is wrapped with `react-native-view-shot` for capture.
- `expo-media-library` saves captures to a `ColoringBook` album.
- `expo-sharing` opens the device share sheet when available.
- `@openspacelabs/react-native-zoomable-view` provides zooming.

## API Or Database Usage

No Supabase usage. Coloring does not currently write activities or achievements.

## Tests

No tests currently cover coloring, drawing, save, share, or media permissions.

## Known Limitations Or Bugs

- `components/child/AfricanColoringGame.tsx` appears to be an older fully commented prototype, not the active implementation.
- Media-library permission behavior must be verified on native Android/iOS builds.
- `app.json` blocks some Android media read permissions, so save/share needs device QA.
- Coloring progress is not persisted if the screen closes.

## Future MVP Improvements

- Decide whether coloring completions should write activities.
- Add save/share permission testing.
- Add template metadata in a typed content file.
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
