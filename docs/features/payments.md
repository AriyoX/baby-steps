# Payments And Subscriptions

**Updated:** 2026-07-28
**Status:** Product and architecture plan only. Nothing described here is implemented.

This is the current product recommendation and supersedes the older free/premium
feature matrix in `docs/subscription-locking-analysis.md`. That document remains
useful for its store and entitlement research, but it proposed keeping all
standalone games free.

## Recommended Direction

Launch one family subscription, tentatively called **Baby Steps Premium**, with
monthly and annual billing options. The entitlement belongs to the signed-in
parent account and covers the family, rather than being purchased separately
for each child.

The free experience should remain a useful, coherent sample:

- one active child profile;
- Learning Hub Stage 1;
- the first three ordered levels in each genuinely level-based game;
- three permanently free starter stories;
- five Practice Hub sessions per child per day when that hub exists;
- a small permanent set of coloring pages and basic avatars;
- all safety, privacy, accessibility, purchase-management, and basic progress
  features.

Premium should add depth rather than remove basic safety or erase work:

- up to five active child profiles;
- all reviewed Learning Hub stages;
- all game levels and future game packs;
- the full reviewed story and coloring libraries;
- unlimited Practice Hub sessions, subject only to abuse protection;
- premium avatar and cosmetic collections when implemented;
- richer, evidence-honest parent insights and offline content packs in the
  future.

Do not launch the paywall until the premium catalog is large and reviewed
enough to make the recurring value obvious. A subscription wrapped around
placeholder content will harm trust.

## What Exists In The Codebase Today

There is currently no payment, subscription, entitlement, paywall, restore, or
premium-access implementation:

- `package.json` has no StoreKit, Google Play Billing, RevenueCat, `expo-iap`,
  advertising, or entitlement dependency.
- `app/parent/settings.tsx` has no billing or subscription destination.
- `app/child/parent-gate.tsx` provides an account-scoped parent PIN boundary
  that can later protect the transition from a child-facing lock to a
  parent-only paywall.
- Parent and child data are tied to the authenticated parent and active child
  through `UserContext`, `ChildContext`, and Supabase.
- Child creation currently inserts directly into `children` without a
  server-enforced profile limit.
- Published `content_items` are delivered as complete content bundles. The
  current access policy does not distinguish free from premium content, so a
  client-only lock would be a presentation rule rather than content
  protection.

The current Luganda catalog is not uniform:

| Area | Current shape | Subscription implication |
| --- | --- | --- |
| Word game | 50 ordered levels | The first three can map cleanly to free access. |
| Counting game | 4 stages with 18 total levels | Free should mean Stage 1, Levels 1-3; the remaining levels are premium. |
| Legacy Learning game | 5 stages with 2 levels each | Flattening “first three” across stages would be confusing. Prefer retiring or repositioning this overlapping game; if retained, give every level a stable global order. |
| Card matching | One 47-item pool; each round draws 8 pairs | It has no real levels. Define curated, versioned decks/levels before applying the first-three rule. |
| Puzzles | 3 puzzle definitions, selected randomly | The three current puzzles can become the three permanent free levels; future puzzles can be premium. |
| Learning Hub | 5 stages; Stage 5 is a placeholder Practice Mix | Stage 1 is the proposed free curriculum unit. Subscription access must remain separate from sequential progress locks. |
| Stories | 8 database-backed stories | Keep the first three stable starter stories free and mark the remaining reviewed stories premium. |
| Coloring | A route-backed collection with local progress | Keep a small starter set free and sell access to additional reviewed packs through Premium. |
| Child profiles | Any number can currently be inserted | Enforce one free active profile and up to five premium active profiles on the server. |

“First three levels” must mean the first three by a stable, explicit
`level_order`, not array position, a random selection, or a title. Reordering
published content must not accidentally move a previously free level behind
the paywall.

## Free And Premium Access Matrix

| Capability | Free | Baby Steps Premium |
| --- | --- | --- |
| Child profiles | 1 active child | Up to 5 active children |
| Learning Hub | All of Stage 1 | All reviewed stages |
| Sequential curriculum progression | Still required inside accessible content | Still required; payment does not skip learning prerequisites |
| Level-based games | First 3 ordered levels per game | All levels |
| Card matching | First 3 curated starter decks/levels after the content model is added | All reviewed decks |
| Puzzles | Current 3 puzzles | Current 3 plus future puzzle packs |
| Stories | First 3 permanently designated starter stories | Full reviewed story library |
| Coloring | 3 starter pages | Full reviewed page/pack library |
| Future Practice Hub | 5 sessions per child per local day | Unlimited sessions |
| Progress and earned achievements | Always retained and visible | Same history plus future richer insights |
| Avatars | Basic inclusive starter set | Extra cosmetic collections |
| Audio, accessibility, parent PIN, privacy, deletion, help | Always available | Always available |
| Restore and manage subscription | Always available in parent mode | Always available in parent mode |

The exact three free stories and coloring pages should be selected for quality,
variety, and cultural importance, then assigned a permanent access tier. Do not
rotate the free catalog daily: children benefit from rereading, and changing
access unexpectedly feels like something was taken away.

