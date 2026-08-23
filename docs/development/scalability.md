# Scalability and Capacity Plan

Last reviewed: 2026-07-21

## Decision Summary

The current Expo and Supabase architecture can support approximately 10,000
registered family accounts without a backend rewrite, provided the immediate
items in this document are completed first. The current implementation should
not be treated as ready for 10,000 simultaneously active clients.

The content revision and seed design is not proportional to the number of
users. A content release replaces a small shared row set once, and each client
decides whether its local progress revision is still compatible. The main
scaling risks are repeated full-content downloads, Realtime fan-out, repeated
per-child queries, append-only activity growth, missing operational
measurement, and production database hardening.

This is a static review of the checked-in code and migrations. It is a capacity
plan, not a load-test result or a promise that a particular Supabase plan will
support a particular traffic level. Supabase product limits and the selected
project plan must be checked again whenever a stage below is approached.

## How to Interpret the Thresholds

Registered users are an easy planning number, but they are not the load placed
on the system. Capacity decisions should use all of these measurements:

- **Registered accounts:** total parent accounts.
- **DAU:** distinct active parent accounts during a day.
- **Peak concurrency:** clients making requests or holding Realtime connections
  during the busiest few minutes.
- **Requests per active session:** especially content, dashboard, progress, and
  activity-history requests.
- **Rows and bytes:** particularly `activities`, `child_streak_days`, progress
  JSON payloads, content bundles, and media.

The account counts below are latest safe planning deadlines, not exact failure
points. Complete an item earlier when its measurable trigger is reached.

## Current Codebase Baseline

| Area | Current implementation | Scaling consequence |
| --- | --- | --- |
| Shared content | `content/contentRepository.ts` reads every published/startable row for one exact language and has a six-hour memory/AsyncStorage cache. | The table and indexed query are small, but eight current screens use `forceRefresh: true`, so ordinary navigation repeatedly downloads the full language bundle. |
| Content releases | `supabase/seed.sql` deletes and reinserts the scoped Luganda content rows inside one transaction. | Seed cost is constant with respect to user count. A release can still produce a client read burst as active devices reopen content. |
| Content/progress revisions | Runtime cache identity and progress compatibility are separate, but `scripts/build-luganda-stage-1-2-content.mjs` currently assigns both from the same `contentVersion` value. | A harmless content release can accidentally invalidate progress for every affected user. This is a release-safety issue, not a database-capacity issue. |
| Current progress | `lib/progressRepository.ts` stores local snapshots first, deduplicates its queue, waits 15 seconds for ordinary sync, and batch-upserts current activity/stage rows. | Good base for 10,000 accounts: writes grow with meaningful state changes rather than every tap. |
| Activity history | `lib/utils.ts` inserts append-only `activities` rows. Recent reads are cached for 10 minutes and limited to 50 rows per child. | The read path is bounded, but storage grows continuously. Each write also performs a separate child-name lookup before the insert. |
| Activity Realtime | `app/parent/activities.tsx` subscribes to all changes on `public.activities` without a Postgres filter and calls `fetchData(true)` for every received event. | This is the clearest fan-out risk. A change can cause connected activity screens to bypass cache and refetch all of their child slices. |
| Parent dashboard | `app/parent/index.tsx` fetches children and then calls `getActivityStats` once per child. | Acceptable while a family has few children, but it is an N-per-child request pattern and cannot be reused for a future school/class account. |
| Achievements | Definitions have a 24-hour cache; earned rows have a 15-minute child cache and a unique `(child_id, achievement_id)` constraint. `all-achievements.tsx` fetches earned achievements sequentially for each child. | Definitions and normal family use are bounded. The all-children screen should use one bulk query before accounts can own many child profiles. |
| Streaks | Indexed, owner-guarded RPC writes. Per-child hydration issues three parallel queries and loads all epochs and days for that child. | Writes are naturally partitioned by child and should scale well. Full-history hydration should become current-epoch/recent-window hydration as histories become long. |
| Database indexes | Content, children-by-parent, activities-by-child/language/date, current progress, achievements, deletion work, and streak lookups have useful indexes. | The base relational model is suitable for the expected 10,000-account range. Index usage still needs live query-plan and advisor review. |
| RLS/security | The latest repository database note reports RLS disabled on `activities`, `achievements`, `child_achievements`, and `languages`. | This is a public-release blocker regardless of user count, and the unfiltered Realtime subscription makes `activities` especially urgent. |
| Migration recovery | The checked-in migration chain begins after the original base schema, so a clean empty database cannot currently be rebuilt from migrations alone. | This is an operational scaling blocker: additional environments and disaster recovery cannot be trusted until the baseline migration is restored. |
| Media | The raw `assets/` source tree currently contains 298 files totaling approximately 102 MiB; final store/archive size will differ after platform packaging and compression. `CachedImage` handles UI loading/fallback, but it is not an application-controlled, versioned offline download cache. | Current bundled media does not load Supabase, but it increases app download/update size and device storage. Future remote media needs immutable versions and a CDN/storage cache policy. |
| Monitoring | Production analytics, handled-error reporting, crash monitoring, database capacity dashboards, and service-level objectives are not implemented. | Growth cannot be managed safely without knowing request volume, latency, cache hits, failures, database saturation, and app crashes. |

