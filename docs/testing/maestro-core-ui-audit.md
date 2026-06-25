# Maestro Core UI Audit

Date: 2026-06-25

## App Entry And Navigation

- Main app entry: `app/index.tsx`, an onboarding carousel. Completing or skipping onboarding stores `@onboarding_completed` and routes to `/login`.
- Root layout: `app/_layout.tsx` loads fonts/session state, then redirects `/` to onboarding, `/login`, or `/parent` depending on AsyncStorage and Supabase session.
- Parent entry: `/login` signs in and routes to `/parent`.
- Parent dashboard: `app/parent/index.tsx`.
- Child mode entry: parent dashboard or `/child-list` opens `app/parent/child-detail/[id].tsx`; `Launch Child Mode` calls `setActiveChild(childData)` and routes to `/child`.
- Child mode guard: `app/child/_layout.tsx` redirects to `/parent` when no `activeChild` exists.
- Child menu tabs: `app/child/(tabs)/_layout.tsx` has Games, Coloring, Stories, and Museum tabs.
- Child menu implementation: `components/child/AfricanThemeGameInterface.tsx`, populated by `loadContentBundle(activeChild?.selected_language_code)`.

## Language Selection Flow

- Learning language selection is part of add-child onboarding at `app/parent/add-child/language.tsx`.
- Supported active learning languages are Luganda (`lg`) and Runyankole (`nyn`).
- Selecting a language advances to `app/parent/add-child/reason.tsx`.
- Parent settings also has a legacy app-language toggle, but it is not the child learning-language selector.

## Child Games And Activities Found

Reachable Luganda child menu cards from the bundled fallback/content registry:

- Words: `child/games/wordgame`
- Logic puzzle: `child/games/puzzlegame`
- Cards Matching: `child/games/cardgame`
- Learning: `child/games/learninggame`
- Numbers: `child/games/lugandacountinggame`
- Coloring templates:
  - Buganda Emblem: `child/games/coloring/emblem`
  - Kings: `child/games/coloring/king`
  - Animals: `child/games/coloring/animals`
  - Shapes: `child/games/coloring/shapes`
  - Masks: `child/games/coloring/mask`
- Stories:
  - Kintu: `child/stories/kintustory`
  - Kabaka Mwanga: `child/stories/mwangastory`
  - Kasubi Tombs: `child/stories/kasubitombsstory`
  - Walumbe and Death: `child/stories/walumbestory`
  - Ssezibwa Falls: `child/stories/ssezibwafallsstory`
  - Nambi and the First Millet: `child/stories/milletstory`
  - Kasokambirye and the Moon: `child/stories/kasokambiryestory`
  - The Generous Fig Tree: `child/stories/figtreestory`
- Museum categories:
  - Artifacts: `child/games/museum/ArtifactsScreen`
  - Art: `child/games/museum/ArtScreen`
  - Instruments: `child/games/museum/InstrumentsScreen`
  - Textiles: `child/games/museum/TextilesScreen`

Additional route found but not currently tested:

- `child/games/ball-trail` exists as a route, but no current child menu card links to it. Treat as hidden/unreachable until it is added to MVP navigation.

Runyankole child content currently includes sample Words, Learning, Numbers, and dynamic stories. It does not include the full Luganda legacy coloring/museum/story card set.

## Reliable Selectors Added Or Found

