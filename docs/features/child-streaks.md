# Child Learning Streaks

## Status

Implemented for child learning activity, parent-managed child settings, and native
device reminders. The database change is
`20260718215448_add_child_learning_streaks.sql`; it was already applied before
the corrective pass documented here. Do not rerun or edit that migration to
change feature behavior.

## Purpose And Child-Safe Design

The streak is a gentle record of days on which a child completes one meaningful
learning activity. It is one child-wide, language-independent streak: changing
the child's learning language does not create or switch to a different streak.

The child sees a small flame in the child header and a brief, non-modal daily
celebration. The child cannot reset, disable, or configure the streak. Those
controls remain in the parent-managed child profile and use adult confirmation
for reset. Reminder copy is pressure-free, groups siblings into one device
notification, and hides child names by default.

## What Qualifies

One or more of these completed outcomes qualifies the child's local calendar
day:

- Completing a Learning Hub lesson.
- Completing the card-matching, counting, standalone learning, puzzle, or word
  game outcome wired to that game's persistence boundary.
- Completing a story flow.
- Intentionally saving completed coloring work to the gallery.

Each integration supplies a stable completion ID and completion timestamp.
Replaying the same persisted completion is deduplicated. Several different
qualifying completions on the same local date still count as one streak day,
although the first and last valid completion boundaries are retained.

Opening an activity, partial progress, page turns, individual answers, wrong
answers, coloring strokes, undo/redo, previews, and leaving coloring without a
successful intentional save do not qualify by themselves.

## Day And Streak Semantics

- A completed day is keyed by the child's local calendar date, not by a rolling
  24-hour window.
- A qualification today marks today complete and starts or extends the current
  streak.
- If the most recent completed day is yesterday, the current streak remains
  visible during today. It expires to zero when the most recent day is more than
  one local calendar day old.
- `current streak` counts contiguous dates in the active epoch only.
- `longest streak` is the best contiguous run retained across valid historical
  epochs, including history before a reset or disable.
- The parent profile shows today status and the last seven local dates.
- Future-dated records are not counted.

### Epochs, Reset, Disable, And Re-enable

An epoch is a half-open streak interval. Reset and disable close the current
epoch without deleting its history.

- Reset starts a clean epoch and sets the current streak to zero until another
  qualifying completion occurs.
- A same-day completion from before reset does not make the new epoch complete.
  The child can qualify again later on the same local date, without bridging the
  two epochs.
- Disable closes the active epoch, clears the current count and today status,
  hides the child header flame, and removes the child from reminder eligibility.
- Re-enable creates a clean epoch. It does not revive or bridge the closed
  epoch, but retained history can still contribute to the longest streak.
- `reset_at` is a monotonic semantic boundary used to reject stale transitions
  and completions from an older state.

The setting control stays visible while disabled so it can always be turned
back on. Rapid transitions are serialized. Parent preference changes attempt
an immediate server sync; an offline failure stays queued with an explicit
message, while a server rejection refreshes authoritative state.

## Timestamp And Timezone Handling

The client records the absolute completion timestamp together with the device's
IANA timezone and derives the local `YYYY-MM-DD` key from that pair. UTC is used
only as a defensive client fallback when a device timezone cannot be resolved.

The database stores atomic first-timestamp/timezone and
last-timestamp/timezone pairs. `upsert_child_streak_day` validates that each
accepted timestamp produces the supplied local date in its paired timezone and
falls inside the relevant epoch/reset boundary. Invalid IANA timezone values or
boundaries are rejected rather than silently reassigned to a date.

## Local-First State And Synchronization

Qualifying activity is written locally first so completion UI does not depend on
an immediate network round trip. The repository maintains child-scoped
preferences, epochs, days, a derived snapshot, completion receipts, celebrated
dates, and an account-scoped dirty queue.

Completion receipts make replaying a persisted activity idempotent. Dirty
operations are pushed through guarded application RPCs. Cross-device hydration
loads the server state, merges it with still-pending local transitions and days,
and republishes the snapshot. In-memory subscriptions update the child header,
celebration host, parent profile, and reminder calculation without creating
separate streak states.