## Access Rules

Use separate access reasons so the UI and backend never confuse pedagogy with
payment:

- `available`: the child may open the content;
- `progress_locked`: complete an earlier lesson or stage first;
- `subscription_locked`: a parent subscription is required;
- `coming_soon`: content is not ready;
- `daily_limit_reached`: the free Practice Hub allowance is exhausted;
- `unsupported_language`: the selected language does not have this content.

For example, a premium Stage 3 can be both covered by the subscription and
still progress-locked until Stage 2 is complete. Buying Premium should unlock
the catalog, not falsely mark learning as completed.

Child-facing locks should be calm and neutral. A child can see that more
activities exist, but should not see prices, trials, countdowns, purchase
buttons, sad characters, or messages implying that the child should persuade a
parent. A lock action should:

1. explain simply that a grown-up can help;
2. open the existing parent PIN gate;
3. return to a parent-only subscription screen;
4. show the store purchase sheet only after an explicit parent action.

## Future Practice Hub Brainstorm

The Practice Hub should be a short, adaptive review space, not another linear
curriculum path. It can reuse reviewed items from completed lessons and record
practice evidence separately from lesson completion.

Useful practice modes:

- **Daily Mix:** a 3-5 minute blend of listening, recognition, matching, and
  recall;
- **Needs Another Try:** items the child has missed or needed hints for;
- **Quick Listening:** hear a word and choose its meaning or picture;
- **Story Recall:** gentle questions from stories the child has read;
- **Culture Cards:** small object, place, greeting, and tradition reviews;
- **Parent Picks:** a parent chooses a small focus set for the next session;
- **Confidence Review:** familiar items scheduled over time using simple
  spaced repetition.

### Daily limit semantics

For a free child, allow five newly started practice sessions per calendar day:

- count per child, not per parent account or device;
- use a server-owned family timezone, chosen in parent settings, rather than
  trusting every device clock;
- create a practice session with an idempotency key and consume one allowance
  when the first question is shown;
- let an interrupted session resume without consuming another allowance;
- do not count previews, loading failures, or sessions that never display a
  playable item;
- show the remaining allowance gently before a session starts;
- when the fifth session is used, keep lessons, stories, and free games
  available—do not block the whole app;
- reset at the next local midnight and handle timezone changes with a short
  anti-abuse cooldown;
- never sell consumable practice tokens to children.

The server should decide whether a session can start and return the remaining
count. A local counter alone would reset on reinstall, disagree across devices,
and be easy to bypass.

Practice results should not be called “mastery” unless the assessment model
supports that claim. Useful parent language is “practised,” “completed,”
“correct on this attempt,” and “may need another try.”

## Child Profile Limit

The first active child profile is free. A parent attempting to create a second
active profile should encounter the paywall before entering the multi-step
child setup flow, with the limit checked again by a server function at final
creation to prevent bypasses and race conditions.

Premium should initially support five active children. This is clearer and
safer than promising unlimited profiles, while covering normal household use.
Archived/deleted profiles should not consume a slot.

If Premium expires:

- never delete, merge, or reset any child profile or progress;
- ask the parent to select one profile as the currently active free profile;
- keep all profiles and their history visible to the parent;
- pause child-mode entry for the other profiles until Premium returns or the
  parent changes the selected free profile;
- always allow export, privacy controls, and deletion for every profile;
- restore all paused profiles immediately when entitlement returns.

The exact profile-switch policy should be tested with families before adding a
cooldown. A harsh cooldown may prevent legitimate shared-device use, while
unlimited rapid switching weakens the intended one-profile plan boundary.

## Stories, Coloring, Avatars, And Other Future Benefits

Good premium benefits are additive, understandable, and do not affect child
safety:

- new reviewed story collections, read-aloud audio, and language-specific
  editions;
- themed coloring packs;
- additional avatar hair, clothing, mobility aids, cultural outfits, and
  background collections;
- offline downloads of premium lesson/audio packs;
- parent-created practice playlists;
- longer-term progress trends and printable family activity suggestions;
- new languages only when each has enough reviewed content to justify access;
- seasonal content that remains available after the season if a child has
  started it.

Keep at least one diverse, good-quality avatar set free. Do not monetize skin
tone, disability representation, essential identity options, accessibility
features, audio needed to complete a lesson, basic progress history, streak
settings, or privacy controls. Avoid coins, loot boxes, chance-based rewards,
and child-facing upsells.

## Product And Store Shape

Start with one entitlement and two billing periods:

- entitlement: `baby_steps_premium`;
- monthly auto-renewing subscription;
- annual auto-renewing subscription with the same benefits;
- no weekly plan, consumable lesson coins, or multiple premium tiers at launch.

Use store-localized prices rather than hardcoded price text. Pricing, annual
discount, and any trial should be decided after affordability research with the
families and regions Baby Steps serves. A trial should not be the first growth
experiment; clear free value and a simple monthly/annual choice are easier to
understand.

