## Bottom line

Baby Steps needs analytics, but the existing `activities` and progress tables should not be treated as the analytics system. They are operational learning records and local-first state.

For the public MVP, I recommend:

1. A small, first-party analytics event stream stored in Supabase.
2. Explicit parental opt-in, with analytics disabled by default.
3. No session replay, touch autocapture, advertising IDs, or child-identifying properties.
4. App Store Connect and Google Play Android Vitals for native crash reporting.
5. A small first-party handled-error feed for failures that store crash tools cannot see.
6. PostHog/Sentry only later, behind an abstraction, after the children’s-app classification and compliance position are confirmed.

No code or files were changed during this analysis.

## What the app has today

The repository correctly says production analytics and crash monitoring are not implemented: [README.md](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/README.md:26).

It does, however, already generate useful operational data:

- Supabase Auth accounts.
- Child profiles.
- Activity-history rows.
- Current activity/stage progress snapshots.
- Achievements.
- Local game progress and offline queues.
- Content-loading/cache behavior.
- Local notification preferences.

That lets you answer questions such as “How many children completed a story?” but not reliably:

- How far parents get through activation.
- Which activities are opened but abandoned.
- Why a content screen failed.
- Whether a notification led to a learning session.
- D1/D7 family retention.
- Which release caused a regression.
- Whether offline events were eventually delivered.

### Why `activities` is not enough

The existing activity model has several analytics-quality problems:

- `score` is free-form text and `details` is unstructured text: [schema.sql](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/schema.sql:16).
- `saveActivity` prefixes the free-form details with the child’s name, so it is unsuitable for exporting into an analytics system: [lib/utils.ts](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/lib/utils.ts:259).
- Duration is inconsistent. Word Game records milliseconds while Counting and other features record seconds.
- Some features write level and whole-game records, creating different meanings for “completion.”
- Activity writes are best-effort network operations. Offline progress can succeed locally while the activity row is lost.
- The normalized progress tables are current-state snapshots, not event history: [schema.sql](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/schema.sql:86).

The existing local-first completion boundary is an excellent place to add analytics because it separates successful gameplay from best-effort network work: [lib/completionReliability.ts](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/lib/completionReliability.ts:53).

## The important privacy constraint

Baby Steps is intended for children, even though parents own the accounts. That makes the analytics decision more restrictive than in an ordinary consumer app.

Apple says apps intended primarily for children generally should not contain third-party analytics; only limited implementations that avoid IDFA, child-identifying data, location, and identifiable device information may be permitted. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Google Play requires accurate disclosure of child-related data collection and careful selection and implementation of APIs and SDKs used in child-directed services. [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335)

