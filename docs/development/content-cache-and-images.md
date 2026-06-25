# Content Cache and Image Loading

This is an MVP code-side cache and loading layer. It does not create a CMS, admin tooling, or new database tables.

## Language Flow Verification

- `children.selected_language_code` exists in `schema.sql` and the Supabase language migration.
- Child creation writes `selected_language_code` in `context/UserContext.tsx`.
- Parent child detail fetches `selected_language_code`, sets the active child in `ChildContext`, and launches child mode.
- Child menu, learning game, word game, counting game, and generic story route call `loadContentBundle` with the active child's selected language.
- Luganda (`lg`) and Runyankole (`nyn`) paths remain separate. A Runyankole request must not use Luganda DB rows or cached Luganda content.

## Audit

DB content fetch entry points:

- `components/child/AfricanThemeGameInterface.tsx`: child menu cards.
- `components/games/LearningGameComponent.tsx`: learning stages, levels, and words.
- `components/games/WordGameComponent.tsx`: word game levels.
- `components/games/CountingGameComponent.tsx`: counting stages, labels, item images, and currency.
- `app/child/stories/[storyId].tsx`: generic DB-backed story lookup.
- `content/contentRepository.ts`: Supabase `content_items` query and local same-language fallback.

Important image render points:

- Migrated to `CachedImage`: child menu cards and avatar, generic story page image, learning game stage/word images, word game level image, counting game item/currency images.
- Still direct bundled images: static score coins, `ImageBackground` screen backgrounds, parent-gate images, puzzle/museum/coloring screens, and legacy hand-built story components.

Existing fallbacks:

- `buildLocalContentBundle("lg")` uses legacy bundled Luganda content.
- `buildLocalContentBundle("nyn")` uses same-language Runyankole sample content.
- `ComingSoonState` is used when a child-facing activity has no content.
- `resolveImageSource` falls back to bundled placeholder assets for unknown local image names.

High-priority migration status:

- Child menu: content cache, image loading, and bundle image preloading added.
- Generic story renderer: image loading and story image preloading added.
- Learning game: content cache path, bundle image preloading, and main content image loading added.
- Word game: content cache path, bundle image preloading, and level image loading added.
- Counting game: content cache path, bundle image preloading, and item/currency image loading added.

## Content Cache Behavior

`loadContentBundle(languageCode, options)` caches DB-backed `content_items` rows in memory and AsyncStorage.

- Cache key: `@BabySteps:ContentBundle:v1:<language_code>`.
- TTL: `CONTENT_BUNDLE_CACHE_TTL_MS`, currently 6 hours.
- Force refresh: call `loadContentBundle(languageCode, { forceRefresh: true })`.
- Test/helper invalidation: `clearContentBundleCache(languageCode?)`.
- Cache entries store raw DB rows, not fully resolved app objects, so payload validation and image resolution run again before cached content is returned.
- Only usable, validated same-language DB content is cached.
- Invalid DB payloads are skipped and are not cached as usable DB content.
- A fresh same-language cache hit avoids a Supabase fetch.
- If Supabase fails, the repository may return same-language cached DB content, including stale cache, before falling back to bundled local content.
- If there is no usable same-language cache, existing local fallback behavior applies.
- `nyn` never falls back to cached `lg`. A mismatched cached entry or DB row is ignored.

## Image Loading

Use `components/common/CachedImage.tsx` for child-facing content images:

```tsx
<CachedImage
  source={resolveImageSource(card.image, "african-focus.png")}
  fallbackSource={resolveImageSource("african-focus.png")}
  className="w-full h-40"
  resizeMode="cover"
  accessibilityLabel={card.title}
/>
```

Supported image references:

- Bundled asset names registered in `content/assets.ts`, such as `coin.png`.
- Existing static `require(...)` image modules.
- Future URI strings such as `https://...`, `file://...`, or `data:image/...`.

Preloading helpers live in `content/imagePreloader.ts`.

- `preloadContentBundleImages(bundle)` collects menu, story, learning, word, and counting images.
- `preloadStoryImages(story)` preloads a story's page images.
- Bundled assets use `expo-asset`.
- Remote HTTP(S) URIs use `Image.prefetch`.
- Preloading is best-effort and non-blocking. Failures are logged only in development and must not block gameplay.

## Later CDN/CMS Improvements

If a real CDN or CMS is introduced later, add signed/public CDN URL conventions, stronger payload versioning, cache eviction by content revision, image dimensions in payloads, low-resolution placeholders, and optional offline content packs. Keep language-specific cache keys and the no silent `nyn` to `lg` fallback rule.