Digital curriculum sold in the iOS and Play-distributed Android apps should use
Apple In-App Purchase and Google Play Billing. Avoid an external checkout link
in the initial mobile release because storefront and regional rules change and
add avoidable complexity.

Every parent-only paywall should include:

- a concrete free-versus-Premium comparison;
- live localized price and billing period from the store;
- automatic-renewal wording;
- trial length and post-trial price, if a trial exists;
- clear Subscribe, Restore Purchases, and Manage Subscription actions;
- Terms and Privacy Policy links;
- a visible close action that returns to the free experience;
- no preselected consent checkbox or misleading “continue” button.

## Recommended Technical Plan

### 1. Central access service

Create one typed access-decision boundary rather than scattering
`isPremium` checks through screens. It should accept the parent entitlement,
child, content identity, progression, and daily allowance, then return an
access reason. Routes must recheck access instead of trusting only card
visibility.

Suggested feature keys:

- `learning_stage`;
- `game_level`;
- `story`;
- `coloring_pack`;
- `practice_session`;
- `child_profile_slot`;
- `avatar_pack`;
- `offline_pack`;
- `parent_insights`.

### 2. Stable catalog metadata

Add server-owned access metadata to published content:

- stable content/pack/level ID;
- stable order;
- `access_tier` such as `free` or `premium`;
- review/publish state;
- language and content version;
- optional feature key and pack ID.

Do not infer premium access solely from array index. Split large mixed payloads
or return an entitlement-filtered bundle. The current single content bundle and
public published-content read policy would otherwise send premium payloads to
free clients.

Premium media should eventually use private storage and short-lived signed
access. Bundled app assets cannot be strongly protected; the app can only hide
their routes.

### 3. Parent entitlement

Keep a backend-owned normalized entitlement record keyed to the authenticated
parent UUID. Store only the minimum fields needed for access and support:

| Field | Purpose |
| --- | --- |
| `parent_id` | Owner of the family entitlement |
| `entitlement_key` | `baby_steps_premium` |
| `provider` | App Store or Play Store |
| `product_id` / base plan | Store product that produced access |
| `status` | Active, trial, grace, pending, hold, expired, or revoked |
| `current_period_ends_at` | Verified access boundary |
| `grace_ends_at` | Optional verified grace boundary |
| `will_renew` | Informational cancellation state |
| `environment` | Sandbox/test/production separation |
| `provider_reference` | Minimal reconciliation reference |
| `updated_at` | Last verified lifecycle update |

Only trusted webhooks/server functions should write entitlement state. Never
authorize Premium using client-writable user metadata, an email address, a
child ID, an advertising ID, or an on-device boolean.

### 4. Purchase provider

For this Expo/Supabase-sized project, RevenueCat is the lower-maintenance
starting option if its SDK and data practices pass a child-privacy review.
Initialize purchase functionality in authenticated parent mode with the
Supabase parent UUID as a non-guessable app user ID. Do not send child names,
ages, profile IDs, progress, or advertising identifiers to the purchase
provider.

Direct store integration is possible, but then Baby Steps owns receipt/token
verification, transaction acknowledgement, App Store server notifications,
Play real-time developer notifications, renewal reconciliation, restore and
account-transfer behavior.

### 5. Server-enforced family and practice limits

Use atomic server functions for:

- `can_create_child_profile` / `create_child_profile`;
- `start_practice_session`;
- `get_accessible_content_manifest`;
- `get_parent_entitlement_snapshot`.

These functions should enforce ownership, entitlement, idempotency, profile
count, daily allowance, and content tier in one transaction where applicable.
Client checks remain useful for responsive UI, but are not authorization.

### 6. Offline behavior

Cache a signed/versioned entitlement snapshot and content manifest. A
previously verified Premium family may keep offline access until the verified
period end plus a short documented offline grace period. After that, ask the
parent to reconnect; never silently erase downloaded progress.

Free bundled content should continue working offline. Premium downloads should
activate atomically only after their manifest and required assets validate.

## Potential Development Blueprint

This section is a possible implementation shape, not a commitment to exact
filenames or a database migration. Confirm current Expo, store, RevenueCat, and
Supabase documentation again when development begins.

### Proposed application boundaries

Keep billing, entitlement, and feature-access concerns separate:

```text
Store / RevenueCat
  -> verified provider webhook
  -> server-owned parent entitlement
  -> access snapshot
  -> central access-policy functions
  -> cards, routes, profile creation, and practice-session enforcement
```

The purchase provider answers “what did the store verify?” The Baby Steps
access layer answers “what may this parent or child do?” UI components should
not talk directly to the purchase SDK to decide access.

Potential files:

```text
lib/subscription/subscriptionTypes.ts
lib/subscription/subscriptionProducts.ts
lib/subscription/entitlementRepository.ts
lib/subscription/accessPolicy.ts
lib/subscription/entitlementCache.ts
lib/subscription/purchaseProvider.ts
hooks/useParentEntitlement.ts
components/subscription/SubscriptionLock.tsx
components/subscription/SubscriptionSummary.tsx
app/parent/subscription/index.tsx
app/parent/subscription/manage.tsx
supabase/functions/subscription-webhook/
```

