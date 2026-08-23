# Content Cache And Asset Loading

`content/contentRepository.ts` is the single general content-loading and caching layer. Learning Hub, menus, Stories, and reachable standalone games reuse it; do not add a second cache for a new content type.

## Exact-Language Stale-While-Revalidate

`loadContentBundle(languageCode, options)` normalizes the requested code and queries `content_items` with all of these predicates:

- exact `language_code`;
- `is_active = true`;
- `editorial_status = 'published'`;
- `is_startable = true`.

An explicit language is never replaced by the default language. A missing language selection defaults to `lg`, but `nyn`, an unsupported code, and any future code keep separate query and cache namespaces.

Cache behavior:

- Key: `@BabySteps:ContentBundle:v2:<language_code>`.
- Storage: in-memory map plus AsyncStorage.
- Default freshness window: six hours (`CONTENT_BUNDLE_CACHE_TTL_MS`).
- Value: exact-language raw rows, schema version, derived content version, and load timestamp.
- A valid cache is returned immediately, whether fresh or stale, and a single background refresh is started for that language.
- `{ forceRefresh: true }` tries the network first and falls back to the valid exact-language cache on failure.
- `clearContentBundleCache(languageCode?)` clears one language or every v2 entry.
- `waitForContentBundleRefreshes()` is available for deterministic tests.

The bundle version is derived from each ordered row's `content_type`, `slug`, `content_version`, and `updated_at`. A valid refresh with a newer or otherwise changed row set replaces the cache without an application release. Learning Hub foreground-refreshes a registered cached bundle and can update the mounted screen. Generic menu/game consumers may first render stale content while their background refresh runs; remount the screen or use its retry action to consume the refreshed cache.

The last-known-good rule is intentionally strict. A response is not cached if it is empty, has no usable supported content, contains a malformed supported row, declares the wrong payload language, or contains more than one published/startable row for a single-bundle type. A failed refresh never overwrites a valid cache. Cached rows are revalidated when read, so corrupt or cross-language AsyncStorage data is discarded. With no valid cache and no usable database response, callers receive `source: "empty"` and show the existing unavailable/retry UI; they do not load legacy Luganda arrays.

## Images

Database payloads store image references, not dynamically imported binaries. React Native still needs static `require(...)` calls at bundle time, so `content/assets.ts` remains code-owned.

Use one of these references:

- a stable key registered in `IMAGE_ASSETS`, such as `rain.jpg` or `puzzles/kasubi-tombs.jpg`;
- an existing React Native image module;
- a supported `https://`, `file://`, or `data:image/` URI.

`resolveImageSource(reference, fallbackKey)` maps these references and supplies a safe bundled fallback for an unknown key. To add a bundled image:

1. Add the binary under `assets/`.
2. Add one static entry to `IMAGE_ASSETS` in `content/assets.ts`.
3. Store that exact key in the content payload.
4. Add useful `altText` to story pages and test the relevant screen.

`content/imagePreloader.ts` performs best-effort, non-blocking preloading for menu, story, Learning, Word, and Counting images. Bundled assets use Expo Asset and HTTP(S) images use `Image.prefetch`. A preload failure must not block content or progress.

## Audio

Audio references also stay declarative in database payloads, while bundled resolver maps remain in code:

- Learning Hub uses logical `audioKey` and optional bundled `audioAsset`, resolved by `lib/audioAssets.ts`.
- Standalone Learning/Counting playback continues through the existing maps and mechanics in `components/games/utils/audioManager.ts`.

Add a reviewed bundled recording to the appropriate static resolver before using its key in a payload. Do not infer a file path or use a dynamic `require`. Placeholder audio must remain marked placeholder in content readiness metadata.

## Failure Checklist

- Wrong language appears: inspect the requested code, row `language_code`, and v2 cache key; never repair this with fallback.
- New content does not appear: confirm it is active, published, startable, has a bumped `content_version`, and passes every type validator.
- Valid old content remains after refresh: check for one invalid supported row or a duplicate single-bundle type; either causes last-known-good retention.
- Every area is unavailable on a first install: inspect the Supabase error before changing fallback behavior. A missing metadata-column error such as PostgreSQL `42703` means the content migrations have not been applied; an empty first cache cannot mask a schema failure.
- One valid area is blocked by another row: the published response is atomic. Fix the malformed supported row instead of partially caching the response. `20260714213732_normalize_published_story_menu_order.sql` is the concrete compatibility example.
- Image shows the generic fallback: register the exact key in `content/assets.ts` or provide a supported URI.
- Offline first launch is unavailable: expected when the exact-language cache has never been populated.