## Illustrative 10,000-Account Model

This example is for planning only. Assume 10,000 registered parent accounts,
20% DAU, two meaningful completions per active account per day, and five
content-screen entries per active session.

- The current forced-refresh pattern can produce about 10,000 full language
  bundle reads per day. A session-level cache-first design can reduce that
  toward one refresh per language/session, with local cache hits for the rest.
- Approximately 4,000 activity completions per day produce about 1.46 million
  append-only `activities` rows per year before duplicate lesson/stage feed
  entries are considered.
- Current progress rows remain bounded by child, language, activity, stage, and
  level identities. Repeated play updates existing snapshots instead of always
  creating new rows.
- Streak history creates at most one current-epoch day row per child/local day,
  so it grows predictably but should not be downloaded in full forever.

This model shows why repeated reads and append-only history deserve attention
before the current-progress tables do.

## Scaling Stages

| Complete no later than | Expected operating range | Required work |
| --- | --- | --- |
| Before public beta | 0-1,000 registered accounts; under 50 peak active clients | Repair the base migration chain. Enable and verify ownership-aware RLS/grants on every exposed table. Remove or properly scope the global activity Realtime subscription. Stop forcing a full content refresh on every screen entry. Separate `contentVersion` from per-type `progressRevision`. Add crash/error and backend capacity visibility. Compress oversized bundled media. |
| Before 5,000 registered | Roughly 50-150 peak active clients | Centralize child/account reads for a session. Add foreground single-flight deduplication for content. Convert activity logging to one authenticated write/RPC. Bulk-fetch all-child achievements. Record content cache hit/source, request count, sync failure, and queue-depth metrics. Establish backup and restore procedures. |
| Before 10,000 registered | Roughly 150-500 peak active clients | Replace dashboard per-child reads with a bounded bulk query or owner-checked aggregate RPC. Review live query plans and database advisors. Establish a repeatable traffic test for content-open, completion/sync, parent dashboard, and activity-history journeys. Define activity retention and archive rules. Confirm the selected Supabase plan's database, Auth, Realtime, storage, egress, and connection limits against observed peaks. |
| Before 50,000 registered | Roughly 500-2,000 peak active clients | Move large/versioned content and remote media to immutable bundle/object URLs when payload triggers are reached. Add server-side pagination/cursors to growing histories. Limit streak hydration to the active epoch and recent days. Introduce daily/weekly parent aggregates if raw history queries exceed latency targets. Process retryable background work in bounded batches. |
| Before 250,000 registered | Roughly 2,000-10,000 peak active clients | Separate operational records from analytics/reporting workloads. Evaluate activity table partitioning or archival using measured row counts and query plans. Review read scaling, connection pooling, asynchronous ingestion, regional latency, disaster recovery, and cost with the current Supabase capabilities. Do not add replicas or partitions without evidence that they solve the measured bottleneck. |

Peak concurrency can vary by an order of magnitude for the same registered-user
count. If a school or scheduled lesson causes synchronized starts, use the next
stage's requirements even when the account count is lower.

## Immediate Work Before 10,000 Users

### 1. Make content cache-first per session

The repository already supports last-known-good, exact-language caching and a
single background refresh per language. The screens currently opt out of its
fast path by passing `forceRefresh: true`:

- `components/child/AfricanThemeGameInterface.tsx`
- `components/games/LearningGameComponent.tsx`
- `components/games/WordGameComponent.tsx`
- `components/games/CountingGameComponent.tsx`
- `components/games/CardsMatchingComponent.tsx`
- `components/games/PuzzleGameComponent.tsx`
- `components/coloring/ColoringGallery.tsx`
- `app/child/stories/[storyId].tsx`