`purchaseProvider.ts` should define a small Baby Steps-owned interface such as
load products, purchase, restore, get customer state, and open store management.
The rest of the app depends on that interface rather than importing a vendor
SDK throughout the codebase. This makes sandbox testing and a future provider
change less disruptive.

The purchase SDK should be initialized from the authenticated parent
subscription surface, not from the root child layout. Child mode should consume
only the minimal Baby Steps access snapshot it needs.

### Access snapshot

Return one normalized, versioned snapshot for the signed-in parent:

```ts
type AccessSnapshot = {
  parentId: string
  plan: "free" | "premium"
  status: "free" | "trial" | "active" | "grace" | "expired" | "revoked"
  premiumUntil?: string
  offlineValidUntil?: string
  maxActiveChildren: number
  freeActiveChildId?: string
  dailyPracticeLimit: number | null
  catalogVersion: string
  snapshotVersion: number
}
```

`dailyPracticeLimit: null` can mean no product limit for Premium, while server
abuse protection remains possible. Do not place every accessible content ID in
the entitlement row; calculate content access from the snapshot and versioned
catalog metadata.

The snapshot should be:

- fetched after authentication and when parent mode regains focus;
- refreshed after purchase, restore, sign-in, sign-out, and account switch;
- cached per parent UUID, never globally across accounts;
- invalidated when its version, account, verified expiry, or catalog version
  changes;
- unavailable to a child until the active child belongs to the same parent;
- treated as a UI/offline optimization, not permission to bypass server
  enforcement.

### Suggested database responsibilities

A later schema may need these concepts:

| Concept | Visibility and writer |
| --- | --- |
| `subscription_entitlements` | Parent may select only their row; verified server process is the only writer |
| `subscription_events` | Private webhook idempotency/audit data; no client access |
| `content_access_rules` | Published read-only catalog metadata; editorial/server writers |
| `parent_plan_settings` | Parent-owned free-profile selection and family timezone |
| `practice_sessions` | Parent may read sessions belonging to owned children; atomic server start creates rows |

Important constraints and indexes:

- unique entitlement per `(parent_id, entitlement_key)`;
- unique provider event per `(provider, environment, provider_event_id)`;
- unique practice idempotency key per child;
- indexed `parent_id` and `child_id` foreign keys;
- composite index for practice lookup by `(child_id, local_date, status)`;
- partial indexes for current active entitlements and non-deleted child
  profiles if those match real query patterns;
- check constraints for normalized status, provider, tier, positive limits, and
  valid date boundaries;
- timestamps stored as `timestamptz`, with the family-local date stored
  separately where daily allowance reporting needs it.

Avoid putting authorization in `auth.users.user_metadata`; it is client
editable and may be stale. Do not expose the Supabase service-role key to the
app.

Every table in an exposed schema must have RLS and explicit, least-privilege
grants. Parent selection policies should combine `TO authenticated` with an
ownership predicate such as `(select auth.uid()) = parent_id`. Index the
ownership columns used by those policies.

Provider event payloads may contain support-sensitive identifiers. Keep the raw
event or minimum reconciliation fields in a private/non-exposed boundary with
a defined retention period. The child client should never receive them.

### Atomic profile enforcement

The current `UserContext.addChildProfile` inserts directly into `children`.
That path would bypass a UI-only subscription limit, so development should
replace it with one atomic server-authorized creation operation.

Conceptual transaction:

1. obtain the authenticated parent UUID;
2. lock the relevant parent/plan row for the short transaction;
3. read the current verified plan and count active, non-deleted children;
4. reject with a stable `profile_limit_reached` result when the plan limit is
   exhausted;
5. validate language and profile fields;
6. insert the child owned by that parent;
7. initialize related preference rows;
8. commit and return the new child.

Do not perform a store or RevenueCat network request while holding a database
lock. Reconcile the entitlement before entering the transaction and keep the
transaction short.

If implemented as a privileged Postgres function, it must explicitly verify
`auth.uid()`, use an empty/fixed `search_path`, revoke default `PUBLIC` and
`anon` execution, grant only the intended authenticated call, and be covered by
cross-account tests. A server/Edge Function is another option, but it must
validate the caller's JWT and still perform the count-and-insert atomically.
Do not use `SECURITY DEFINER` merely to make an RLS error disappear.

During subscription expiry, the parent selects `free_active_child_id`. Enforce
that the selected child is active and owned by the parent. Profile deletion
should clear or safely replace that selection without deleting other progress.

### Atomic Practice Hub allowance

`start_practice_session` should be the only supported way to consume a daily
allowance:

1. validate the parent, child ownership, active profile access, and timezone;
2. return an existing session when the idempotency key was already used;
3. serialize concurrent starts for that child/day with a short database lock;
4. count already consumed free sessions for the family-local date;
5. reject the sixth free start with `daily_limit_reached`;
6. select only reviewed practice items the child is allowed to access;
7. insert the new session and return the session plus remaining allowance.

