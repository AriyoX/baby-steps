# MVP Content Items

`content_items` is MVP storage for language-specific app data. It is not a CMS. It does not own routes, game rules, scoring, achievements, screen layout, publishing workflows, review states, payments, or admin tooling.

Game and story logic stays in the React Native codebase. The database only supplies the words, labels, prompts, answer choices, menu cards, story pages, and media references that vary by learning language.

## Naming

- `content_type` values are lowercase keys: `child_menu`, `learning_game`, `word_game`, `counting_game`, `story`.
- `slug` values are lowercase content keys, such as `games`, `stories`, `starter`, `levels`, and `stages`.
- Route names do not have to match slugs. For example, the legacy `app/child/(tabs)/Stories.tsx` route maps to the lowercase `stories` content slug.
- The legacy `app/child/games/lugandacountinggame.tsx` route now renders language-aware counting content. It has not been renamed yet to avoid route churn during the MVP slice.

## Payload Shape

| `content_type` | Required payload arrays | Notes |
| --- | --- | --- |
| `child_menu` | `cards` | Cards provide `id`, `title`, `description`, optional `image`, and `targetPage`. Navigation behavior remains in the app. |
| `learning_game` | `stages` | Stages contain levels and words. Lesson flow, quiz logic, scoring, progress, and achievements remain in code. |
| `word_game` | `levels` | Levels provide words, questions, hints, sub-hints, and optional image references. Letter-choice mechanics remain in code. |
| `counting_game` | `stages`, `numbers` | Counting stages, number labels, prompts, item labels/images, and currency labels come from payload. Counting mechanics remain in code. |
| `story` | `pages` | Story payloads provide title, summary, language metadata, pages, images, and optional questions. Rendering remains in `GenericStoryRenderer`. |

The repository validates these required arrays before mapping DB rows. Invalid rows are skipped so the affected screen can show a coming-soon state instead of silently borrowing another language.

## Language Separation

- Content is queried by the active child language code from `children.selected_language_code`.
- A Runyankole child (`nyn`) only receives `content_items.language_code = 'nyn'`.
- There is no silent fallback from `nyn` to Luganda (`lg`).
- Luganda may use the explicit `local-lg-legacy` fallback while prototype content is being migrated.
- If a story payload includes `languageCode`, it must match the row `language_code`; mismatches are skipped.
- Legacy Luganda story components can remain in the app, but Runyankole menu rows must not point to them unless a reviewed `nyn` content item explicitly provides that story.

## What To Normalize Later

When Baby Steps needs real CMS/admin tooling, normalize only then:

- curricula, lessons, stages, levels, and lesson items,
- stories, pages, questions, and answer options,
- media assets, attribution, alt text, and CDN metadata,
- publication status, draft/review/approval workflows, and versions,
- creator/admin roles and audit logs,
- stable content IDs and content versions on activity/progress rows.

Until then, keep `content_items.payload` flexible and small, and keep app behavior in code.
