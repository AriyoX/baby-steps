# Coloring

## Current status

The Coloring tab uses the same African-themed child activity interface as Games, Stories, and Learning. Its menu comes from the exact-language `child_menu/coloring` content row, while each playable canvas and its bundled image stay in code.

## Child experience

1. The child opens Coloring and chooses a picture from the shared African-themed activity card rail. The leading journey card shows local saved-art and badge progress.
2. The studio opens in landscape with a large canvas, Crayon, real segment Eraser, Flower stamp, ten colors, seven stepped brush sizes, undo, redo, and protected Start over.
   On short or narrow phones, redundant headings and the drawing hint are hidden so the icon controls and enlarged child touch targets remain reachable.
3. The canvas can be magnified from 1× to 3×. Zoom controls remain separate from drawing; the hand control enables one-finger panning while magnified. New strokes, stamps, and eraser passes are inversely scaled at higher zoom so they stay visually steady and can handle finer picture details.
4. Save writes the complete, unzoomed finished canvas to the device photo library. Share opens the system share sheet without photo-library permission.
5. Local child-scoped progress unlocks First masterpiece, Color explorer, and Gallery star badges without placing goal cards in the studio.
6. The first studio visit shows a four-step, dismissible tutorial for tools, colors and brush size, zoom and movement, and saving. Completing or skipping it stores a device-local versioned flag so it does not interrupt later sessions.

Coloring remains optional creative reinforcement. Its badges and saves do not count as proof of curriculum knowledge.

## Main files

- `components/child/AfricanThemeGameInterface.tsx`: active Coloring selection interface, exact-language menu cards, audio/parent controls, and local art progress summary.
- `components/coloring/ColoringGameScreen.tsx`: shared drawing studio and native save/share flow.
- `components/coloring/ColoringGallery.tsx`: retained standalone gallery prototype; it is not rendered by the Coloring tab.
- `lib/coloringDrawing.ts`: pure drawing history, undo/redo, clear, and eraser logic.
- `lib/coloringProgress.ts`: local saved-art and badge progress.
- `content/assets.ts`: static image-key registry used by dynamic menu cards.
- `app/child/games/coloring/*.tsx`: one small route wrapper per bundled page.

## Drawing and save behavior

- Marks are rendered as React Native SVG paths over the bundled line art using multiply blending so dark outlines stay visible.
- Erasing removes touched portions of earlier paths; it does not paint an opaque white line over the template.
- Every drawing-changing operation stores a history snapshot, so undo/redo remains consistent after drawing, erasing, stamping, or clearing.
- `react-native-view-shot` captures only the white artwork canvas. Toolbars, goals, loaders, and success messages are never included in the saved file.
- `expo-media-library.saveToLibraryAsync` writes the PNG to the normal Photos/gallery destination.
- Saving the file and syncing remote progress are separate. A progress-sync failure cannot turn a successful device save into a false save error.

## Permissions

Coloring requests no permission when the page opens and no permission for Share.

Save requests write/add-only photo permission at the moment the child taps Save. The app does not request permission to read existing photos. `app.json` provides the iOS `NSPhotoLibraryAddUsageDescription`, configures no Android granular read permissions, and explicitly removes Android photo/video read permissions. Older supported Android versions retain the write permission required by Expo Media Library.

If permission is denied, the artwork stays on the canvas. If the OS no longer allows another prompt, the message offers a route to device Settings.

## Adding a new bundled coloring page

### 1. Prepare the image

Use a valid, non-empty PNG or JPG. A strong child coloring page has:

- bold dark outlines on a clean white background;
- large closed shapes with little interior detail;
- no labels or text baked into the image;
- the full subject inside a generous margin;
- approximately 1024 px on the long edge;
- portrait `2:3` or landscape `4:3` proportions.

Place it under `assets/images/coloring/`, for example:

```text
assets/images/coloring/friendly-drum.png
```

Never leave a zero-byte placeholder behind a static `require()`: Metro rejects empty bundled media during production export.

### 2. Register the thumbnail image key

Add a stable key to `IMAGE_ASSETS` in `content/assets.ts`:

```ts
"coloring/friendly-drum.png": require("@/assets/images/coloring/friendly-drum.png"),
```

The dynamic menu uses this key to resolve its card thumbnail.

### 3. Add the route wrapper

Create `app/child/games/coloring/friendly-drum.tsx`:

```tsx
"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring/friendly-drum.png")

export default function FriendlyDrumColoringScreen() {
  return (
    <ColoringGameScreen
      imageSource={COLORING_IMAGE}
      pageName="Friendly Drum"
    />
  )
}
```

`pageName` is also used as the stable coloring completion ID, so do not casually rename it after release.

An optional `colors={[...]}` prop can supply a page-specific palette. White is automatically omitted because it would be invisible on the white canvas.

### 4. Publish the menu card

Add the card to the correct language's `child_menu/coloring` payload in the content source/database:

```json
{
  "id": "friendly-drum",
  "order": 6,
  "title": "Friendly Drum",
  "description": "Make a bright rhythm pattern.",
  "image": "coloring/friendly-drum.png",
  "targetPage": "child/games/coloring/friendly-drum"
}
```

The app intentionally does not show another language's coloring menu as a fallback.

### 5. Add route coverage and verify

Add the route to `app/child/games/coloring/__tests__/bundledColoringRoutes.test.tsx`, then run:

```bash
npm run typecheck
npm test -- --runInBand app/child/games/coloring/__tests__/bundledColoringRoutes.test.tsx
npx expo export --platform all
```

On physical Android and iOS devices, also draw near every edge, erase, undo/redo, save once with permission granted, deny permission once, open Settings from a blocked state, and use Share.

## QA checklist

- [ ] Every published card opens the intended canvas.
- [ ] Crayon, Eraser, Flower stamp, all colors, and all sizes respond to touch.
- [ ] Eraser removes paint without covering the template outline.
- [ ] Undo/redo works after draw, erase, stamp, and Start over.
- [ ] Save captures artwork only and shows the correct success or failure message.
- [ ] Share works without requesting photo permission.
- [ ] Denied and permanently blocked save permission leave the drawing intact.
- [ ] Compact landscape phones and larger tablets show the entire tool and color docks.
- [ ] On compact phones, every icon-only tool still has a spoken accessibility label and a minimum 44-point effective touch target.
- [ ] Zoom in, pan with the hand control, return to drawing, and confirm Save still exports the complete picture rather than the zoomed viewport.
- [ ] At 2× and 3× zoom, new strokes, stamps, and eraser passes cover progressively smaller areas of the underlying picture while retaining a usable on-screen size.
- [ ] A fresh install shows the four tutorial tips once; Skip and completion both prevent it from reopening.
- [ ] New badges appear once and persist for the active child.