Fresh UI hydration does not create an enabled preference merely because the
cache is empty. Until Supabase returns the child's preference, the parent sees
a retryable state and child mode hides the flame. A previously verified cached
preference remains available during a later network failure, so an offline
cache that says the child is disabled continues to hide the streak.

The snapshot hook is keyed to the requested child ID. When a parent switches
from Child A to Child B, it clears A's visible snapshot while B loads. Missing
local state, a signed-out session, or failed remote hydration produces a stable
loading or retryable error state rather than a fabricated preference.

### AsyncStorage Key Families

The child-scoped portion is `<encoded account id>:<encoded child id>`.

| Data | Key family |
| --- | --- |
| Preferences | `@BabySteps:ChildStreakPreferences:v2:<account>:<child>` |
| Epochs | `@BabySteps:StreakEpochs:v2:<account>:<child>` |
| Days | `@BabySteps:StreakDays:v2:<account>:<child>` |
| Derived snapshot | `@BabySteps:StreakSnapshot:v2:<account>:<child>` |
| Completion/celebration receipts | `@BabySteps:StreakCompletionReceipts:v1:<account>:<child>` |
| Dirty synchronization queue | `@BabySteps:StreakQueue:v2:<account>` |

## Parent And Child UI

The same `ChildStreakSection` is used in two explicit parent-facing modes:

- Dashboard child card -> `/parent/child-detail/[id]`.
- Settings -> Child Profiles ->
  `/parent/settings/child-profile-detail?childId=<child id>`.

The dashboard child profile uses summary mode: it shows the current/best streak,
today status, and seven-day history without mutation controls. The Settings
path is the canonical profile-management path and uses settings mode, adding
the enable switch, reminder participation, and reset. Both use the child ID in
the route being viewed and verify ownership/active status before rendering.

Settings loading leaves a disabled switch visible, and a load error keeps the
section visible with retry. When the streak is off, both preference rows remain
visible in Settings, with reminder participation disabled until the streak is
re-enabled. The profile summary instead explains that tracking is off and
directs the parent to child profile settings.

The compact child flame is rendered through `ChildHeaderStreak` in the shared
child header only for the active, matching, enabled child. The
`StreakCelebrationHost` lives inside the child Expo Router layout and the single
child streak provider. It announces only the first local qualification and
honors reduced-motion settings.

## Grouped Learning Reminders

Reminder scheduling is device-local. The parent enables the device schedule and
chooses its local time in Notifications settings; the default is 18:00. A child
is eligible only when the profile is active, the streak is enabled, and `Include
in learning reminders` is on.

The app schedules one account/device reminder, not one reminder per child. When
eligible children remain incomplete today, it uses one daily trigger. Copy is
generic by default; the parent must explicitly opt in before safe first names
are included. No push token, child phone number, email, or notification schedule
identifier is stored in Supabase.

If all eligible children are complete, the current daily reminder is replaced
with one congratulatory reminder for tomorrow. This is intentionally a one-shot
native date trigger: the operating system does not run the app's JavaScript at
midnight to calculate another day's eligibility. The app must next start or
return to the foreground to evaluate children and restore the appropriate
future schedule. Delivery also remains subject to OS permission, Focus/Do Not
Disturb, and battery scheduling.

See [Recurring Learning Notifications](notifications.md) for device-level
permission and schedule controls.

## Supabase Model And Security

The feature uses three public tables:

| Table | Purpose |
| --- | --- |
| `child_streak_preferences` | Per-child enabled state, reminder participation, active epoch, and reset boundary. |
| `child_streak_epochs` | Retained half-open reset/enable intervals. |
| `child_streak_days` | One qualified local date per child and epoch with timestamp/timezone boundaries. |

The five public application RPCs are:

1. `create_child_streak_state`
2. `set_child_streak_enabled`
3. `reset_child_streak`
4. `set_child_streak_reminder_participation`
5. `upsert_child_streak_day`

