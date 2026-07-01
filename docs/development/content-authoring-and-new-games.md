# Content Authoring And New Games

This guide explains how to add DB-backed Baby Steps content today, and what to decide before building a new game or activity. It reflects the current Expo React Native implementation, not a future CMS design.

Related docs:

- [MVP Content Items](./mvp-content-items.md)
- [Content Management](./content-management.md)
- [Database-Backed Content](../features/database-content.md)
- [Progress, Content, and Read Cache Audit](./progress-content-cache-audit.md)

## Current Implementation Audit

The current content path is:

1. `content/contentRepository.ts` loads active Supabase `content_items` rows for one `language_code`.
2. The repository validates and maps rows into a `ContentBundle`.
3. Screens read the bundle through `loadContentBundle(activeChild?.selected_language_code)`.
4. Menu images and content images are resolved through `content/assets.ts` and preloaded by `content/imagePreloader.ts`.
5. Progress is local-first through AsyncStorage and `lib/progressRepository.ts`, then synced to Supabase progress tables.
6. Completed activities are appended through `saveActivity` in `lib/utils.ts`.
7. Achievements are checked through `components/games/achievements/achievementManager.ts`.

Current DB-backed or repository-backed areas:

| Area | Current source | Notes |
| --- | --- | --- |
| Child menu cards | `content_items` `child_menu` rows, merged with Luganda legacy local menu where needed | Tabs use slugs such as `games`, `stories`, `coloring`, and `museum`. |
| Stories | `content_items` `story` rows via `app/child/stories/[storyId].tsx` and `GenericStoryRenderer` | Luganda stories and Runyankole sample stories use this route. Deprecated Luganda route files redirect to the generic route. |
| Learning game | `content_items` `learning_game` rows via `LearningGameComponent` | Luganda can fall back to the fuller local legacy payload while DB rows are partial. |
| Counting game | `content_items` `counting_game` rows via `CountingGameComponent` | The route is still named `lugandacountinggame`, but the screen loads the active child language. |
| Word game | `content_items` `word_game` rows via `WordGameComponent` | Luganda can fall back to the fuller local legacy payload while DB rows are partial. |
| Coloring | Local routes/templates | Saves completion/progress when artwork is saved. Not currently `content_items` backed. |
| Puzzle | Local component data and local puzzle progress | Not currently `content_items` backed. |
| Card matching | Local component data | Activity logging is completion-level, not every matched pair. Not currently `content_items` backed. |
| Museum | Local route files under `app/child/games/museum` | Not currently `content_items` backed. |

Do not edit historical migrations to add content. Add a new migration that upserts the new rows.

## Current Content Model

`content_items` is MVP storage for language-specific app data. It is not a CMS and does not own game rules, screen layout, scoring, routes, progress, achievements, review workflow, or publishing.

Expected columns:

- `language_code`: learning language code such as `lg` or `nyn`.
- `content_type`: lowercase app content key. Current supported values are `child_menu`, `learning_game`, `word_game`, `counting_game`, and `story`.
- `slug`: lowercase key within the content type, such as `games`, `stories`, `starter`, `levels`, or a story id.
- `title`: optional display/grouping title.
- `payload`: JSON object. Required arrays depend on `content_type`.
- `sort_order`: ordering hint for query and menus.
- `is_active`: inactive rows are ignored by the repository query.

The database enforces a unique row per `(language_code, content_type, slug)`.

Required payload arrays:

| `content_type` | Required array(s) | Used by |
| --- | --- | --- |
| `child_menu` | `cards` | `AfricanThemeGameInterface` |
| `learning_game` | `stages` | `LearningGameComponent` |
| `word_game` | `levels` | `WordGameComponent` |
| `counting_game` | `stages`, `numbers` | `CountingGameComponent` |
| `story` | `pages` | `GenericStoryRenderer` |

Rows with unsupported or non-lowercase `content_type`, missing required arrays, mismatched language, or unrenderable story pages are skipped.

## Loading, Caching, And Fallback

`loadContentBundle(languageCode)` reads `content_items` for one language and builds one `ContentBundle`.

Content cache behavior:

- Cache key: `@BabySteps:ContentBundle:v1:{languageCode}`.
- Cache storage: memory plus AsyncStorage.
- Default TTL: 6 hours.
- Fresh cache returns immediately.
- Stale cache can return immediately while a background refresh runs.
- `forceRefresh` bypasses fresh-cache reads.
- If Supabase fails, a same-language cached DB bundle can still be used.

Language rules:

- Runyankole (`nyn`) never silently falls back to Luganda.
- Unsupported language codes return an empty result.
- Luganda (`lg`) has an explicit `local-lg-legacy` fallback for compatibility.
- Runyankole can use same-language bundled sample content if DB content is unavailable.
- Luganda DB bundles are merged with the legacy local bundle. Menus can come from DB, but learning, word, and counting content keep the fuller legacy payload until DB rows are at least as complete as the local bundle. Stories use DB rows when DB stories are present.

Fallback is acceptable for compatibility and offline MVP resilience. Avoid fallback when it would show another language's content, hide missing curriculum, or make a child appear to progress through content they did not select.

## Child Menu And Activity Menu

Menu cards live in `content_items` rows with `content_type = 'child_menu'`. The `slug` maps to the child tab content area:

- `games`
- `stories`
- `coloring`
- `museum`

Payload shape:

```json
{
  "cards": [
    {
      "id": "kintu",
      "title": "Kintu",
      "description": "Learn about Kintu",
      "image": "kintu.jpg",
      "targetPage": "child/stories/kintu"
    }
  ]
}
```

Rules:

- Use stable `id` values. For story cards, make the card id match the story id when possible.
- `targetPage` is stored without a leading slash. The menu pushes `/${targetPage}`.
- Generic story cards should use `child/stories/{storyId}`.
- Current game routes are `child/games/learninggame`, `child/games/wordgame`, and `child/games/lugandacountinggame`.
- `image` should be a key registered in `content/assets.ts`, or a supported URI.
- Keep card text age-appropriate and language-appropriate for the selected `language_code`.

## Stories

Stories are the cleanest current DB-backed content type. Add a `story` row, then make sure the language's `child_menu/stories` row includes a card pointing to the generic route.

Story row rules:

- `content_type = 'story'`.
- `slug` should be the story id.
- `payload.id` should match the slug.
- `payload.languageCode`, if present, must match the row `language_code`.
- `pages` must contain at least one page with non-empty `text`.
- `questions` are optional, but if present every question needs at least two options and a valid zero-based `correctAnswer`.

Expected story payload shape:

```json
{
  "id": "new-story",
  "title": "New Story",
  "summary": "Short card and loading summary",
  "languageCode": "lg",
  "metadata": {
    "status": "reviewed",
    "notes": "Reviewed by curriculum team"
  },
  "pages": [
    {
      "id": "new-story-page-1",
      "text": "First page text.",
      "image": "story/new-story/page-1.jpg",
      "altText": "Child-friendly description of the page image"
    }
  ],
  "questions": [
    {
      "id": "new-story-question-1",
      "question": "What happened first?",
      "options": ["Answer A", "Answer B", "Answer C"],
      "correctAnswer": 0
    }
  ]
}
```

How the renderer works:

- `app/child/stories/[storyId].tsx` loads the active child language bundle.
- `findStoryById` matches the route `storyId` to `bundle.stories`.
- `GenericStoryRenderer` renders pages, images, optional translations, and optional quiz questions.
- If the story is missing or malformed, the screen shows a coming-soon state.

Story progress and activity behavior:

- Progress scope is `childId + languageCode + activityType("stories") + storyId`.
- Reopening a completed story should not duplicate completion activity or downgrade progress.
- `markStageStarted` tracks in-progress reading and can restore `currentPageIndex`.
- Completion waits until the final page, and if a quiz exists, all questions must be answered.
- Completion writes one `activities` row with `activity_type: "stories"` and `language_code`.
- Completion updates both activity progress and story stage progress, then calls `syncProgressNow(childId)`.

## Learning Game

`LearningGameComponent` loads `bundle.learningGame.stages`. The repository maps DB payloads to `LearningGameStage`.

Payload shape:

```json
{
  "stages": [
    {
      "id": 1,
      "title": "Beginner",
      "description": "Learn starter words",
      "isLocked": false,
      "requiredScore": 0,
      "color": "#4F85E6",
      "image": "learning-beginner.jpg",
      "levels": [
        {
          "id": 1,
          "title": "Greetings",
          "isLocked": false,
          "words": [
            {
              "id": "lg-webale",
              "targetText": "Webale",
              "english": "Thank you",
              "example": "Webale nnyo.",
              "exampleTranslation": "Thank you very much.",
              "audio": "webale.m4a",
              "image": "learning-beginner.jpg"
            }
          ]
        }
      ]
    }
  ]
}
```

Current behavior:

- A stage without valid levels is skipped.
- A level without valid words is skipped.
- A word needs `targetText` and `english`.
- Stage and word images go through `resolveImageSource`.
- Audio names are carried in the payload, but playback support depends on the existing audio manager/assets.
- Progress uses activity type `learning`; append-only activity history currently uses `activity_type: "language"` for completed learning levels/stages.
- Existing compatibility progress keys are language-scoped, with explicit old Luganda key reads for `lg`.
- Stage and level unlock logic still lives in React Native code.

When adding learning content:

- Keep numeric stage and level ids stable.
- Do not reuse ids for different content after children may have progress.
- Add image keys to `content/assets.ts`.
- Add audio assets and mappings only if the current audio path can resolve them.
- Test progress restore when the number of stages or levels differs by language.

## Counting Game

`CountingGameComponent` loads `bundle.countingGame`. The repository maps DB payloads to stages, numbers, cultural items, and currency.

Payload shape:

```json
{
  "title": "Luganda Counting Game",
  "stages": [
    {
      "id": 1,
      "title": "Basic Counting",
      "description": "Count items from 1 to 10",
      "numbersRange": { "min": 1, "max": 10 },
      "levels": 5,
      "useBunches": false,
      "usesCurrency": false,
      "prompt": "How many {item} do you see?"
    }
  ],
  "numbers": [
    { "number": 1, "targetText": "Emu", "audio": "correct.mp3" }
  ],
  "culturalItems": [
    { "name": "matoke", "image": "matooke.png" }
  ],
  "currency": [
    {
      "value": 500,
      "name": "500 shillings",
      "image": "500.png",
      "targetText": "Bikumi bitaano"
    }
  ]
}
```

Current behavior:

- `stages` and `numbers` are required arrays.
- `numbersRange.min` and `numbersRange.max` define generated target numbers.
- `levels` controls how many prompts are played in a stage.
- `useBunches`, `itemsPerBunch`, and `usesCurrency` change the interaction mode.
- `culturalItems` falls back to built-in default items if none are valid.
- Progress uses activity type `counting`.
- Completion is tracked at stage level and synced after meaningful completion.

When adding counting content:

- Keep stage ids stable and numeric.
- Include enough `numbers` to cover every range and currency value a stage can generate.
- Register every item and currency image key.
- Test languages with fewer stages than Luganda; progress normalization filters unavailable stage ids.

## Word Game

`WordGameComponent` loads `bundle.wordGame.levels`. The repository maps DB payloads to `WordGameLevel`.

Payload shape:

```json
{
  "levels": [
    {
      "id": "lg-word-amazzi",
      "targetText": "AMAZZI",
      "question": "Essential liquid that falls from the sky",
      "hint": "You drink this every day",
      "subHint": "In English, it is called water.",
      "firstLetter": "A",
      "image": "rain.jpg"
    }
  ]
}
```

Current behavior:

- `targetText` is preferred; `word` is accepted as a fallback.
- The target word is normalized to uppercase.
- `question`, `hint`, `subHint`, `firstLetter`, and `image` drive the existing UI.
- Progress uses activity type `words`.
- Progress is child and language scoped, with explicit old Luganda key reads for `lg`.
- Completed level indexes are filtered against the current level count.

When adding word content:

- Keep level order stable because progress tracks level indexes.
- Add a clear prompt and hint for each level.
- Use words appropriate to the selected language and age range.
- Test all-level completion because achievements can depend on the total number of levels.

## Coloring, Puzzle, Card Matching, And Museum

These areas are not fully DB-backed today.

Coloring:

- Current source: route files under `app/child/games/coloring`.
- Menu cards may come from Luganda legacy local menu or `child_menu` rows, but templates are local route assets.
- Saving artwork updates progress with activity type `coloring`, marks the page as completed, and syncs.
- Future direction: store template metadata, image keys, difficulty, cultural notes, and route target or generic template id in `content_items`.

Puzzle:

- Current source: `components/games/PuzzleGameComponent.tsx`.
- Progress is local AsyncStorage through `progressManagerPuzzleGame`, scoped by child but not currently language.
- Completion writes `activity_type: "puzzle"`.
- Future direction: store puzzle definitions, image keys, tile/grid settings, cultural text, and reviewed language metadata in `content_items`.

Card matching:

- Current source: `components/games/CardsMatchingComponent.tsx`.
- Activity rows are completion-level, not one row per matched pair.
- Achievement events can use match-level facts internally, but append-only activity history should stay meaningful.
- Future direction: store card pairs, localized labels, explanations, image keys, and difficulty settings in `content_items`.

Museum:

- Current source: route files under `app/child/games/museum`.
- Menu cards can be DB-backed, but artifact/content pages are local/static.
- Future direction: store artifact categories, item copy, media keys, alt text, source notes, and language metadata in `content_items`.

If one of these areas moves into `content_items`, first add a repository mapper and validation for the payload. Do not add a new `content_type` only in SQL; `ContentItemType`, validation, bundle shape, screen loading, and tests must also change.

## SQL Examples

Use short, idempotent migrations. These examples are intentionally small.

Story row:

```sql
INSERT INTO public.content_items (
  language_code,
  content_type,
  slug,
  title,
  payload,
  sort_order,
  is_active
)
VALUES (
  'lg',
  'story',
  'new-story',
  'New Story',
  $json$
  {
    "id": "new-story",
    "title": "New Story",
    "summary": "A short reviewed story.",
    "languageCode": "lg",
    "metadata": { "status": "reviewed" },
    "pages": [
      {
        "id": "new-story-page-1",
        "text": "First page text.",
        "image": "story/new-story/page-1.jpg",
        "altText": "A child listening to a story"
      }
    ],
    "questions": [
      {
        "id": "new-story-question-1",
        "question": "What happens first?",
        "options": ["The story begins", "The story ends"],
        "correctAnswer": 0
      }
    ]
  }
  $json$::jsonb,
  100,
  true
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET
  title = EXCLUDED.title,
  payload = EXCLUDED.payload,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());
```

Stories menu row, preserving existing cards:

```sql
WITH new_card AS (
  SELECT jsonb_build_object(
    'id', 'new-story',
    'title', 'New Story',
    'description', 'A short reviewed story.',
    'image', 'story/new-story/card.jpg',
    'targetPage', 'child/stories/new-story'
  ) AS card
),
existing_menu AS (
  SELECT payload
  FROM public.content_items
  WHERE language_code = 'lg'
    AND content_type = 'child_menu'
    AND slug = 'stories'
),
merged_menu AS (
  SELECT jsonb_build_object(
    'cards',
    COALESCE(
      (
        SELECT jsonb_agg(card)
        FROM (
          SELECT existing_card.card
          FROM jsonb_array_elements(
            COALESCE((SELECT payload->'cards' FROM existing_menu), '[]'::jsonb)
          ) AS existing_card(card)
          WHERE existing_card.card->>'id' <> 'new-story'
          UNION ALL
          SELECT card FROM new_card
        ) AS cards
      ),
      '[]'::jsonb
    )
  ) AS payload
)
INSERT INTO public.content_items (
  language_code,
  content_type,
  slug,
  title,
  payload,
  sort_order,
  is_active
)
SELECT
  'lg',
  'child_menu',
  'stories',
  'Stories',
  payload,
  20,
  true
FROM merged_menu
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET
  title = EXCLUDED.title,
  payload = EXCLUDED.payload,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());
```

Learning row:

```sql
INSERT INTO public.content_items (
  language_code, content_type, slug, title, payload, sort_order, is_active
)
VALUES (
  'nyn',
  'learning_game',
  'starter',
  'Runyankole Starter Learning',
  $json$
  {
    "stages": [
      {
        "id": 1,
        "title": "Greetings",
        "description": "Starter greetings",
        "isLocked": false,
        "requiredScore": 0,
        "image": "learning-beginner.jpg",
        "levels": [
          {
            "id": 1,
            "title": "Hello",
            "words": [
              { "id": "nyn-agandi", "targetText": "Agandi", "english": "Hello" }
            ]
          }
        ]
      }
    ]
  }
  $json$::jsonb,
  30,
  true
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET payload = EXCLUDED.payload, title = EXCLUDED.title, updated_at = timezone('utc'::text, now());
```

Counting row:

```sql
INSERT INTO public.content_items (
  language_code, content_type, slug, title, payload, sort_order, is_active
)
VALUES (
  'nyn',
  'counting_game',
  'stages',
  'Runyankole Counting',
  $json$
  {
    "stages": [
      {
        "id": 1,
        "title": "One To Five",
        "description": "Count familiar items",
        "numbersRange": { "min": 1, "max": 5 },
        "levels": 5,
        "useBunches": false,
        "usesCurrency": false
      }
    ],
    "numbers": [
      { "number": 1, "targetText": "Emwe" },
      { "number": 2, "targetText": "Ibiri" }
    ],
    "culturalItems": [
      { "name": "basket", "image": "basket.png" }
    ],
    "currency": []
  }
  $json$::jsonb,
  50,
  true
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET payload = EXCLUDED.payload, title = EXCLUDED.title, updated_at = timezone('utc'::text, now());
```

Word row:

```sql
INSERT INTO public.content_items (
  language_code, content_type, slug, title, payload, sort_order, is_active
)
VALUES (
  'nyn',
  'word_game',
  'levels',
  'Runyankole Word Game',
  $json$
  {
    "levels": [
      {
        "id": "nyn-word-agandi",
        "targetText": "AGANDI",
        "question": "A greeting",
        "hint": "Used when meeting someone",
        "subHint": "In English, it means hello.",
        "image": "learning-beginner.jpg"
      }
    ]
  }
  $json$::jsonb,
  40,
  true
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET payload = EXCLUDED.payload, title = EXCLUDED.title, updated_at = timezone('utc'::text, now());
```

## Asset, Image, And Audio Conventions

Image resolution:

- Register bundled images in `content/assets.ts` in `IMAGE_ASSETS`.
- Use the registry key in DB payloads, for example `kintu.jpg` or `story/kintu/kintu-cow.jpeg`.
- `resolveImageSource` accepts registered keys and URI strings such as `https://`, `file://`, or `data:image/`.
- Missing keys fall back to `learning-beginner.jpg`, then `coin.png`.
- `preloadContentBundleImages` preloads menu, story, learning, word, counting item, and currency images.

When adding images:

1. Add the file under `assets/images` or an appropriate `assets/story/...` folder.
2. Add a stable key in `content/assets.ts`.
3. Use that exact key in `content_items.payload`.
4. Add useful `altText` for story page images.
5. Run tests that cover asset resolution or at least open the screen manually.

Naming guidance:

- Prefer lowercase kebab-case file names for new assets.
- Group story assets under `assets/story/{story-id}/`.
- Keep DB image keys stable. Changing a key without registering the new asset silently falls back to a generic image.

Audio:

- Learning and counting payloads can carry `audio` strings, but playback depends on the existing audio assets and audio manager.
- Do not add audio names to payloads unless the app can resolve and play them.
- Keep audio optional for MVP content unless the screen requires it.

Offline behavior:

- Bundled images can be downloaded through Expo Asset.
- Remote images can be prefetched, but should not be required for a child to complete core learning.
- Same-language content caches can keep screens usable during a Supabase outage.

## Progress Requirements

New content and new games should preserve the local-first progress pattern.

Use these scopes:

- `childId`: progress belongs to one child.
- `languageCode`: progress belongs to the selected learning language.
- `activityType`: one stable key per activity, such as `learning`, `counting`, `words`, `stories`, `coloring`, `puzzle`, or a new key.
- `stageId`: stage, story id, page/template id, puzzle id, or equivalent unit.
- `levelId`: optional finer unit when a stage has levels.

Current progress behavior:

- Gameplay loads AsyncStorage/default state first.
- Supabase hydration runs without blocking play.
- Dirty local progress is not overwritten by remote hydration.
- Dirty records are queued and debounced for sync.
- `syncProgressNow(childId)` is used after meaningful completion.
- Activity-level progress upserts on `(child_id, language_code, activity_type)`.
- Stage-level progress upserts on `(child_id, language_code, activity_type, stage_id, level_id)`.

For new games:

- Use `lib/progressRepository.ts` unless there is a strong reason not to.
- If you keep a feature-specific AsyncStorage progress manager, include `childId` and `languageCode` in keys from the start.
- Normalize restored progress against currently available content ids.
- Do not block the first playable screen on remote hydration.
- Sync completions promptly; debounce minor in-progress changes.
- Do not treat last-opened, last-played, or every small score change as a remote-write event.

## Activity Logging Requirements

`activities` is append-only recent history. It is not the current-progress source.

Use `saveActivity` for meaningful child-visible events:

- completed stage,
- completed level,
- completed story,
- completed quiz,
- saved artwork,
- completed session, if the session has clear educational meaning.

Avoid logging:

- every tap,
- every screen open,
- every page view,
- every matched card pair,
- unfinished puzzle attempts,
- minor score updates,
- last-played updates.

Include `language_code` when the event is tied to learning content. Use `stage` and `level` when they are meaningful, but keep details short and child-safe.

## Achievement Considerations

Achievements should reward meaningful milestones, not noisy interactions.

Current behavior:

- Achievement definitions are read from `achievements` and cached under `cache:achievements:definitions` for 24 hours.
- Earned child achievements are cached per child under `cache:child_achievements:{childId}` for 15 minutes.
- Definitions can be filtered by `game_key`.
- `awardAchievementToChild` checks the child-scoped cache, checks the exact remote row, and then inserts.
- The `20260701000000_add_child_achievements_unique_constraint.sql` migration enforces one row per `(child_id, achievement_id)`.

For new games:

- Pick one stable `gameKey`.
- Define achievement event types around completions or milestones.
- Pass enough event context for `checkAndGrantNewAchievements`.
- Do not award the same achievement repeatedly.
- Add tests for duplicate-award prevention when introducing a new achievement path.

## Checklist For Adding A New Game Or Activity

Use this checklist before implementation:

- Define the `activityType`.
- Define the content source: DB-backed, local-only, or hybrid.
- Prefer scalable `content_items` payloads for MVP-ready language content.
- Define the payload schema clearly.
- Add validation and normalization in `content/contentRepository.ts`.
- Add language scoping from the start.
- Add child progress scoping from the start.
- Avoid hardcoded routes for every content item when a generic renderer can work.
- Avoid noisy activity logging.
- Decide what counts as completion.
- Decide what progress should restore.
- Decide what achievements can be earned.
- Add assets to `content/assets.ts`.
- Consider offline/cache behavior.
- Add tests for content loading, rendering, progress, and activity logging.
- Review child safety, age-appropriateness, language quality, and cultural accuracy.
- Consider future admin/content-management compatibility, but do not build CMS tables until needed.

Implementation questions to answer:

- Does this activity need a new `content_type`, or can it use a current generic renderer?
- What stable ids will survive content edits?
- What happens if a language has fewer stages, levels, or cards?
- What is the coming-soon state when content is missing?
- What content requires review by a fluent speaker or cultural reviewer?
- What exact event will trigger `syncProgressNow(childId)`?

## Testing Guidance

Recommended tests when adding or changing DB-backed content:

- Repository loading maps valid payloads into the expected bundle shape.
- Malformed payloads are skipped and do not borrow another language.
- Language scoping prevents `nyn` from receiving `lg` rows.
- Menu `targetPage` values point to valid generic routes.
- Generic story rendering handles pages, images, missing stories, quiz completion, and already-completed progress.
- Progress restores from local state before remote hydration.
- Dirty local progress is not overwritten by remote rows.
- Completion writes activity progress and stage progress with the expected scope.
- Activity logging happens once for completion and does not fire for minor interactions.
- Asset keys resolve to registered images or intentional remote URIs.
- Migration tests validate important row ids, slugs, and generic route targets.
- Achievement tests cover milestone awards and duplicate prevention.

For docs-only content changes, still run the normal project checks when practical:

```text
npm run typecheck
npm test
npm run lint
```
