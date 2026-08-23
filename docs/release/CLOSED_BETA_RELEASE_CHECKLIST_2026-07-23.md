# Baby Steps closed-beta release checklist

**Readiness pass:** 2026-07-23

**Android application ID:** `com.babystepslearn.app`

**App scheme:** `babysteps`

This checklist separates repository work from actions that require an installed build, Supabase production authority, DNS/email administration, EAS credentials, or Google Play Console access. A checked repository item does not mean the corresponding external system is complete.

## Repository complete

- [x] Permanent Android package ID is set and regression-tested.
- [x] npm and `package-lock.json` are authoritative; CI uses `npm ci`.
- [x] `expo-system-ui`, `expo-secure-store`, and `expo-application` are installed at Expo SDK-compatible versions.
- [x] Child-facing YouTube, WebView, arbitrary-browser, and system Share surfaces are removed.
- [x] Unused WebView and sharing dependencies are removed from the manifest and lockfile.
- [x] Random/sample parent progress, internal diagnostics, and unavailable settings actions are removed.
- [x] Published content is filtered for exact language, valid media, supported mechanics, allowlisted routes, and real completion support.
- [x] Missing Runyankole (`nyn`) content produces an unavailable/empty state and never falls back to Luganda (`lg`).
- [x] Child-to-parent transitions use an account-scoped PIN in secure device storage with cooldown and authenticated setup/reset.
- [x] Account deletion requires current parent-password reauthentication.
- [x] Parent About shows runtime version/build, a Closed beta label, support feedback, and privacy-safe tester guidance.
- [x] Public Expo environment variable names are documented without server secrets.
- [x] Production console removal is configured without adding analytics or crash-reporting SDKs.
- [x] A database hardening migration and migration contract tests are present.
- [x] In-app privacy text reflects Save-only coloring behavior and no child-facing Share action.

## Must complete before distributing a closed-beta build

- [ ] Review, stage, approve, and apply `20260723100638_closed_beta_security_hardening.sql`; do not test family isolation with a service-role client.
- [ ] Re-run Supabase Security and Performance Advisors after migration and resolve or explicitly accept every remaining production finding.
- [ ] Run the two-parent cross-account isolation matrix in `CLOSED_BETA_SUPABASE_FOLLOW_UP_2026-07-23.md`.
- [ ] Prove the deletion finalizer secret is configured, the deployed function matches source, the single daily schedule runs, dry-run output is anonymized, simulated-expiry deletion succeeds, and failures alert an operator.
- [ ] Verify a restorable database backup and perform a restore drill in an isolated project.
- [ ] Configure custom SMTP, authenticate the sender domain, review branded templates/redirects/rate limits, and test delivery to Gmail plus another provider.
- [ ] Publish mobile-readable HTTPS pages for Privacy Policy, Terms of Service, account deletion, and support. Record the final URLs in Play Console and release notes.
- [ ] Decide and document whether legal acceptance requires a persisted policy version and timestamp. The current repository requires acknowledgement during signup but does not persist proof.
- [ ] Confirm the former Sunbird credential found in five historical Git revisions has been revoked. The current source and bundle path are disabled/credential-free; history rewriting, if required, needs separate owner approval and coordination.
- [ ] Verify `hello@babystepslearn.com` can both receive and send support mail; repository consistency is not delivery proof.
- [ ] Create a final 512×512 Play icon. The current configured source is 500×500 and is not the required Play asset.
- [ ] Create a final 1024×500 feature graphic without inventing product claims.
- [ ] Capture final-build phone and tablet screenshots with no personal data.
- [ ] Prepare reviewer credentials and precise steps for parent PIN setup, child mode, content availability, and account deletion.
- [ ] Complete Play Target Audience/Families, Data Safety, App Access, ads, content rating, and account-deletion declarations from the verified data map.
- [ ] Build the production AAB through the approved release process, then inspect target API, merged permissions, 16 KB page compatibility, device catalogue, pre-launch report, crashes, ANRs, and policy warnings.

## Installed Android device regression

- [ ] Clean install, cold start, session restoration, and sign-out.
- [ ] Signup legal acknowledgement, confirmation callback, login, forgot/reset password, and grace-period reactivation.
- [ ] Add two children with different languages; switch repeatedly and verify content, cache, progress, streak, and reminders never cross.
- [ ] Set/change the parent PIN with the current password; test success, five failures, cooldown, restart, account switch, and direct parent-route attempts.
- [ ] Parent dashboard → child detail → child mode → parent gate → back navigation.
- [ ] Invalid/missing child-detail route shows a safe state and never another family's data.
- [ ] Complete every visible selectable activity once; repeat completion and restart to verify idempotency.
- [ ] Confirm Runyankole has an honest empty state unless reviewed `nyn` content is published.
- [ ] Toggle background music and in-app sounds independently; test missing audio, interruption, replay, route exit, and background/resume.
- [ ] Test streak disable, re-enable, reset, longest streak, epoch behavior, child independence, and language independence.
- [ ] Test reminder permission allow/deny/unavailable, one grouped reminder, disabled-child exclusion, timezone change, account switch, and sign-out cleanup.
- [ ] Exercise Coloring Save with allow, cancel/deny, permanently blocked, storage failure, and successful gallery write; verify there is no Share action.
- [ ] Verify parent portrait use, child landscape activities, small-phone/tablet safe areas, modal dismissal, hardware back, and orientation restoration.
- [ ] Request account deletion only after current-password reauthentication; verify sign-out and grace-period login/reactivation behavior.

## Release decision record

Before inviting testers, record:

- Git commit/tag used for the build.
- EAS build URL and build number.
- Applied Supabase migration list.
- Final legal/support URLs.
- Completed device matrix and Android versions.
- Play pre-launch findings and disposition.
- Named release owner and rollback owner.