These functions are `SECURITY DEFINER`, use an empty `search_path`, require an
authenticated parent, and verify that the requested child is owned and not
archived. Execute is granted only to `authenticated`. Direct table writes are
revoked from app roles; the Expo app does not write streak tables directly.

RLS is enabled on all three tables. The authenticated parent can select only
rows for an owned, active child. Helper/trigger execution is not exposed to app
roles. New children receive an enabled default preference and epoch; the applied
migration initialized active existing children without inventing historical
completion days.

## Child And Account Lifecycle

Archiving an individual child retains streak history but makes it unavailable
through parent read policies, application RPCs, and reminder candidate queries.
Individual child deletion remains archive-only in the app.

The three streak tables reference `children` with `ON DELETE CASCADE`. A trusted
hard deletion, including final account deletion after its grace period, removes
the child's preferences, epochs, and days. Local account/child cleanup also
removes scoped streak cache data; server hard deletion is not attempted from the
child settings UI.

## Automated Coverage

Automated tests cover:

- Today/yesterday/expiry, longest streak, reset epochs, disable/re-enable, and
  same-day boundary calculations.
- Local-first persistence, receipt deduplication, queues, hydration,
  cross-device merging, RPC conflicts, and child isolation.
- Qualifying completion integration points and coloring-save qualification.
- Parent switch states, loading/error retention, mutation failure recovery, and
  rapid-tap serialization.
- Child header visibility and accessible/reduced-motion celebration wiring.
- Grouped notification eligibility, privacy copy, daily/all-complete triggers,
  permission handling, and durable cancellation.
- The real Expo Router root/dashboard/child-profile relationship, including the
  async root bootstrap state, and the Settings child profile route.
- Static migration security contracts and PostgreSQL assertions where a
  suitable disposable database is available.

## Device And Manual QA Still Required

Use the streak section in [the manual QA checklist](../qa/manual-qa-checklist.md).
Expo Go/native-device confirmation is still required for cold-start routing,
actual reminder delivery, foreground notification handling, OS permission
transitions, background/foreground schedule refresh, timezone travel, the
celebration animation, reduced motion, deep links, and hardware back behavior.

## Troubleshooting

### `Couldn't find a navigation context`

Expo Router owns the production `NavigationContainer`. Do not wrap the app in a
second container. Keep the root Expo Router `Stack` mounted while fonts/session
bootstrap, and mount navigation-dependent hosts only inside a route layout where
context is guaranteed. `StreakProvider` itself has no routing dependency and is
mounted once in the child layout; `StreakCelebrationHost` is inside that layout.
Tests for this issue must render the actual root/layout/route relationship, not
globally mock router hooks or add a test-only production-shaped container.

### `java.io.IOException: Failed to download remote update`

This repository does not configure `expo-updates`, an update URL, a runtime
version, or an EAS Update channel, so that Expo Go loader failure is separate
from streak persistence and RLS. Clear the Metro cache with `npx expo start
--clear`, free device/emulator storage, and clear or reinstall Expo Go. For a
physical device, also verify that the device can reach the development machine
on the same network or use Expo CLI's tunnel mode. A stale/failed Expo Go load
can keep the device from displaying the current JavaScript bundle, but it does
not create the deterministic root-layout navigation error.

### Streak controls are missing

Confirm the parent opened an owned, non-archived child through the dashboard
detail route or Settings -> Child Profiles. The shared section must remain
present while loading, failed, or disabled. If it shows an error, use `Try
again`; do not substitute the globally active child ID for the route's child ID.

## Main Files

- `context/StreakContext.tsx`
- `lib/streakDate.ts`
- `lib/streakRepository.ts`
- `components/parent/ChildStreakSection.tsx`
- `components/child/ChildHeaderStreak.tsx`
- `components/child/StreakCelebrationHost.tsx`
- `app/child/_layout.tsx`
- `app/parent/child-detail/[id].tsx`
- `app/parent/settings/child-profile-detail.tsx`
- `lib/notifications.ts`
- `supabase/migrations/20260718215448_add_child_learning_streaks.sql`