Use a unique constraint and an atomic insert/upsert rather than
select-then-insert logic. Two devices starting practice at the same time must
not both receive the fifth slot.

Completion updates should be separate from session creation. A session can be
`started`, `completed`, `abandoned`, or `invalidated`, but changing status
should not refund an allowance automatically; interrupted sessions are resumed
through the original idempotent session.

### Catalog and content delivery changes

The current database bundle can contain free and future premium levels in the
same JSON payload. RLS can filter rows, not individual JSON array elements.
Development therefore needs one of these transitions:

1. **Short-term filtered response:** a server function validates the caller's
   entitlement and returns a filtered, fully validated bundle.
2. **Preferred normalized catalog:** split content into stable stages, levels,
   stories, and packs with explicit access metadata, then assemble the allowed
   manifest server-side.

Before enforcing a paywall, remove or narrow any direct published-content
policy that still lets free clients select the complete premium payload.
Otherwise the lock protects navigation but not the content.

The client should receive locked-card metadata—ID, title, artwork, description,
and reason—without receiving the premium lesson/story body or private media
URL. Keep free bundled assets available offline. Premium media should use
private Storage paths and short-lived signed URLs or a versioned downloaded
pack.

### Central access-policy API

Build pure functions first so the access matrix can be tested without React or
the purchase SDK:

```ts
getGameLevelAccess(snapshot, gameKey, levelOrder)
getLearningStageAccess(snapshot, stage, progression)
getStoryAccess(snapshot, storyAccessTier)
getChildProfileAccess(snapshot, childId)
getPracticeAccess(snapshot, remainingAllowance)
```

Each returns a structured decision:

```ts
type AccessDecision =
  | { allowed: true }
  | {
      allowed: false
      reason:
        | "subscription_locked"
        | "progress_locked"
        | "daily_limit_reached"
        | "coming_soon"
        | "unsupported_language"
      parentAction?: "view_subscription" | "choose_free_profile"
    }
```

Do not return only a boolean. The caller needs the correct child-safe message,
parent action, analytics category, and accessibility state.

### Integration points in the current app

Likely changes, when implementation is authorized:

- `app/parent/_layout.tsx`: provide parent entitlement state and refresh it
  after returning from a store sheet;
- `app/parent/settings.tsx`: add Subscription and Restore/Manage entry points;
- `app/parent/add-child/*`: check the available slot before beginning setup and
  enforce it again at final server creation;
- `components/child/AfricanThemeGameInterface.tsx`: merge subscription
  decisions into menu/stage card models without hiding the free catalog;
- `lib/learningStageAccess.ts`: preserve the current progression algorithm and
  combine its result with a separate subscription decision;
- game components: enforce access at both selector and level-start boundaries;
- `app/child/stories/[storyId].tsx`: recheck story access by stable story ID
  before loading the full payload;
- coloring routes: check page/pack entitlement before loading premium assets;
- `app/child/parent-gate.tsx`: carry a validated parent-only return intent, not
  a raw arbitrary redirect;
- `context/ChildContext.tsx`: clear child-scoped cached access during parent
  account changes and active-child changes.

Deep links and direct route entry must pass the same access service. Disabled
cards alone are not enforcement.

### Webhook and purchase synchronization

Potential verified event flow:

```text
Parent buys through store
  -> purchase provider receives store result
  -> parent UI may show temporary "confirming" state
  -> authenticated webhook reaches a Supabase Edge Function
  -> signature/authenticity and environment are verified
  -> provider event ID is inserted idempotently
  -> normalized entitlement is atomically upserted
  -> access snapshot version increments
  -> app refreshes and unlocks Premium
```

Webhook handling requirements:

- reject unauthenticated or incorrectly signed requests;
- separate sandbox and production events;
- make event processing idempotent;
- tolerate duplicate and out-of-order delivery;
- derive current access from the newest verified store state rather than
  blindly trusting arrival order;
- retain enough audit information to investigate support cases;
- redact event bodies and secrets from normal logs;
- return quickly and move retryable processing out of long database
  transactions;
- provide reconciliation for missed webhooks.

The client-side store result may refresh the UI optimistically only as
“confirming.” Durable Premium access comes from verified entitlement state.
Define a bounded fallback for webhook delay, such as an authenticated server
reconciliation call, rather than permanently trusting a device receipt.

### UI states

The parent subscription surface needs explicit states:

- loading products;
- products unavailable;
- free;
- trial/active;
- cancelled but active through period end;
- grace/billing issue;
- pending store confirmation;
- expired;
- restore in progress;
- purchase failed/cancelled;
- offline with cached access;
- account mismatch requiring support.

Child UI should use only calm states such as “Ask a grown-up” or “More
activities are available with a grown-up,” then route through the parent gate.
Store error text and prices should remain in parent mode.

### Feature flags and safe rollout

Use server-controlled flags independently:

- `subscription_catalog_metadata_enabled`;
- `subscription_paywall_enabled`;
- `subscription_ui_locks_enabled`;
- `subscription_server_enforcement_enabled`;
- `profile_limit_enforcement_enabled`;
- `practice_limit_enforcement_enabled`.