Load a valid cache immediately and allow one revalidation per language when the
app/session becomes active. A manual retry may still force the network. Add a
foreground in-flight promise map so simultaneous mounts cannot issue duplicate
full-bundle reads.

Targets:

- No more than one full content refresh per language during an ordinary active
  session.
- At least 90% cache-served content opens after the first successful load on a
  device.
- Split a language bundle when its transferred JSON exceeds 500 KiB or when a
  normal screen needs less than 25% of the downloaded payload.

At larger content scale, publish a small current-version manifest and immutable
per-language or per-content-type bundles. Do not normalize every nested lesson
or page into database rows merely to chase scale; the existing atomic bundle
model avoids partial publication and excessive round trips.

### 2. Remove global activity Realtime fan-out

The current channel listens to `event: '*'` for the whole `activities` table.
The preferred order is:

1. Decide whether this screen needs Realtime at all. A focus refresh plus local
   cache invalidation may be sufficient.
2. If Realtime remains, subscribe only to rows owned by the current parent or
   to explicit child filters, and verify RLS applies to delivered changes.
3. Coalesce bursts into one refresh and request only the changed/bounded slice.
4. Never let one unrelated activity event force every connected parent to
   refetch.

This must be done before public beta because it is both capacity-sensitive and
security-sensitive.

### 3. Reduce request multiplication

Current family accounts usually have few children, so the existing patterns are
not immediate database failures. They should still be removed before the
10,000-account milestone:

- `saveActivity` should not select the child's name before every insert. Use a
  single owner-checked RPC/write, or format the current child name only when the
  parent reads the activity.
- Parent dashboard activity summaries should be returned in one bounded query
  or RPC for all owned children.
- All-child achievements should use a single `.in("child_id", childIds)` read
  rather than a sequential request per child.
- Select only required columns instead of `*` on growing tables.
- Reuse one session/account/children repository instead of refetching the same
  child list independently on several screens.

Any view introduced for aggregates must preserve caller RLS, for example with
an appropriate security-invoker design. Any privileged RPC must perform its own
authenticated ownership checks and have explicit execution grants.

### 4. Preserve the local-first progress design

The current progress architecture is a strength:

- Snapshot identities are unique and indexed.
- Dirty queue identities are deduplicated.
- Ordinary updates are debounced.
- Activity and stage upserts are batched.
- Hydration is child/language/activity scoped and has a cooldown.

Keep those properties. Add chunking only if a recovered offline queue exceeds
100 rows, and alert when the p95 pending queue is greater than 10 or any queue
remains dirty for more than 24 hours. Review large JSON payloads if a single
progress row exceeds 32 KiB.

When optimizing progress RLS, benchmark policies and prefer a cached scalar
authorization expression such as `(SELECT auth.uid())` where appropriate. Do
not weaken the child-ownership predicate.

### 5. Bound historical data

`activities` is operational parent-visible history, not the analytics system.
Keep recent operational history bounded and define how long raw rows are needed
for the product, privacy policy, support, and account deletion.

Planning triggers:

- At 1 million activity rows, record table/index size and inspect the parent
  history query plan.
- At 5 million rows, implement or confirm an archive/retention job if only
  recent history is a product requirement.
- Consider partitioning only when measured query or maintenance behavior
  remains poor after correct indexes, pagination, and retention.
- When a child has more than 400 streak-day rows or more than 100 KiB of streak
  hydration data, load the current epoch and a recent window instead of all
  history.

Analytics events, if added, must use the separate privacy-reviewed design in
`docs/features/analytics.md`; do not turn `activities.details` into an
unrestricted analytics payload.

### 6. Harden production operations

Before growth, the service must be reproducible and observable:

- Restore the missing base-schema migration so a new environment can be built
  from version control.
- Enable RLS and explicit grants on every Data API-exposed table, including the
  current activity/achievement/language gaps reported in
  `docs/development/database.md`.
- Establish automated backups appropriate to the selected plan and periodically
  verify restoration into a disposable environment.
- Monitor database CPU, memory, disk, connections, slow queries, API latency,
  errors, Realtime connections, Auth failures, egress, and storage growth.
- Add privacy-safe client crash/ANR and handled-error visibility before public
  launch.
