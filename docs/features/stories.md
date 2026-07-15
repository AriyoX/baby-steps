# Stories

Stories are existing database-backed content and continue to use the shared exact-language repository.

The Stories tab reads `child_menu/stories`; each card points to `app/child/stories/[storyId].tsx`. That route loads the active language's `ContentBundle`, finds the story by stable slug, and renders it through `components/stories/GenericStoryRenderer.tsx`.

The runtime does not assume a fixed story, page, or question count. A valid `story` payload supplies one or more uniquely identified pages and any number of valid optional quiz questions supported by the renderer. New published rows appear and retired rows disappear after content refresh without a code change. A payload language declaration must match its row, and no missing `nyn` story is replaced with Luganda.

Story UI, navigation, page-turn audio, quiz behavior, progress, activity writes, and completion rules remain code-owned. Content supplies titles, summaries, pages, translations when reviewed, image keys/alt text, questions, options, and correct indexes. Missing/invalid content shows the shared unavailable state and never clears existing progress.

The canonical content migration publishes the verified Luganda Stories menu and eight already-migrated Luganda story rows. `20260714213732_normalize_published_story_menu_order.sql` adds the explicit card order required by strict runtime validation and bumps the menu version. Known Runyankole sample content remains draft/non-startable. Deprecated hand-built story components, if still present for route compatibility, are not the production content source and must not be used as a language fallback.

See [Content Authoring And New Games](../development/content-authoring-and-new-games.md#story) for the payload and publication procedure, and [Content Cache And Asset Loading](../development/content-cache-and-images.md) for offline behavior.

## Manual QA

- Open each card returned for the active language and navigate all returned pages.
- Verify image fallbacks and accessibility labels.
- Complete stories with and without quiz questions and confirm existing progress/activity behavior.
- Add/retire a row in a safe development database, update the menu/version, and confirm the renderer does not require a fixed count.
- Test an unavailable exact language and an offline exact-language cache.
