# MVP Content Items

`public.content_items` is the versioned exact-language bundle store for Baby Steps. It remains intentionally small: no visual CMS, app-side editing, executable logic, or media upload workflow. React Native owns routes, renderers, mechanics, scoring, progress, achievements, and bundled asset maps.

The supported types are `child_menu`, `learning_hub`, `learning_game`, `word_game`, `counting_game`, `card_game`, `puzzle_game`, and `story`. Their required arrays and complete payload examples are maintained in [Content Authoring And New Games](./content-authoring-and-new-games.md); do not duplicate those contracts here.

Rows are keyed by exact `language_code`, lowercase `content_type`, and stable lowercase `slug`. Child clients query only active, published, startable rows for the selected language. There is no bundled runtime content fallback and no `nyn` to `lg` substitution. The v2 cache is also exact-language and retains only the last fully valid row set.

The table has a minimal editorial lifecycle (`draft`, `reviewed`, `published`), row startability, a positive `content_version`, and a publication timestamp. RLS exposes active/published rows for reads; explicit Data API grants give `anon` and `authenticated` `SELECT` only. Content updates use idempotent migrations, with `20260714182326_database_backed_learning_content.sql` as the canonical initial seed and `20260714213732_normalize_published_story_menu_order.sql` as its ordered-menu compatibility correction.

Keep the JSON-bundle model until a real operational need justifies normalized curriculum/media/admin tables. See [Database-Backed Content](../features/database-content.md) for the architecture and [Content Management](./content-management.md) for the authoring boundary.