Deploy schema and entitlement reads first with enforcement off. Compare access
decisions in logs, correct catalog metadata, then enable UI locks before server
enforcement. Every gate needs a kill switch that restores the free experience
without requiring a store release; a kill switch must never disable privacy,
deletion, restore, or subscription management.

### Development sequence

1. Write the complete access matrix as pure unit tests.
2. Add stable catalog IDs, orders, packs, and tiers without changing access.
3. Add entitlement/event schema, RLS, grants, constraints, and database tests.
4. Add webhook verification and sandbox reconciliation.
5. Add the provider abstraction and parent-only sandbox purchase client.
6. Add the versioned access snapshot and account-scoped offline cache.
7. Add parent Subscription, Restore, and Manage screens.
8. Add neutral child lock UI and direct-route enforcement behind flags.
9. Replace direct child insertion with atomic plan-aware creation.
10. Add the Practice Hub session/allowance service when that product exists.
11. Restrict premium payload/media delivery only after filtered delivery is
    proven.
12. Run store sandbox, database concurrency, offline, lifecycle, migration, and
    family usability testing before gradual production enforcement.

### Verification before each rollout stage

- run existing TypeScript, Jest, lint, and focused route/component tests;
- add migration tests following the repository's current
  `supabase/migrations/__tests__` pattern;
- test RLS as two different parents, `anon`, and a modified authenticated
  client;
- test duplicate and out-of-order provider events;
- test two simultaneous profile creations at the final free/Premium slot;
- test two simultaneous fifth Practice Hub starts;
- inspect indexes used by ownership, entitlement, and daily-limit queries;
- run Supabase database/security advisors before finalizing migrations;
- verify Data API grants separately from RLS;
- verify StoreKit sandbox/TestFlight and Play license-test purchases;
- inspect generated native builds for expected billing dependencies and no
  accidental ad or purchase SDK initialization in child mode;
- rehearse rollback with entitlement and enforcement kill switches.

## Subscription Lifecycle

| Store state | App behavior |
| --- | --- |
| Active paid period or trial | Premium is available to the parent and all eligible child profiles. |
| Auto-renew disabled, period still active | Keep Premium until verified expiry. |
| Billing retry / verified grace period | Keep Premium through the grace boundary. |
| Pending purchase | Show waiting-for-store confirmation; do not unlock yet. |
| Paused / account hold | Follow verified store state and preserve all data. |
| Expired | Return to free limits; pause rather than delete premium-only profile access. |
| Refunded or revoked | Revoke access after the verified event; preserve progress and history. |
| Offline | Honor the cached verified snapshot only within the documented offline window. |

Restore Purchases must be visible in Parent Settings and on the paywall.
Cross-platform access can follow the Baby Steps parent account, but subscription
management must send the parent to the store where the purchase originated.
Define and test how a restored purchase transfers between two Baby Steps parent
accounts before launch.

## Existing Families And Rollout

Before turning on locks:

1. assign stable access tiers and orders to every content item;
2. decide whether closed-beta families receive a time-limited courtesy
   entitlement;
3. preserve all existing progress under the same stable IDs;
4. warn parents before a profile becomes paused or content becomes premium;
5. never relabel placeholder/draft content as a paid benefit until editorial,
   language, audio, and cultural review is complete;
6. release entitlement reads and observability before enforcing locks;
7. add paywall and restore in parent mode;
8. enable one gate at a time with a server-side kill switch.

The three current puzzles should remain free. Existing story completions and
game progress must remain visible even if later content access changes.

## Should Baby Steps Put Ads In Parent Mode?

**Recommendation: do not add third-party ads, even only in parent mode, for the
first subscription release.** Parent-only placement is safer than child-facing
placement, but it does not make the app or an embedded ad SDK automatically
outside child-app rules.

Reasons:

- Baby Steps is clearly used by children and is likely subject to child/family
  store declarations.
- An ad SDK lives in the same app binary and may initialize, collect device
  data, or make requests before the parent boundary unless integration is
  extremely disciplined.
- Apple says Kids Category apps should not include third-party advertising
  except in limited cases, requires age-appropriate human-reviewed ads, and
  restricts third-party transmission of child/device data even in sections
  intended for adults.
- Google requires accurate mixed-audience declarations, age screening where
  applicable, approved Families ad SDK versions for child or unknown-age
  traffic, non-personalized treatment, and child-appropriate ad content and
  formats.
- Ads add privacy disclosures, consent and regional compliance, store review,
  creative-quality, inappropriate-ad reporting, and SDK supply-chain risk for
  relatively little early revenue.
- Ads in a parent dashboard can weaken the trust needed to sell a family
  learning subscription.

The safest commercial surface is a parent-only, first-party card explaining
Baby Steps Premium. It is predictable, contains no third-party tracking, and
supports the product directly.

If third-party parent-mode ads are reconsidered later, all of the following
should be treated as minimum gates, not a guarantee of compliance:

- complete a legal and store-policy review for every launch region;
- decide and accurately declare the app's Kids Category / target-audience
  status before selecting an SDK;
- require a real adult boundary before the ad area and never place ads in child
  navigation, notifications, gameplay, stories, rewards, or transition screens;
- do not initialize or call the ad SDK in child mode;
- use contextual, non-personalized ads with no AAID/IDFA, cross-app tracking,
  remarketing, profiling, or child/progress data;
- on Google Play, use an eligible Families self-certified SDK/version and the
  correct age-treatment and maximum-content-rating settings;
- on iOS Kids Category builds, ensure the provider documents human review of
  every creative for age appropriateness;
- prefer a small static banner in parent mode; do not use interstitial,
  rewarded, offerwall, auto-play, or deceptive formats;
- provide an in-app way for parents to report inappropriate ads;
- update the Privacy Policy, store privacy/data-safety answers, ads declaration,
  consent flow, and SDK inventory;
- remotely disable ads immediately if placement, data collection, or creative
  review fails.

### Android-only recommendation

If Baby Steps experiments with advertising, keep it on Android and keep the
iOS app ad-free. Premium should be ad-free on both platforms. The recommended
order is:

1. test manually sold, first-party sponsor cards in Android parent mode;
2. measure parent acceptance and sponsor renewals;
3. consider a third-party Android ad network only if direct sponsorship cannot
   support the operational effort.

A first-party sponsor card is preferable because Baby Steps controls the
creative, destination, frequency, and data flow. It does not require an
advertising SDK or advertising identifier.

Suggested source boundary:

```text
components/sponsorship/ParentSponsorCard.android.tsx
components/sponsorship/ParentSponsorCard.ios.tsx       -> renders nothing
```

The Android component should render only within an authenticated parent route
after the parent boundary has been satisfied. It must never appear in child
navigation, games, lessons, stories, coloring, notifications, the parent-gate
screen, or a purchase flow.

For first-party sponsorship:

- fetch only an approved campaign manifest from Baby Steps/Supabase;
- store campaign ID, creative, disclosure label, destination, schedule,
  platform, placement, and frequency cap;
- do not target using a child's name, age, language progress, mistakes,
  activity history, or profile;
- allow only broad contextual placement such as `parent_dashboard`;
- record aggregated parent-mode impressions and intentional taps;
- use a confirmation screen before opening an external destination;
- label every placement clearly as `Sponsored`;
- show no more than one sponsor card on a parent screen;
- give Premium families an ad-free experience;
- include campaign and placement kill switches that work without an app
  release.

If a third-party SDK is introduced later, `Platform.OS === "android"` is not
enough: that only hides the component. The native SDK should be excluded from
iOS autolinking, have no iOS app/ad-unit configuration, and be imported only
from Android-specific source. The generated iOS Pods and final binary should be
inspected to confirm the SDK is absent.

The Android SDK must not initialize at app launch. Initialize it only after an
adult has entered parent mode, after consent and remote-disable state are known.
Remove every ad view and stop requesting ads when child mode begins. Most ad
SDKs cannot be fully unloaded from memory, so the SDK must use restricted
settings from its first initialization:

- contextual/non-personalized treatment only;
- no AAID, cross-app tracking, profiling, or remarketing;
- no child or learning data;
- maximum content rating `G`;
- an eligible Families self-certified SDK/version;
- manually blocked sensitive categories;
- an in-app inappropriate-ad reporting path.

A parent PIN should not be treated as permission to serve personalized or
adult-content advertising. It creates a useful product boundary, but Baby Steps
must still make accurate Google Play audience, ads, privacy, and Data Safety
declarations.

### Direct sponsor pricing

Start with direct sponsorship rather than automated advertising. Sell one
clearly labelled Android parent-dashboard placement and price it from qualified
parent impressions, not child activity, downloads, or promises of clicks.

A **qualified parent impression** should count only when:

- the Android app is in authenticated parent mode;
- at least half of the sponsor card is visible for at least one continuous
  second;
- the impression has not already been counted for that campaign and parent
  session;
- it complies with the campaign frequency cap.

Keep reports aggregated. A sponsor receives campaign impressions, approximate
unique parent reach, intentional taps, tap-through rate, dates, and placement.
They must not receive parent identities, child information, device identifiers,
or individual activity logs.

#### Pricing formula

Use a transparent guaranteed-impression model:

```text
campaign price =
  max(minimum campaign fee,
      guaranteed qualified impressions / 1,000 x base CPM)
  x placement multiplier
  x exclusivity multiplier
  + optional creative fee
```

Recommended launch inputs for testing in Uganda:

| Input | Initial value |
| --- | --- |
| Base direct-sponsor CPM | UGX 25,000 |
| Minimum four-week campaign | UGX 250,000 |
| Parent dashboard placement multiplier | 1.0 |
| Category exclusivity multiplier | 1.5 |
| Three-month commitment discount | 10%, applied after other multipliers |
| Creative adaptation fee | UGX 100,000 once, waived if approved assets are supplied |

