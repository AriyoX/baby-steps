# Content Authoring And New Games

This is the technical authoring guide for the migration-managed MVP. It does not replace curriculum, language, cultural, accessibility, or child-safety review. Use [Learning Hub curriculum analysis](../learning-hub-curriculum-analysis.md#19-content-production-and-approval-workflow) for content-provider responsibilities and [Progress and Achievements](../features/progress-achievements.md) for reliability behavior.

## Content Row Contract

`public.content_items` stores exact-language JSON bundles. Required database fields are:

| Field | Rule |
| --- | --- |
| `language_code` | Exact code from `public.languages`, for example `lg` or `nyn` |
| `content_type` | Lowercase supported type |
| `slug` | Stable lowercase row key; unique with language and type |
| `payload` | JSON object matching the type-specific contract below |
| `sort_order` | Deterministic order between rows |
| `is_active` | `false` retires the row |
| `editorial_status` | `draft`, `reviewed`, or `published` |
| `is_startable` | Whether the app may fetch/launch the row |
| `content_version` | Positive monotonic revision; increment for each released change |
| `published_at` | Publication time; normally null until published |

`title` is optional. `id`, `created_at`, and `updated_at` are database-managed. The child roles have read-only access to active, published rows; the app query also requires startable rows.

There may be multiple `child_menu` and `story` rows per language. There must be at most one published/startable row per language for each of `learning_hub`, `learning_game`, `word_game`, `counting_game`, `card_game`, and `puzzle_game`. A duplicate single-bundle type invalidates the complete refresh, even when the slugs differ.

## Stable IDs, Ordering, And Languages

IDs are progress identities. Once shipped:

- never rename, recycle, or change the meaning of a row slug, stage ID, lesson ID, item ID, level ID, story/page/question ID, card ID/value, or puzzle ID;
- require explicit positive `order` values for ordered nested records, even where the normalizer can derive a fallback;
- keep Learning Hub lesson IDs unique across the whole language bundle, not only within a stage;
- keep item IDs unique within a lesson and nested option/question/page IDs unique within their parent;
- preserve the Word game's original order and stable level IDs; legacy positional
  progress is migrated through the immutable 50-level Luganda ID snapshot, while
  new saves also retain stable IDs so later retirement does not erase history;
- preserve numeric standalone Learning stage/level IDs, Counting stage IDs, exact Card `value` strings, and numeric Puzzle IDs.

To retire content, remove it from a later bundle or set its row inactive/draft/non-startable. Do not delete historic progress. Current percentages are calculated from the current published/startable IDs, while old completion records remain stored.

Every payload is authored independently for its row `language_code`. `learning_hub.payload.languageCode` and `story.payload.languageCode`, when present, must match the row exactly. Never copy `lg` into `nyn`, fall back across languages, or publish machine-invented translations. Missing exact-language content should remain draft/non-startable and produce Coming soon.

## Publishing A Change

The canonical initial deployed content migration is `supabase/migrations/20260714182326_database_backed_learning_content.sql`. It contains idempotent upserts for the historical Learning Hub, menus, standalone games, and known story publication state. `20260714213732_normalize_published_story_menu_order.sql` then upgrades the older Stories menu to the strict explicit-order contract. Both are applied to the linked Baby-Steps project. The chain intentionally leaves the existing Runyankole test samples draft and non-startable.

The Luganda Stage 1–2 development reset is generated separately into `supabase/seed.sql` from `scripts/build-luganda-stage-1-2-content.mjs`; `content/curriculum/lg-stage-1-2.json` is its generated review manifest. Do not edit either generated file by hand, and do not apply the reset seed to production. Production rollout requires approved media and review gates followed by a new content migration.

For every future change:

1. Start from the latest payload and preserve stable IDs and order.
2. Complete the required language/curriculum/cultural review.
3. Run `supabase migration new <descriptive_name>`; never invent a filename or edit an applied migration.
4. Upsert on `(language_code, content_type, slug)` and explicitly set title, payload, sort order, active/editorial/startable state, version, and publication time.
5. Increment `content_version` whenever published payload, ordering, or launch state changes.
6. Add any bundled media to the static resolver maps before referencing it.
7. Validate on a safe development database, then deploy through the normal migration workflow (`supabase db push` for the linked target). A brand-new local reset currently requires the missing pre-2026 baseline schema described in [Database Notes](./database.md#local-reset-caveat).

Use this shape in a new migration:

```sql
INSERT INTO public.content_items (
  language_code, content_type, slug, title, payload, sort_order,
  is_active, editorial_status, is_startable, content_version, published_at
)
VALUES (
  'lg', 'word_game', 'levels', 'Words',
  $content${ "levels": [/* reviewed records */] }$content$::jsonb,
  40, true, 'published', true, 2, timezone('utc', now())
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET title = EXCLUDED.title,
    payload = EXCLUDED.payload,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    editorial_status = EXCLUDED.editorial_status,
    is_startable = EXCLUDED.is_startable,
    content_version = EXCLUDED.content_version,
    published_at = EXCLUDED.published_at;
```

Use `draft`, `is_startable = false`, and `published_at = NULL` while a payload is incomplete. A row-level `published` value does not make nested Learning Hub `placeholder` items production-ready; preserve their honest readiness.

### Reversible Dynamic-Stage Smoke Test

For a reversible end-to-end check that a new Learning Hub stage appears without
an application code change, use
[`learning-hub-dynamic-stage-smoke-test.sql`](../database/learning-hub-dynamic-stage-smoke-test.sql).
It appends one test-only Luganda stage idempotently, bumps `content_version`,
and includes separate cleanup SQL. Run it only against a development target or
an explicitly approved test project; it directly updates the selected database.
Do not copy the smoke-test IDs into real curriculum content.

```text
npx supabase@2.109.1 db query --linked --file docs/database/learning-hub-dynamic-stage-smoke-test.sql
```

The query result should report `test_stage_present = true`. For a child using
`lg`, reopen Learning Hub or navigate away and back; the startable **Database
Content Test** stage should appear at order 99 without rebuilding the app. The
same seed must not appear for `nyn`. Run the commented cleanup block separately
after the visual check.

## Learning Hub Bundle

The `learning_hub` row is the main curriculum. Its payload envelope is:

```json
{
  "languageCode": "lg",
  "displayName": "Luganda",
  "localName": "Oluganda",
  "pathTitle": "Luganda Learning Path",
  "stages": [
    {
      "id": "first-words",
      "order": 1,
      "stageNumber": 1,
      "title": "First Words",
      "description": "Start with useful everyday words.",
      "imageKey": "learning-beginner.jpg",
      "status": "preview",
      "estimatedMinutes": 4,
      "isPractice": false,
      "isLocked": false,
      "readiness": "draft",
      "mechanics": ["tap_to_learn"],
      "learningGoals": ["Hear and recognize useful words"],
      "placeholderMessage": "More lessons are being prepared.",
      "lessons": [
        {
          "id": "greetings-1",
          "order": 1,
          "title": "Greetings",
          "description": "Tap each card to learn the word.",
          "mechanic": "tap_to_learn",
          "isStartable": true,
          "isLocked": false,
          "readiness": "draft",
          "items": [
            {
              "id": "thank-you",
              "order": 1,
              "mechanic": "tap_to_learn",
              "localText": "Webale",
              "englishText": "Thank you",
              "audioKey": "webale",
              "audioAsset": "webale",
              "readiness": "draft"
            }
          ]
        }
      ]
    }
  ]
}
```

The repository orders stages, lessons, and items, validates all explicit IDs, removes invalid implemented items, and derives each lesson's `startable`, `coming_soon`, `locked`, `unsupported`, or `empty` status. UI code consumes only normalized repository objects.

To extend the path, add a stage at a new explicit order, add globally unique lesson IDs inside it, and add uniquely identified items whose mechanic matches their lesson. Mark incomplete work `placeholder`/`draft` and `isStartable: false`; publish only the surrounding bundle version that is safe to deliver. To add an item to a shipped lesson, append a new ID/order without renumbering existing items, then bump the row `content_version` in a new migration.

### Mechanic Item Examples

These snippets belong in `stages[].lessons[].items[]`. The enclosing lesson's `mechanic` must match the item mechanic.

`tap_to_learn` requires local and English text:

```json
{
  "id": "thank-you",
  "order": 1,
  "mechanic": "tap_to_learn",
  "localText": "Webale",
  "englishText": "Thank you",
  "imageKey": "learning-beginner.jpg",
  "audioKey": "webale",
  "audioAsset": "webale",
  "readiness": "draft"
}
```

`listen_and_choose` requires two to four usable options and a matching correct ID. Provide resolvable audio:

```json
{
  "id": "listen-webale",
  "order": 1,
  "mechanic": "listen_and_choose",
  "promptText": "Tap the word you hear",
  "audioKey": "webale",
  "audioAsset": "webale",
  "correctOptionId": "webale",
  "options": [
    { "id": "webale", "order": 1, "localText": "Webale", "englishText": "Thank you" },
    { "id": "amazzi", "order": 2, "localText": "Amazzi", "englishText": "Water" }
  ],
  "readiness": "placeholder"
}
```

`choose_correct_word` requires a prompt, two to four unique options with local text, and a matching correct ID:

```json
{
  "id": "choose-water",
  "order": 1,
  "mechanic": "choose_correct_word",
  "promptText": "Which word means Water?",
  "questionText": "Water",
  "correctOptionId": "amazzi",
  "options": [
    { "id": "amazzi", "localText": "Amazzi", "englishText": "Water" },
    { "id": "webale", "localText": "Webale", "englishText": "Thank you" }
  ],
  "readiness": "placeholder"
}
```

`match_word_picture` requires a target, two to four unique options, and a matching correct ID. Images or emoji are presentation references, not correctness keys:

```json
{
  "id": "match-water",
  "order": 1,
  "mechanic": "match_word_picture",
  "promptText": "Tap the picture that matches",
  "targetText": "Amazzi",
  "targetEnglishText": "Water",
  "correctOptionId": "water",
  "options": [
    { "id": "water", "localText": "Amazzi", "englishText": "Water", "imageKey": "rain.jpg" },
    { "id": "child", "localText": "Omwana", "englishText": "Child", "imageKey": "child.png" }
  ],
  "readiness": "placeholder"
}
```

`mini_quiz` requires one to five questions; each has two to four options and its own correct ID:

```json
{
  "id": "first-words-review",
  "order": 1,
  "mechanic": "mini_quiz",
  "title": "First Words Review",
  "instructions": "Choose the best answer.",
  "questions": [
    {
      "id": "thank-you-word",
      "promptText": "Which word means Thank you?",
      "correctOptionId": "webale",
      "options": [
        { "id": "webale", "text": "Webale", "englishText": "Thank you" },
        { "id": "amazzi", "text": "Amazzi", "englishText": "Water" }
      ],
      "explanationText": "Webale means Thank you."
    }
  ],
  "readiness": "placeholder"
}
```

`cultural_card` is non-graded and requires a title and body:

```json
{
  "id": "home-greeting",
  "order": 1,
  "mechanic": "cultural_card",
  "title": "A Greeting At Home",
  "bodyText": "Placeholder cultural guidance awaiting review.",
  "reflectionPrompt": "Who do you greet at home?",
  "imageKey": "african-focus.png",
  "readiness": "placeholder"
}
```

`story_bite` is non-graded and requires one to five uniquely identified pages with body text:

```json
{
  "id": "thank-you-at-home",
  "order": 1,
  "mechanic": "story_bite",
  "title": "Thank You At Home",
  "instructions": "Read each short page.",
  "pages": [
    {
      "id": "thank-you-at-home-1",
      "title": "Helping",
      "bodyText": "A child helps at home.",
      "imageKey": "child.png"
    }
  ],
  "readiness": "placeholder"
}
```

`practice_mix` has no renderer. Keep the stage and lesson locked and non-startable; its placeholder item must never be used to unlock a session:

```json
{
  "id": "practice-mix",
  "order": 5,
  "stageNumber": 5,
  "title": "Practice Mix",
  "description": "Mixed review is planned.",
  "status": "locked",
  "isPractice": true,
  "isLocked": true,
  "readiness": "placeholder",
  "estimatedMinutes": 1,
  "mechanics": ["practice_mix"],
  "learningGoals": [],
  "placeholderMessage": "Practice Mix is coming soon.",
  "lessons": [
    {
      "id": "review-first-words",
      "order": 1,
      "title": "Review First Words",
      "description": "Planned mixed practice.",
      "mechanic": "practice_mix",
      "isStartable": false,
      "isLocked": true,
      "readiness": "placeholder",
      "items": [
        {
          "id": "review-first-words-placeholder",
          "order": 1,
          "mechanic": "practice_mix",
          "prompt": "Coming soon",
          "readiness": "placeholder"
        }
      ]
    }
  ]
}
```

## Migrated Menu, Game, And Story Payloads

Every ordered record should include a stable ID and `order`.

| Type | Required payload data | Optional data |
| --- | --- | --- |
| `child_menu` | Non-empty `cards`; each usable card has `id` and `targetPage` | Card title, description, image, availability |
| `learning_game` | Non-empty stages with positive IDs, non-empty levels with positive IDs, and words with `id`, `targetText`, and `english` | Display copy, locks, score threshold, color, images, audio, examples, notes |
| `word_game` | Non-empty levels with `id`, `targetText` (or legacy `word`), and `question` | Hint, sub-hint, first letter, image |
| `counting_game` | Non-empty stages and numbers; each stage has positive ID/range/level count; each number has a positive value and target text | Title, prompts, bunch settings, cultural items, currency, audio |
| `card_game` | At least eight items with unique `id`/`value` and non-empty `info`/`imageSymbol` | Row title |
| `puzzle_game` | Non-empty puzzles with positive `id`, name, description, and image | Row title |
| `story` | Non-empty pages with explicit `id` and text | Summary, exact language declaration, metadata, translation, image/alt text, valid quiz questions |

For Learning Hub, the row needs an exact `languageCode` and non-empty `stages`; every stage, lesson, item, and nested answer/question/page needs an explicit stable ID and its required mechanic fields. Display/local names, media references, metadata, examples, explanations, and reflection prompts are optional unless a mechanic section below says otherwise.

### `child_menu`

The row slug names the tab (`games`, `stories`, or `coloring`). Routes omit the leading slash.

```json
{
  "cards": [
    {
      "id": "words",
      "order": 1,
      "title": "Words",
      "description": "Fill in the missing letters to complete the word",
      "image": "african-focus.png",
      "targetPage": "child/games/wordgame"
    }
  ]
}
```

Menu presence controls language exposure. Do not add a Cards or Puzzle menu card for `nyn` until its corresponding reviewed `nyn` bundle exists.

### `learning_game`

Numeric stage and level IDs are historic progress identities. Words need stable string IDs plus local and English text.

```json
{
  "stages": [
    {
      "id": 1,
      "order": 1,
      "title": "Beginner",
      "description": "Learn starter words",
      "isLocked": false,
      "requiredScore": 0,
      "color": "#4F85E6",
      "image": "learning-beginner.jpg",
      "levels": [
        {
          "id": 1,
          "order": 1,
          "title": "Greetings",
          "isLocked": false,
          "words": [
            {
              "id": "learning-word-webale",
              "order": 1,
              "targetText": "Webale",
              "english": "Thank you",
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

### `word_game`

`targetText` (or legacy `word`) and `question` are required. Preserve both IDs and exact order; the target is normalized to uppercase at runtime.

```json
{
  "levels": [
    {
      "id": "word-lg-001",
      "order": 1,
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

### `counting_game`

`stages` and `numbers` are required and non-empty. Each stage needs a valid positive range and level count. Include all number labels and image records required by the ranges/mechanics.

```json
{
  "title": "Luganda Counting Game",
  "stages": [
    {
      "id": 1,
      "order": 1,
      "title": "Basic Counting",
      "description": "Count from 1 to 10",
      "numbersRange": { "min": 1, "max": 10 },
      "levels": 5,
      "useBunches": false,
      "usesCurrency": false,
      "prompt": "How many {item} do you see?"
    }
  ],
  "numbers": [
    { "number": 1, "order": 1, "targetText": "Emu" }
  ],
  "culturalItems": [
    { "id": "counting-item-matooke", "order": 1, "name": "matoke", "image": "matooke.png" }
  ],
  "currency": [
    {
      "id": "currency-500",
      "order": 1,
      "value": 500,
      "name": "500 shillings",
      "image": "500.png",
      "targetText": "Bikumi bitaano"
    }
  ]
}
```

The example is structural; a released stage must contain every reviewed number label it can generate, not only `1`.

### `card_game`

At least eight items are required. IDs and exact `value` strings must be unique; matched-value progress depends on those values.

```json
{
  "items": [
    { "id": "card-lg-001", "order": 1, "value": "Kabaka", "info": "The King of Buganda.", "imageSymbol": "👑" },
    { "id": "card-lg-002", "order": 2, "value": "Lubiri", "info": "The royal palace of the Kabaka.", "imageSymbol": "🏰" },
    { "id": "card-lg-003", "order": 3, "value": "Matoke", "info": "Steamed green bananas.", "imageSymbol": "🍌" },
    { "id": "card-lg-004", "order": 4, "value": "Kanzu", "info": "A traditional ceremonial robe.", "imageSymbol": "👘" },
    { "id": "card-lg-005", "order": 5, "value": "Gomesi", "info": "A traditional ceremonial dress.", "imageSymbol": "👗" },
    { "id": "card-lg-006", "order": 6, "value": "Engoma", "info": "Traditional drums.", "imageSymbol": "🥁" },
    { "id": "card-lg-007", "order": 7, "value": "Lukiiko", "info": "The Buganda council.", "imageSymbol": "🏛️" },
    { "id": "card-lg-008", "order": 8, "value": "Olugero", "info": "A traditional story.", "imageSymbol": "📚" }
  ]
}
```

Use the reviewed canonical wording from the latest migration when editing real records; the shortened descriptions above illustrate the validator shape only.

### `puzzle_game`

Puzzle IDs are positive numeric progress identities. Image keys must resolve from the static map.

```json
{
  "puzzles": [
    {
      "id": 1,
      "order": 1,
      "name": "Kasubi Tombs",
      "description": "A UNESCO World Heritage site and burial ground of Buganda kings",
      "image": "puzzles/kasubi-tombs.jpg"
    }
  ]
}
```

### `story`

Store one story per row. `pages` is required and non-empty. Questions are optional; each needs at least two options and a valid zero-based `correctAnswer`.

```json
{
  "id": "new-story",
  "title": "New Story",
  "summary": "A short draft story.",
  "languageCode": "lg",
  "metadata": {
    "status": "placeholder",
    "notes": "Requires content-team review before publication"
  },
  "pages": [
    {
      "id": "new-story-page-1",
      "text": "Draft story text awaiting review.",
      "image": "story/new-story/page-1.jpg",
      "altText": "Child-friendly description of the illustration"
    }
  ],
  "questions": [
    {
      "id": "new-story-question-1",
      "question": "What happened first?",
      "options": ["Answer A", "Answer B"],
      "correctAnswer": 0
    }
  ]
}
```

Add or update the same language's `child_menu/stories` card separately. The generic story renderer queries dynamically and does not depend on a fixed story count.

## Assets And Code-Owned Values

Content payloads may reference images and audio, but React Native bundling still requires code-owned maps:

- register bundled image keys in `content/assets.ts`;
- register Learning Hub audio in `lib/audioAssets.ts`;
- keep the standalone game audio/sound registry in `components/games/utils/audioManager.ts`;
- keep routes, renderers, mechanic registry, scoring, randomization, animation, progress storage/sync, achievement evaluation, completion notices, and Practice Mix's missing renderer in code.

Do not store functions, JavaScript, scoring formulas, unlock algorithms, or arbitrary route execution in `payload`. See [Content Cache And Asset Loading](./content-cache-and-images.md) for cache and resolver behavior.

## Adding A Language

Adding a language is an explicit product and content release, not a fallback alias:

1. Add the exact code and names to `public.languages` in a new migration.
2. Add the code to `SupportedLearningLanguageCode` and `LEARNING_LANGUAGES`, plus selection/UI copy as required.
3. Author each required menu and content row with that exact `language_code`; declare the same code inside Learning Hub/Story payloads.
4. Start rows as `draft`, non-startable, and unpublished until reviewed content is complete.
5. Add only the menu cards backed by startable content for that language. Do not expose Cards/Puzzle merely because `lg` has them.
6. Test exact-language queries, cache keys, progress keys, unavailable states, and a deliberate database outage.

Never clone Luganda rows as a temporary fallback and never invent translations. A language with no valid published bundle remains unavailable.

## Cache And Dynamic Updates

The v2 content cache stores exact-language raw rows in memory and AsyncStorage. A valid hit returns immediately and refreshes in the background. The derived bundle version includes every row's `content_version` and `updated_at`, so a valid newer query replaces the cached row set. Malformed, empty, failed, cross-language, or duplicate-bundle responses retain the previous valid cache. With no cache, the app shows the unavailable/retry state.

New published records appear and retired records disappear on a successful refresh without application code changes, provided their `content_type` already has a mapper/renderer. Learning Hub performs a foreground refresh when registered cached content exists, so its mounted screen can adopt the newer bundle. Generic menu/game consumers may first render their valid stale cache while revalidation runs; navigate away and back or use retry to consume the refreshed cache. Adding a new content type or mechanic still requires code-owned types, validation, rendering, and tests.

## Validation

Run the focused tests, then the whole project:

```text
npm test -- content/__tests__/contentRepository.test.ts content/__tests__/learningHubRepository.test.ts supabase/migrations/__tests__/databaseBackedLearningContentMigration.test.ts supabase/migrations/__tests__/normalizePublishedStoryMenuOrderMigration.test.ts
npm run typecheck
npm run lint
npm test
```

Validate migrations against a disposable Supabase database with a current CLI (discover flags with `--help`):

```text
supabase --version
supabase start
supabase db reset
supabase migration list --local
supabase db lint --local
supabase db advisors --local
```

### Local reset caveat

The checked-in migration chain begins after the original base application
schema. On a completely empty local Supabase instance, `supabase db reset`
currently stops at `20260619000000_add_child_language_support.sql` because
`public.children` has not yet been created by repository migrations. Until a
baseline migration is restored, use an existing development schema or a
disposable database bootstrapped from the context schema to validate content
migrations. Do not modify old applied migrations to hide this gap.

Also query as `anon` locally: published/active rows should be readable, draft rows should not be visible through RLS, and `INSERT`, `UPDATE`, and `DELETE` should fail. Apply production changes only through the reviewed migration path; never use or expose the service-role key in the app.

Common failures:

- Content is unavailable: row is inactive, not published, not startable, wrong-language, empty, or malformed.
- An old cache remains: one supported row failed validation or a single-bundle type was duplicated, so last-known-good protection worked.
- Learning Hub row is rejected: declared language differs, an explicit ID is missing/duplicated, or a nested option/question/page ID is invalid.
- A lesson shows Coming soon: it is locked/non-startable, its mechanic has no renderer, or it has no valid matching items.
- Cards are rejected: fewer than eight items, duplicate IDs, or duplicate exact values.
- Image/audio falls back: its key is absent from the bundled resolver map.
- `nyn` shows no game: expected until valid reviewed `nyn` rows and matching menu cards are published; do not repair it with `lg` content.
