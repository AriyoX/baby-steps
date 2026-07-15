# Subscription locking analysis: iOS and Android

**Date:** 2026-07-15  
**Scope:** Product and architecture analysis only. No payment, entitlement, paywall, database, or store code is implemented by this document.

## Recommended decision

Use one parent-account entitlement, `baby_steps_premium`, sold as monthly and annual auto-renewing options on iOS and Android. Give the complete Stage 1 curriculum away free. Lock Stage 2 as one coherent curriculum unit, not as scattered individual lessons. Keep the current standalone games free and optional, as required by the curriculum guide; use them as a generous sampler rather than as compulsory subscription gates.

The child should never see a purchase sheet. A locked child-facing card should open the existing arithmetic parental gate, return to the parent area, and only then show the paywall. The entitlement belongs to the authenticated parent account and covers every child profile under that account. It must not be purchased or stored per child.

## Current repository state

The app is not ready to take payments yet:

- There is no StoreKit, Google Play Billing, RevenueCat, `expo-iap`, or other IAP dependency.
- The parent Settings menu already has a `Subscription / Payments` entry, but it resolves to placeholder copy.
- The app already has a child-to-parent arithmetic gate at `app/child/parent-gate.tsx`; this is the right interaction boundary for purchase access.
- There is no subscription or entitlement table, webhook endpoint, receipt verification, restore flow, paywall, or lock state.
- Every active/published `content_items` row is currently readable by `anon` and `authenticated`. A client-only lock would therefore be a UX gate, not server enforcement.
- Stage 1 and Stage 2 are currently stored in one Learning Hub JSON payload. True server-side Stage 2 withholding would require a new tier-aware delivery contract or separate stage payloads.
- Android currently uses `com.babysteps.babysteps_prototype`. The permanent package ID should be settled before Play products are created.
- The iOS configuration has no `bundleIdentifier`; one is required before App Store products can be configured.
- This is an Expo 54 app. Native IAP libraries require a development build; they do not work in Expo Go. [Expo's current IAP guide](https://docs.expo.dev/guides/in-app-purchases/) lists both RevenueCat's `react-native-purchases` and `expo-iap` as supported approaches.

## What should be locked

| Area | Free access | Premium access | Reason |
|---|---|---|---|
| Account, parent gate, privacy, deletion, help, restore/manage purchase | Always free | Not applicable | Safety, account control, cancellation, and restoration must never depend on an active subscription. |
| Learning Hub Stage 1 | All six connected lessons | Included, but no difference | A complete free unit demonstrates the teaching loop and remains useful without payment. |
| Learning Hub Stage 2 | Locked as one atomic unit after a visible preview card | All six connected lessons | Splitting exposure, recognition, story, and review across different paywalls would undermine the curriculum design. |
| Standalone Learning Game | Both Stage 1 and Stage 2 practice decks free | Same content | The guide explicitly treats games as optional, freely playable reinforcement rather than required mastery evidence. |
| Word Game | Current eight Stage 1–2 words free | Future larger early-reader decks may be premium | The current set is a sampler and must not be misrepresented as independent recall. |
| Counting Game | Current 1–5 stage free | Future reviewed number units may be premium | It is supplementary numeracy and should not block the language path. |
| Cards Matching and Puzzles | Current Stage 1–2 sets free | Future themed packs may be premium | Matching/motor/spatial completion is not language mastery. |
| Stories | Stage 1 greeting story free | Stage 2 home story and future extended library premium | Story access is a natural premium extension without making games compulsory. |
| Coloring | Greeting page free | Stage 2 family/home pages and future packs premium | Optional reinforcement can follow the unit entitlement without affecting curriculum completion. |
| Progress, completed work, achievements, and basic parent history | Always visible | Future evidence-honest reports may add premium views | Expiry must never erase or hide a child's historical work. Current completion is not mastery, so there is no basis for a paid “mastery report.” |
| Future Stage 3+ curriculum and reviewed offline media packs | Preview only | Premium | These are the clearest long-term subscription benefits once real reviewed content exists. |

Do not lock settings, accessibility, audio controls, privacy controls, account deletion, basic progress, purchase restoration, or subscription management. Do not use time pressure, streak loss, sad characters, or other emotionally manipulative tactics around a child-facing lock. Google explicitly prohibits manipulative or deceptive commercial tactics in child-targeted apps. [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)

## Store product shape

Use one entitlement and two billing periods:

- Entitlement: `baby_steps_premium`
- iOS subscription group: `Baby Steps Premium`
- iOS products: `baby_steps_premium_monthly_ios`, `baby_steps_premium_annual_ios`
- Android subscription: `baby_steps_premium_android`
- Android base plans: `monthly`, `annual`

Monthly and annual are the same access level, not different feature tiers. On iOS, put them at the same subscription-group level; on Android, use base plans under one subscription. This reduces the risk of a parent accidentally holding two overlapping subscriptions. Apple requires the benefits and price terms to be clear before purchase, and describes subscription groups/levels as the mechanism for upgrade and downgrade behavior. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [App Store Connect subscription setup](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)

Do not start with weekly billing, consumable “lesson coins,” multiple curriculum tiers, or a lifetime purchase. A monthly/annual pair is easier for parents to understand and simpler to restore and support. Pricing and trial length should be decided only after field testing and local affordability research.

## Purchase and entitlement flow

```text
Child taps a locked Stage 2 card
  -> arithmetic parental gate
  -> authenticated parent area
  -> paywall loads local App Store / Play price
  -> parent confirms through StoreKit / Google Play Billing
  -> purchase is verified by the store-backed service/backend
  -> parent entitlement is updated
  -> app refreshes entitlement
  -> all child profiles on that parent account unlock Stage 2
```

The app must use Apple In-App Purchase for iOS digital curriculum and Google Play Billing for the Play-distributed Android app. Google explicitly lists education subscriptions and paid digital app content as transactions that must use Play Billing unless a specific regional program exception applies. Avoid external checkout links in the initial release; the rules vary by storefront and program, and a kids product gains little from that complexity. [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Every paywall needs:

- store-localized product name and live localized price;
- exact benefits: Stage 2, premium stories/coloring, future curriculum updates, and all child profiles on the Baby Steps parent account;
- billing period and whether it renews automatically;
- trial terms, if a trial is eventually used;
- `Subscribe`, `Restore purchases`, and `Manage subscription` actions;
- Terms of Use and Privacy Policy links in the parent-only area;
- a clear close action that returns to the free experience.

## Recommended technical ownership

For this small Expo/Supabase codebase, RevenueCat is the lower-maintenance option, provided its child-directed privacy behavior is reviewed and disclosed. Expo currently points to `react-native-purchases` as an IAP option that wraps StoreKit and Google Play Billing and handles backend validation workflows. RevenueCat can use one non-guessable custom App User ID across platforms, which allows one parent's entitlement to follow the same account between iOS and Android. Use the Supabase `auth.users.id` UUID—not an email, child ID, advertising ID, or device ID—as that identifier. [Expo IAP guide](https://docs.expo.dev/guides/in-app-purchases/), [RevenueCat customer identity](https://www.revenuecat.com/docs/customers/identifying-customers)

The safer child-directed initialization pattern is:

1. Child mode reads a minimal entitlement snapshot from Baby Steps/Supabase and does not initialize marketing or analytics SDKs.
2. The purchase SDK is initialized only for the authenticated parent context, using the parent's UUID.
3. RevenueCat webhooks are authenticated and update a server-owned entitlement row.
4. The client may use SDK `CustomerInfo` for immediate UI refresh, but the Baby Steps backend record is the durable cross-device access source.

If the team chooses direct store integration instead, it must implement StoreKit transaction/receipt handling, App Store Server Notifications V2, Play purchase-token verification, acknowledgement, Play Real-time Developer Notifications, and lifecycle state reconciliation. Apple marks V1 server notifications deprecated; Google recommends backend verification and requires new subscriptions to be acknowledged, otherwise they may be refunded and revoked. [Apple App Store Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications), [Google subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [Google purchase verification guidance](https://developer.android.com/google/play/billing/developer-payload)

## Supabase entitlement model for a later implementation

No schema change is made now. A future design should add a server-written, parent-owned record conceptually like:

| Field | Purpose |
|---|---|
| `parent_id` | Supabase auth user UUID; primary ownership boundary |
| `entitlement_key` | `baby_steps_premium` |
| `provider` | `app_store` or `play_store` |
| `product_id` | Store product/base-plan identifier |
| `status` | normalized active/trial/grace/pending/hold/expired/revoked state |
| `current_period_ends_at` | access boundary from verified store state |
| `grace_ends_at` | optional store grace boundary |
| `will_renew` | informational cancellation state |
| `environment` | sandbox/test/production separation |
| `provider_customer_or_transaction_ref` | minimal support/reconciliation reference; never expose secrets to child clients |
| `updated_at` | last verified lifecycle event |

Only a trusted webhook/Edge Function role should insert or update entitlements. An authenticated parent may select only their own row. Do not use JWT `user_metadata` as subscription authorization: it is user-editable and can become stale. The UI should ask a security-invoker RPC or RLS-protected table for the current parent's entitlement.

The current `content_items` policy exposes all published content. A later implementation has two choices:

1. **Simple UX gate:** continue delivering both stages but block Stage 2 navigation unless entitled. This is easy and works offline, but it is not strong content protection.
2. **Tier-aware delivery:** add an entitlement/access tier and return only free Stage 1 to non-subscribers. Because the current Hub is one atomic row, this requires either separate stage bundles or a server function that returns an entitlement-filtered, fully validated bundle. Premium audio/images should then live in a private Storage bucket with short-lived signed URLs and a versioned offline cache.

Tier-aware delivery is the recommended production destination. Keep Stage 1 assets bundled for reliable offline onboarding. Download premium Stage 2 as an atomic unit only after entitlement and asset-manifest validation; never activate a half-downloaded lesson.

## Lifecycle behavior

| Store state | App access |
|---|---|
| Active paid period or free trial | Unlock premium. |
| Auto-renew turned off but period not ended | Keep premium until verified expiry. |
| Billing retry / store grace period | Keep premium through the verified grace boundary. |
| Pending purchase | Show “waiting for store confirmation”; do not unlock yet. |
| Paused / account hold | Lock premium according to the verified store state; keep progress. |
| Expired | Lock premium content; keep history, completions, and cached metadata. |
| Refunded or revoked | Revoke premium after the verified event; keep child progress. |
| Offline with a previously verified entitlement | Honor a signed/cached snapshot until its expiry plus a short documented offline grace period, then ask the parent to reconnect. |

Restore must be visible in Parent Settings and on the paywall. Apple says users expect restorable subscriptions to remain available across devices and requires a restore UI. A restored store purchase must attach to the authenticated Baby Steps parent account under an explicit transfer policy; RevenueCat notes that restore behavior can transfer an entitlement between different app user IDs, so this needs a deliberate support policy and test matrix. [Apple restore guidance](https://developer.apple.com/documentation/storekit/offering-completing-and-restoring-in-app-purchases), [RevenueCat restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior)

Cross-platform access should work through the Baby Steps parent account: an iOS purchase unlocks the same parent on Android and vice versa. Subscription management still sends the parent to the store where the purchase originated.

## Child safety and store compliance

Treat the app as child-directed even if the final store category decision has not been made.

- Apple Kids Category apps must put purchasing opportunities and external links behind a parental gate. The existing arithmetic gate is a useful base, but the paywall must remain entirely in parent mode. [Apple kids guidance](https://developer.apple.com/kids/)
- Apple also restricts transmitting personally identifiable or device information to third parties in kids apps. Any RevenueCat or other SDK data collection needs privacy review, parent disclosure/consent where required, and a minimal-data configuration. Do not send child names, ages, progress, or device advertising identifiers to the purchase provider. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google Families rules apply to IAP offers and other commercial content, prohibit deceptive or emotionally manipulative tactics, and impose strict child-data/SDK requirements. Avoid ads entirely; subscriptions are the cleaner model for this app. [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- Store billing authentication and Family Link/Ask to Buy are useful extra controls, but they do not replace the in-app parental gate.
- Store tax/payment-card handling should remain with Apple/Google. Baby Steps should store entitlement state and minimal transaction references, never card data.

## Delivery phases

1. Finalize the permanent iOS bundle ID and Android package ID.
2. Confirm whether the app will enter Apple's Kids Category and complete Google Play target-audience declarations.
3. Approve the free/premium matrix above with curriculum and family stakeholders.
4. Create the one entitlement and monthly/annual products in App Store Connect and Play Console.
5. Choose RevenueCat or direct store infrastructure after a child-privacy SDK review.
6. Design the parent entitlement table, webhook verification, RLS, restore/transfer policy, and account-deletion behavior.
7. Add parent-only paywall and Settings management; add child-facing lock badges that route through the parental gate.
8. Add tier-aware content/media delivery and offline entitlement handling.
9. Test purchase, restore, renewal, cancellation, grace, pending, hold, refund, revoke, offline expiry, account switch, account deletion, and iOS-to-Android access.
10. Use StoreKit sandbox/TestFlight and Google license testers/closed testing before production review.

## Explicit non-changes

This analysis does not install an IAP SDK, add store product IDs, create entitlement tables or policies, modify Supabase, add a paywall, lock any route, initialize RevenueCat, or change iOS/Android native configuration.