- App/onboarding: `app-root`, `onboarding-skip-button`, `onboarding-next-button`, `onboarding-complete-button`
- Login/parent entry: `login-screen`, `login-email-input`, `login-password-input`, `parent-mode-button`
- Parent dashboard: `parent-dashboard-screen`, `parent-settings-button`, `parent-view-child-list-button`, `parent-child-card`, `parent-add-child-button`, `parent-activities-button`, `parent-achievements-button`
- Child profile path: `child-list-screen`, `child-profile-card`, `child-detail-screen`, `child-mode-button`
- Language selection: `language-selection-screen`, `language-card-luganda`, `language-card-runyankole`, `language-next-button`, `add-child-reason-screen`
- Child menu/tabs: `child-menu-screen`, `child-menu-coloring`, `child-menu-stories`, `child-menu-museum`
- Child game cards: `child-menu-word-game`, `child-menu-puzzle-game`, `child-menu-card-matching`, `child-menu-learning`, `child-menu-counting-game`
- Coloring cards: `child-menu-coloring-emblem`, `child-menu-coloring-king`, `child-menu-coloring-animals`, `child-menu-coloring-shapes`, `child-menu-coloring-masks`
- Story cards: `child-menu-story-kintu`, `child-menu-story-mwanga`, `child-menu-story-kasubi`, `child-menu-story-walumbe`, `child-menu-story-ssezibwa`, `child-menu-story-millet`, `child-menu-story-kasokambirye`, `child-menu-story-fig-tree`
- Museum cards: `child-menu-museum-artifacts`, `child-menu-museum-art`, `child-menu-museum-instruments`, `child-menu-museum-textiles`
- Learning: `learning-game-screen`, `learning-stage-select-screen`, `learning-stage-1`, `learning-level-select-screen`, `learning-level-1`, `learning-content-screen`, `learning-play-game-button`, `learning-audio-button`, `learning-quiz-screen`, `learning-answer-option-0`
- Word game: `word-game-screen`, `word-game-start-level-button`, `word-game-letter-option`, `word-game-hint-button`, `word-game-next-button`
- Counting: `counting-game-screen`, `counting-stage-select-screen`, `counting-stage-1`, `counting-stage-screen`, `counting-items-container`, `counting-answer-option`
- Coloring screen: `coloring-screen`, `coloring-canvas`, `coloring-drawing-area`, `coloring-tool-brush`, `coloring-tool-eraser`, `coloring-tool-fill`, `coloring-color-option`, `coloring-clear-button`, `coloring-save-button`
- Stories: `story-page`; generic DB-backed story renderer also has `story-next-button`, `story-previous-button`, `story-finish-button`
- Puzzle/card matching: `puzzle-game-screen`, `puzzle-board`, `puzzle-reset-button`, `card-matching-game-screen`, `card-matching-board`, `card-matching-card`
- Museum screens: `museum-artifacts-screen`, `museum-art-screen`, `museum-instruments-screen`, `museum-textiles-screen`, `museum-detail-close-button`, `museum-audio-button`

## Missing Or Still-Weaker Selectors

- Legacy story components still rely mostly on accessibility labels such as `Next page`, `Previous page`, `Read to Me`, and `Take the quiz`; they now share `story-page`, but their individual controls should eventually get explicit `story-next-button`, `story-previous-button`, and `story-read-button` IDs.
- Add-child gender/age/reason option cards are not fully labeled because the Maestro language flow deep-links directly to language selection.
- Some repeated list items intentionally share a selector, for example `parent-child-card`, `card-matching-card`, and `coloring-color-option`, so Maestro taps the first visible item.
- Supabase-authenticated flows require a signed-in test parent and at least one child profile. The app does not persist `activeChild` across launches.

## Recommended Maestro Coverage

- Smoke: launch, handle onboarding/login when needed, enter child mode, verify Games menu and major tabs/cards.
- Language selection: open add-child language screen, select Runyankole then Luganda, continue to reason screen.
- Child core navigation: enter child mode and open each major reachable section: Words, Logic puzzle, Cards Matching, Learning, Numbers, Coloring, Stories, Museum.
- Dedicated game flows: Learning, Word, Counting, Coloring, Stories.
- Additional activity flows: Puzzle, Card Matching, Museum Artifacts/Art/Instruments/Textiles, and non-default coloring templates.
- Parent flow: dashboard, settings, progress, activities, achievements.

## Risky Dynamic Screens

- Child menu content is DB-backed and falls back to bundled local content. Empty or malformed `content_items` rows can hide cards.
- Learning, Word, and Counting all load language-specific content and child-specific progress before rendering playable state.
- Parent dashboard, child list, achievements, activities, and progress depend on Supabase session and child/activity data.
- Save/share in Coloring can trigger OS permission prompts; tests should avoid save/share unless a permission strategy is added.

## iOS Layout Attention

- Child mode locks landscape through `expo-screen-orientation`; game screens need simulator coverage in landscape.
- Counting game uses a three-column landscape layout with the prompt/items area offset upward (`-top-20`), making it a high-risk iOS clipping/misalignment screen.
- Learning game has separate portrait/landscape layouts and should be checked around the quiz answer column.
- Word game uses fixed-width side panels and large round letter buttons in landscape.
- Coloring uses a compact fixed header/footer and an absolute bottom palette; iOS safe-area and permission overlays can affect usable canvas height.