These are experimental launch rates, not a claim about a permanent market
price. Review them every quarter using fill rate, qualified reach, tap-through
rate, sponsor renewals, campaign-management time, and parent feedback.

Illustrative launch packages:

| Package | Deliverable | Price |
| --- | --- | --- |
| Starter | 10,000 qualified impressions, one approved creative, up to 4 weeks | UGX 250,000 |
| Partner | 25,000 qualified impressions, up to two approved creatives, up to 4 weeks | UGX 625,000 |
| Category Partner | 40,000 qualified impressions, one sponsor in its approved category, up to 4 weeks | UGX 1,500,000 |

Do not sell impression guarantees that the current active parent audience
cannot reasonably deliver. Before quoting, estimate:

```text
monthly available impressions =
  monthly active Android parent accounts
  x average qualified parent sessions per month
  x sponsor-card fill rate
```

Reserve at least 20% of forecast inventory for delivery variance. For example,
if the conservative forecast is 12,000 qualified impressions, sell no more than
9,600 guaranteed impressions during that period.

If Baby Steps misses a guarantee, extend the campaign for up to four additional
weeks. If it is still short, give the sponsor a proportional credit or refund;
do not substitute child-facing impressions. If the audience is too small for
impression guarantees, offer a clearly described **Founding Sponsor pilot** at
UGX 250,000 for four weeks with projected rather than guaranteed reach and a
post-campaign report.

Commercial rules:

- invoice smaller campaigns in full before launch; for campaigns above
  UGX 1,000,000, use 50% before launch and 50% at the midpoint;
- state whether VAT and withholding tax are included after advice from the
  business accountant;
- include one creative revision, with extra production quoted separately;
- never guarantee taps, purchases, enrolments, or learning outcomes;
- reject misleading claims and sponsors involving gambling, alcohol, tobacco,
  dating, adult content, weapons, political persuasion, predatory credit, or
  products inappropriate for a family-learning app;
- manually review the sponsor, creative, destination, redirects, and landing
  page before launch and periodically while live;
- let Baby Steps pause or remove unsafe creative immediately;
- use a short written insertion order covering dates, platform, placement,
  impression definition, cap, price, payment, reporting, make-good, brand
  safety, cancellation, and data restrictions.

Once three to five campaigns have completed, calculate the effective CPM,
renewal rate, and internal servicing cost. Raise the CPM when inventory
regularly sells out or sponsors renew readily; lower the package size rather
than heavily discounting the CPM when the audience is still growing.

Official references:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple child-safety design guidance](https://developer.apple.com/kids/)
- [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335)
- [Google Play target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159)
- [Google AdMob age-treatment guidance](https://support.google.com/admob/answer/6219315)
- [Expo autolinking documentation](https://docs.expo.dev/modules/autolinking/)

This is a product and engineering risk assessment, not legal advice.

## Delivery Phases

1. **Catalog readiness:** review paid content; add stable IDs, global orders,
   packs, and access tiers; normalize cards/puzzles into levels or packs.
2. **Access foundation:** central decision service, parent entitlement snapshot,
   server-enforced profile limit, filtered content manifest, and kill switches.
3. **Store setup:** permanent iOS bundle ID, one entitlement, monthly/annual
   products, localized metadata, privacy review, and provider configuration.
4. **Parent purchase UX:** subscription screen, live price, purchase, restore,
   manage, terms/privacy, and account-transfer support path.
5. **Child lock UX:** neutral badges, parent-gate routing, route-level rechecks,
   and no child-facing prices or commercial pressure.
6. **Practice Hub:** adaptive session model, five-per-child daily allowance,
   idempotent server start, resume, timezone behavior, and Premium unlimited
   access.
7. **Lifecycle and offline:** renewals, grace, hold, refund, revoke, cached
   snapshot, premium media downloads, expiry behavior, and profile pausing.
8. **Testing and staged rollout:** store sandboxes, internal/closed tracks,
   migration rehearsal, accessibility, family usability, observability, and
   gradual gate activation.

## Required Test Matrix

- free versus Premium access for every feature key;
- first three game levels, fourth-level lock, deep link, and reordered content;
- learning subscription locks versus sequential progress locks;
- first three stories/coloring pages and premium pack access;
- one-profile free creation, second-profile race, five-profile Premium cap,
  archive/delete, expiry selection, and renewal restoration;
- practice session start, abandon, resume, fifth/sixth session, midnight,
  timezone change, reinstall, offline, and two-device concurrency;
- purchase, cancel, renewal, trial, pending, grace, hold, refund, revoke,
  restore, family account switch, and cross-platform sign-in;
- offline entitlement expiry and atomic premium download failure;
- parent PIN boundaries, child-safe copy, accessibility, and no purchase sheet
  reachable directly from child mode;
- account deletion and minimum necessary transaction retention;
- server denial when a modified client bypasses a hidden/disabled UI control.

## Explicit Non-Changes

This document does not add an SDK, product ID, database table, policy, server
function, paywall, ad, analytics event, entitlement check, content lock, profile
limit, Practice Hub, avatar, or store configuration. It only records the
recommended product and implementation plan.
