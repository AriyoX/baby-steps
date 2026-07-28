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

Official references:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple child-safety design guidance](https://developer.apple.com/kids/)
- [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335)
- [Google AdMob age-treatment guidance](https://support.google.com/admob/answer/6219315)

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