- Keep account deletion finalization scheduled. Its current bounded claim model
  (`FOR UPDATE SKIP LOCKED`, default 25, maximum 100) is suitable; increase
  invocation frequency before increasing batch size.

Start a capacity review when a primary resource is above 60% during repeated
peaks. Treat sustained usage above 80%, exhausted connections, rising error
rates, or rapidly increasing p95 latency as an immediate incident rather than
waiting for the next registered-user milestone.

## Content Seeds and Revisions at Scale

A content replacement remains constant-cost as the user base grows:

1. The database transaction changes shared `content_items` rows.
2. It does not scan or rewrite child progress.
3. Devices retrieve the release when they next perform an allowed refresh.
4. Each client compares its saved progress revision with the active payload.

There are two different rollout effects:

- A cache/content revision changes what all active clients download.
- A progress revision changes whether saved progress is considered compatible.

Separate these values in the generator before routine production releases.
Keep per-content-type progress revisions unchanged for copy, image, ordering,
or lock corrections. Increment only the affected revision for an intentionally
incompatible gameplay/curriculum replacement.

Do not use the generated destructive development seed as the normal production
publishing mechanism. Use a reviewed, transactional migration or trusted
publishing path that upserts the intended release, supports rollback, and does
not include placeholder media. Avoid releasing immediately before an expected
traffic peak. A broad progress revision change should be treated as a product
migration because it changes the experience of every affected learner even
though it does not create a mass database update.

## Capacity Metrics and Initial Targets

These are starting operational targets. Replace them with measured baselines
after the first controlled cohort.

| Signal | Initial target or action trigger |
| --- | --- |
| Full content requests | At most one per language per ordinary active session; investigate any screen causing repeated reads. |
| Content cache hit | At least 90% after a device has one valid exact-language bundle. |
| Content payload | Review splitting above 500 KiB per language or below 25% useful-payload ratio for a normal screen. |
| API p95 latency | Investigate sustained reads above 500 ms and writes above 750 ms before increasing capacity blindly. |
| Progress sync | Less than 1% failed attempts; p95 queue below 10; no ordinary dirty row older than 24 hours. |
| Activity history | Inspect at 1 million rows; implement/confirm lifecycle controls by 5 million rows when history need is bounded. |
| Realtime | No event delivered/refetched for an unrelated parent. Track connected clients and refreshes caused per event. |
| Database resources | Review at repeated 60% peaks; act immediately on sustained 80%, connection exhaustion, or latency/error growth. |
| App assets | Optimize the current approximately 102 MiB raw source-asset baseline now; measure actual platform archive/install size, and review remote/versioned delivery before asset growth materially increases update abandonment. |
| Reliability | Track crash/ANR rate, content-unavailable rate, progress-sync failures, and database/API errors by app version. |

## Review Checklist at Each Milestone

At 1,000, 5,000, 10,000, 50,000, and 250,000 registered accounts:

1. Record DAU and peak concurrency rather than account count alone.
2. Measure requests per journey: app start, game open, completion, parent
   dashboard, activity history, achievements, and streak hydration.
3. Review slow queries, database advisors, indexes, connections, resource use,
   egress, Realtime clients, and table/index sizes.
4. Run the representative traffic model against a disposable environment with
   non-production child-safe fixture data.
5. Confirm RLS and grants still isolate every account under bulk queries,
   Realtime, views, and RPCs.
6. Confirm offline queues recover after a burst and do not duplicate progress
   or achievements.
7. Recalculate the next stage using observed peak behavior and the current
   Supabase plan/capabilities.

## Relevant Code and Documentation

- `content/contentRepository.ts`
- `scripts/build-luganda-stage-1-2-content.mjs`
- `supabase/seed.sql`
- `lib/progressRepository.ts`
- `lib/streakRepository.ts`
- `lib/utils.ts`
- `components/games/achievements/achievementManager.ts`
- `app/parent/index.tsx`
- `app/parent/activities.tsx`
- `app/parent/all-achievements.tsx`
- `components/common/CachedImage.tsx`
- `supabase/migrations/20260629000000_add_child_progress.sql`
- `supabase/migrations/20260714182326_database_backed_learning_content.sql`
- `supabase/migrations/20260718215448_add_child_learning_streaks.sql`
- `docs/development/database.md`
- `docs/development/progress-content-cache-audit.md`
- `docs/features/analytics.md`
