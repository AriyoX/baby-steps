# Payments And Subscriptions

## Current Status

Planned only. No payment, subscription, purchase, entitlement, billing, paywall, or premium-access implementation exists in the current app code.

## Purpose

Payments may become relevant if Baby Steps sells premium digital content, subscriptions, story/game packs, parent dashboard upgrades, school plans, or content creator/admin features.

## User Flow

No payment user flow exists today.

Future consumer mobile flow would likely need:

1. Parent views a compliant paywall.
2. Parent purchases with Apple In-App Purchase or Google Play Billing.
3. Backend verifies the transaction.
4. Backend grants entitlements.
5. App uses server-owned entitlement state to unlock content.
6. Parent can restore purchases and view subscription status.

## Main Files Involved

Current planning context:

- `REFACTOR_REPORT.md`
- `VERIFICATION_REPORT.md`

No implementation files currently exist for payments.

## Key Components, Screens, And Functions

None implemented.

## Data And Content Used

No payment data is currently stored by the app.

Future payment work would need stable content IDs before premium access is introduced.

## State Management And Logic Notes

No client-side entitlement system exists. Do not implement payment verification only on-device.

## API Or Database Usage

None currently.

Future implementation likely needs backend-owned tables/entities for:

- products,
- plans,
- prices,
- purchases,
- subscriptions,
- transactions,
- platform receipts,
- entitlements,
- entitlement grants,
- users,
- schools/organizations if institution plans are in scope.

## Tests

No payment tests exist because payments are not implemented.

## Known Limitations Or Bugs

- No backend/API layer for receipt validation.
- No entitlement service.
- No store product configuration.
- No restore purchase flow.
- No subscription status UI.
- No purchase event analytics.

## Future MVP Improvements

- Decide whether payments are in MVP scope or post-MVP.
- Build identity, content IDs, and entitlement foundations before billing.
- Use Apple and Google platform billing for in-app digital content.
- Add backend verification and webhook/notification handling.
- Add tests for entitlement calculations and access control.

## Manual QA Checklist

No current payment QA applies.

Before future release with payments:

- [ ] Confirm products/subscriptions in App Store Connect.
- [ ] Confirm products/subscriptions in Google Play Console.
- [ ] Verify sandbox purchases on iOS.
- [ ] Verify test purchases on Android.
- [ ] Confirm backend receipt/purchase-token validation.
- [ ] Confirm restore purchases.
- [ ] Confirm cancellation, refund, grace-period, and expired-entitlement behavior.