COPPA applies to child-directed online services involving children under 13 and imposes requirements around collecting personal information. [FTC COPPA Rule](https://search.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)

This is product/engineering guidance, not a substitute for legal review.

## Recommended MVP architecture

```text
Explicit product boundaries
    ↓
Typed analytics wrapper
    ↓
Child-safe property allowlist
    ↓
Owner-scoped AsyncStorage queue
    ↓
Supabase product_events table
    ↓
Private aggregate queries/views
```

### 1. Typed analytics wrapper

Create a vendor-neutral interface such as:

```ts
analytics.capture("activity_completed", {
  activityType: "stories",
  contentId: "kintu",
  languageCode: "lg",
  completionScope: "story",
  durationSeconds: 420,
})
```

Suggested files:

- `lib/analytics/types.ts`
- `lib/analytics/client.ts`
- `lib/analytics/queue.ts`
- `lib/analytics/privacy.ts`
- `hooks/useAnalyticsScreen.ts`

The rest of the app should never call Supabase or a future vendor directly. That makes it possible to switch the storage destination without rewriting every feature.

### 2. Supabase table

Add a separate `product_events` table rather than expanding `activities`.

Recommended columns:

- `event_id`: client-generated UUID, unique for deduplication.
- `parent_id`: authenticated parent ID for RLS and account deletion.
- `event_name` and `event_version`.
- `occurred_at` and `received_at`.
- `session_id`.
- `activity_session_id`, when applicable.
- `screen_key`, using a controlled semantic name.
- `activity_type`, `content_id`, `language_code`.
- `result` and `reason_code`.
- `duration_seconds`.
- `platform`, `app_version`, and `build_number`.
- `network_state` or `was_offline`.

Do not use a general unrestricted `properties jsonb` object for the MVP. Fixed, constrained columns make accidental PII collection much harder.

The table should have:

- RLS enabled.
- Insert access only for authenticated users.
- A policy requiring `parent_id = auth.uid()`.
- No client `SELECT`, `UPDATE`, or `DELETE`.
- `ON DELETE CASCADE` from the parent account.
- Indexes on `(event_name, occurred_at)` and `(parent_id, occurred_at)`.
- Raw-data retention, for example 90 days.
- Private daily aggregates retained longer.

Supabase recommends RLS for tables in exposed schemas and ownership checks using `auth.uid()`. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

Before this migration, restore the missing base-schema migration noted in the roadmap; otherwise a clean database reset cannot verify the analytics migration chain: [docs/mvp-roadmap.md](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/docs/mvp-roadmap.md:19).

### 3. Offline event queue

Because the app is local-first, analytics should follow the same principle.

The queue should:

- Store only already-sanitized events.
- Scope queued events to the authenticated parent.
- Use a maximum size, such as 500 events.
- Batch uploads, perhaps 25 at a time.
- Retry on app foreground, successful authentication, connectivity restoration, and meaningful completion.
- Use `event_id` so retries cannot produce duplicates.
- Never block gameplay or completion UI.
- Keep one parent’s events from being flushed under another account.
- Clear pending analytics on opt-out and account deletion.

## MVP event specification

Keep the first version to roughly 10–12 event types.

| Area | MVP event | Instrumentation location |
|---|---|---|
| App usage | `session_started` | Root provider when an authenticated parent session becomes active |
| Navigation | `screen_viewed` | Root layout, using semantic allowlisted screen keys |
| Activation | `child_mode_started` | After active-child selection and successful navigation |
| Content health | `content_load_finished` | Shared content/menu loaders |
| Engagement | `activity_started` | When validated playable content actually opens |
| Learning outcome | `activity_completed` | Local-first completion boundary |
| Parent value | `parent_dashboard_viewed` | Semantic screen tracker |
| Parent value | `activity_history_viewed` | Semantic screen tracker |
| Notifications | `notification_preference_changed` | After the OS/scheduling result is known |
| Notifications | `notification_opened` | Existing notification-open observer |
| Reliability | `progress_sync_finished` | Shared progress repository, primarily failures or sampled successes |
| Reliability | `handled_error` | Sanitized content/auth/media/sync error boundaries |

Signup creation, child-profile creation, achievements, and account deletion should initially be derived from their authoritative database tables rather than duplicated as analytics events.

### Instrumentation points in this repository

- Root semantic screen tracking: [app/_layout.tsx](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/app/_layout.tsx:44). It already has `usePathname`.
- Child-mode activation: [child-detail/[id].tsx](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/app/parent/child-detail/%5Bid%5D.tsx:125).
- Games/Stories/Coloring selection: [AfricanThemeGameInterface.tsx](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/components/child/AfricanThemeGameInterface.tsx:350).
- Learning completion: `lib/learningProgressRepository.ts`.
- Story completion: `components/stories/GenericStoryRenderer.tsx`.
- Game completions: the five game components.
- Artwork save: only after `saveToLibraryAsync` succeeds in `ColoringGameScreen.tsx`.
- Progress reliability: `lib/progressRepository.ts`.
- Notification outcomes: `lib/notifications.ts` and the notification permission/settings screens.

Expo Router supports tracking from `usePathname`, but Baby Steps should map paths to names such as `story_reader` or `parent_child_detail` rather than transmitting resolved routes containing IDs. [Expo Router screen-tracking guidance](https://docs.expo.dev/router/reference/screen-tracking/)

### Never collect in product events

- Child name or child ID.
- Parent email.
- Child age, gender, reason, or assessment answers.
- Raw URLs, route parameters, or Supabase UUIDs.
- Quiz questions or selected wrong answers.
- Story text.
- Coloring strokes or saved images.
- Notification schedule identifiers.
- Raw exception messages, request bodies, or full stack traces.
- Advertising IDs, Android ID, IDFA, precise location, or contacts.
- Touch autocapture or session replay.

The parent account ID can remain internally on the Supabase row for ownership, deletion, and retention calculations, but should not be exported into normal reports.

## Metrics for the MVP

### North-star metric

Weekly Learning Families:

> Distinct parent accounts with at least one meaningful child learning completion during the last seven days.

Initially, a meaningful completion should include:

- Learning Hub lesson completion.
- Game level/stage completion.
- Story completion.
- Puzzle/card-game completion.

Keep Coloring as a creative-engagement metric rather than evidence of curriculum learning.

### Activation funnel

Measure:

1. Account exists.
2. At least one child profile created.
3. Child mode launched.
4. First activity started.
5. First meaningful activity completed.
6. Second learning day reached.

The main MVP activation result should be “first meaningful completion,” not simply “account created.”

### Retention

Track:

- D1 and D7 return after first meaningful completion.
- Families learning on two or more distinct days in a week.
- Time from child-profile creation to first completion.

### Content health

Track by activity type, stable content ID, language, and app version:

- Starts.
- Completions.
- Start-to-completion rate.
- Median completion duration.
- Content unavailable/error rate.
- Network versus cached content load.
- Repeat completion rate.

Do not emit an `activity_abandoned` event when a component unmounts. Derive likely abandonment from a start without a matching completion after an agreed window.

### Reliability guardrails

- Native crash/ANR rate.
- Content-load success rate.
- Progress-sync failure rate.
- Handled-error rate by stable error code.
- Analytics delivery delay and duplicate rate.
- Artwork save/share success rate.
- Authentication failure categories without emails or raw provider messages.

## Crash and error monitoring

For the public child-directed MVP:

- Use App Store Connect/Xcode crash reports on iOS. Apple provides sessions, active devices, crashes, and detailed crash diagnostics from opted-in devices. [App Store Connect metrics](https://developer.apple.com/help/app-store-connect-analytics/reference/metrics-definitions/)
- Use Google Play Android Vitals for crashes and ANRs. [Android Vitals](https://support.google.com/googleplay/android-developer/answer/9859174)
- Add a small first-party handled-error event containing only an operation key, stable reason code, app version, and outcome.

This will not be as convenient as Sentry, but it avoids putting another third-party SDK into the public children’s build.

If Sentry is later approved, the current Expo integration uses `@sentry/react-native`, its Expo plugin, Metro configuration, and EAS source-map upload. It should use `sendDefaultPii: false`, no session replay, conservative or disabled tracing, and aggressive `beforeSend` scrubbing. [Expo/Sentry integration](https://docs.expo.dev/guides/using-sentry/)

## Implementation and rollout phases

### Phase 0 — Measurement and privacy decisions

Before writing code:

- Decide whether the iOS app will be in the Kids Category.
- Confirm target ages in both stores.
- Approve the north-star and activation definitions.
- Approve the exact event/property dictionary.
- Decide parental consent wording and default state.
- Decide retention and deletion behavior.
- Update the privacy policy before enabling collection.

The current policy covers learning progress and reliability generally, but not a dedicated product-event stream, exact retention, parental opt-out, or an analytics processor: [PRIVACY_POLICY.md](C:/Users/HP/OneDrive/Documents/Desktop/Ariyo/baby-steps/PRIVACY_POLICY.md:27).

### Phase 1 — Foundations

- Repair the base migration chain.
- Add `product_events`, constraints, RLS, indexes, and deletion handling.
- Add the typed analytics wrapper and a no-op/debug sink.
- Add the offline owner-scoped queue.
- Add the parental analytics toggle.
- Add event/property allowlist tests.
- Keep production transmission disabled.

Exit condition: events are typed, sanitized, queued, deduplicated, and deletable.

### Phase 2 — Internal instrumentation

Instrument only:

- Semantic screens.
- Child-mode launch.
- Content loading.
- Activity start/completion.
- Notification outcomes.
- Progress-sync results.
- Sanitized errors.

Run scripted journeys with internal accounts:

- Online and offline.
- App background/restart.
- Multiple child profiles.
- Logout/login with another account.
- Duplicate completion callbacks.
- Language switching.
- Content cache fallback.
- Notification permission grant/deny.
- Coloring permission grant/deny.

Exit condition: expected events arrive once, with correct timestamps and no prohibited fields.

### Phase 3 — Initial testing cohort

Use a small invited cohort for approximately two weeks.

Review daily at first:

- Event volume versus manually completed scripts.
- Null or unknown properties.
- Duplicate event IDs.
- Offline delivery delay.
- Screen-name cardinality.
- Unexpected IDs or personal text.
- Differences between `activity_completed` events and operational progress.

Do not judge product conversion from the first few users. This phase is for validating the measurement system.

### Phase 4 — Closed MVP beta

For a larger closed beta:

- Enable only the approved P0 event set.
- Create five saved reports: activation, weekly learning families, retention, content health, and reliability.
- Review metrics weekly, not continuously.
- Set product targets only after obtaining a trustworthy baseline.
- Treat event-schema changes like database/API changes with versioning and review.

Suggested technical release gates:

- No known PII violations.
- No duplicate events for tested completion paths.
- Offline events eventually deliver after reconnection.
- Analytics failure never blocks a child activity.
- Crash and ANR monitoring is accessible for both stores.
- Content-load and sync error codes are actionable rather than free-form.

### Phase 5 — Public MVP

Ship the same small event dictionary. Avoid adding “just in case” events during release pressure.

Have a weekly operating rhythm:

1. Review crash/ANR regressions.
2. Review content availability and sync failures.
3. Review activation and first-completion drop-offs.
4. Review D1/D7 retention.
5. Choose one product question for the next iteration.

### Post-MVP

Add complexity only when a specific decision needs it:

- Lesson-mechanic events for improving curriculum interactions.
- Daily aggregate tables when raw queries become slow.
- A validated Edge Function ingestion endpoint if public clients begin polluting events.
- A BI dashboard if Supabase SQL reports become limiting.
- Experiments and feature flags only after event definitions are stable.
- PostHog only if platform/compliance review permits it.

PostHog’s React Native SDK supports Expo, offline queues, opt-out, reset-on-logout, and manual screen/event capture, so it is a viable future sink behind the wrapper. Autocapture, session replay, automatic GeoIP, and default opt-in should remain disabled for this app. [PostHog React Native documentation](https://posthog.com/docs/libraries/react-native)

The central principle is: measure meaningful family learning and app reliability, not every child interaction.