# Baby Steps Google Play Closed Beta Readiness Audit

**Audit date:** July 21, 2026  
**Scope:** Android closed testing on Google Play  
**Method:** Static repository/configuration review plus automated checks. The app was not launched or previewed, as requested.  
**Baseline:** This is a new audit. It uses `GOOGLE_PLAY_READINESS_AUDIT.md` from June 18, 2026 as historical context, but the findings below come from the current repository.

> This is a technical and store-readiness review, not legal advice. The final privacy, child-safety, and contractual wording should be approved by the person or organization publishing Baby Steps.

## 1. Executive decision

**Current decision: NO-GO for inviting closed-test users today.**

The app is much closer than it was in June. Automated quality checks pass, the prototype API credential was removed, signup now requires acceptance of the Terms and acknowledgement of the Privacy Policy, legal documents are available in the parent area, account deletion exists in the app, and EAS can produce a Play-compatible Android App Bundle.

Before the first tester rollout, close the P0 items in section 3. The largest risks are:

1. The permanent Android package ID still contains `prototype`.
2. A child-facing Museum screen embeds YouTube in a WebView and includes two broken placeholder video URLs.
3. Parent screens still show invented/random progress, hard-coded statistics, developer information, and unavailable settings.
4. The legal and deletion documents are not yet proven to be hosted at public HTTPS URLs.
5. The repository records unresolved Supabase RLS, function, Auth, migration-baseline, and account-deletion deployment work.
6. A signed release AAB has not yet been inspected by Play for permissions, API level, 16 KB page compatibility, crashes, and policy declarations.

Once those items are closed, this is a reasonable first closed beta. Keep the beta intentionally small: free, no ads, no payments, no child chat, no embedded web video, and no child-facing system sharing.

## 2. Progress since the June audit

| Area | June position | Current position |
| --- | --- | --- |
| App name | Prototype wording was visible | App name is `Baby Steps` |
| Sunbird credential | Credential was compiled into client code | Helpers are disabled and no token is present; a security regression test exists |
| Legal acceptance | Missing | Signup requires a checked legal acknowledgement; Terms and Privacy are clickable popups |
| Login/signup notice | Long/private-account notes | Replaced with a short internet-availability notice |
| In-app legal access | Missing | Privacy Policy and Terms are available under Parent Settings > Privacy & Safety |
| Account deletion | Missing | In-app request, 30-day grace period, reactivation flow, migrations, and a finalizer function are implemented |
| Parent gate | Answer was effectively exposed | A generated arithmetic challenge is now used |
| Notifications | Unclear prototype state | Weekly reminders are device-local; no push token service is implemented |
| Settings routes | Several missing routes | Privacy, support, about, account deletion, child profiles, notifications, and audio routes now exist |
| Automated checks | Small/partial suite | 97 suites and 694 tests pass; typecheck and Expo Doctor pass |
| EAS release build | Incomplete | `production` profile creates an AAB and auto-increments the remote version code |

## 3. P0 release gates — close before inviting testers

| Gate | Current evidence | Required action | Done when |
| --- | --- | --- | --- |
| Permanent app identity | `app.json` used a prototype identifier (fixed after this audit) | Choose the permanent publisher-owned application ID, update `android.package`, then create the Play app with that exact value. | The same final ID appears in app config, EAS build details, and Play Console. It cannot be changed after the first Play artifact is uploaded. |
| Remove child-facing external video | `app/child/games/museum/ArtScreen.tsx` embeds YouTube through `react-native-webview`; two URLs contain `exampleVideo2`/`exampleVideo5` | For beta, remove the video button/WebView and keep only reviewed local text/images. If WebView has no other use, remove `react-native-webview`. | No child route loads YouTube or arbitrary external web content, and no placeholder URL remains. |
| Remove fabricated or internal UI | `app/parent/index.tsx` assigns random progress; `app/parent/child-progress.tsx` is hard-coded; child detail shows `Developer Info`; account/profile settings advertise unfinished actions | Connect a value to real stored data or show a clear empty state. Otherwise remove the card, link, or row for beta. Remove developer-only information from release UI. | Every reachable statistic reflects real data, and every visible action works. |
| Publish legal/support pages | `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, and `docs/delete-account.html` exist locally | Publish public, mobile-readable HTTPS pages for Privacy Policy, Terms, account deletion, and support. No login, region block, expiring link, PDF-only presentation, or local GitHub path. Put the same Privacy URL in Play Console and in the app. | All URLs open in an incognito browser and match the final app behavior/contact details. |
| Finish the Supabase production security gate | Repository notes record RLS disabled on `activities`, `achievements`, `child_achievements`, and `languages`, plus function/Auth advisor findings and a missing base migration | Run the linked project Security and Performance Advisors. Enable appropriate RLS and least-privilege grants on every exposed table, especially child-owned data. Review `SECURITY DEFINER` functions/search paths and cross-account access with two unrelated parent accounts. Resolve or document each advisor finding. Restore a reproducible baseline or create a verified backup/restore procedure before beta. | Account A cannot read/write Account B's child/profile/progress/activity/achievement/deletion/streak rows; public roles cannot mutate reference content; advisor findings have a signed disposition; restore is tested. |
| Deploy deletion finalization | Finalizer code/docs exist, but deployment, secrets, scheduling, and production QA are not proven by the repository | Deploy `finalize-account-deletions`, keep the service-role key server-side, set the admin secret, schedule a daily run, and execute the documented dry-run/real-run QA with a test account. | The test Auth user and owned data are deleted after the simulated grace period, shared content remains, and the operational log is anonymized. |
| Make signup email deliverable | App uses Supabase email/password Auth; repository does not prove custom SMTP is configured | Configure custom SMTP, sender domain/authentication, branded templates, redirect URLs, and rate limits. Test confirmation and password reset on Gmail and at least one other provider. Supabase's built-in mailer is restricted and intended for non-production use. | At least 15 independent tester addresses can sign up/reset without being project members or hitting the built-in mail limit. |
| Simplify child sharing | Coloring calls the Android system share sheet directly from child mode | Remove Share for the first beta. Saving a finished picture locally can remain only if its contextual permission and failure states pass device QA. A future Share feature should be behind a stronger adult action with a parent-facing safety notice and control. If no other feature uses it, remove `expo-sharing`. | Child mode cannot exchange free-form media through the app without an adult-controlled flow. |
| Prepare valid store assets | Configured logo is 500×500; no 1024×500 Play feature graphic was found | Export a clean 512×512 Play icon, a 1024×500 feature graphic, and phone/tablet screenshots from the final release build. Use a sufficiently high-resolution launcher/adaptive source with safe padding. | Play accepts every asset without resizing or policy warnings and the launcher icon is not clipped. |
| Validate the signed AAB | Source config is Expo SDK 54/API 36, but no final artifact was inspected | Build the production AAB and upload it to the closed track. Check App Bundle Explorer, pre-launch report, permissions, target API, 16 KB page compatibility, device catalogue, crashes/ANRs, and warnings. | Play reports API 36, no unsupported 16 KB native library, and only justified permissions. All blocking pre-launch findings are resolved. |
| Complete Play declarations truthfully | Data Safety, Target Audience, App Access, content rating, ads, and account deletion answers are not repository artifacts | Complete the declarations from the final AAB and actual production backend—not from planned behavior. Use reviewer credentials and clear navigation instructions. | Play Console shows no incomplete App content task and declarations match the release build. |

## 4. What to remove for the first beta

Use removal as a scope-control tool. A smaller beta is easier to test and safer for a child-directed product.

### Remove from the release build

- Museum YouTube/WebView playback and all five video links, especially the two placeholders.
- Coloring's child-facing Share action. Keep only local Save if it passes permission QA.
- Random dashboard progress in `app/parent/index.tsx`.
- Hard-coded sample statistics/achievements/weekly activity in `app/parent/child-progress.tsx`.
- The `Developer Info` panel in `app/parent/child-detail/[id].tsx`.
- Tappable settings that only say “coming soon,” including parent account edits and child profile editing. A non-interactive note is acceptable only when it does not imply a working capability.
- Published content that reaches “Quiz questions are coming soon,” “unsupported mechanic,” empty media, placeholder art, or a non-startable route. Draft content can stay in the database if it is not selectable.
- Production console logging that prints child IDs, storage keys, or serialized progress. Keep actionable, sanitized error reporting only.
- `react-native-webview` and `expo-sharing` dependencies if the beta no longer uses them.

### Do not add yet

- Advertising SDKs, behavioral analytics, third-party trackers, payments/subscriptions, chat, public profiles, or social feeds.
- A new crash/analytics SDK immediately before the beta unless its child/privacy configuration, SDK policy eligibility, and Data Safety impact are reviewed. For this first round, Play Android vitals, the pre-launch report, Supabase operational logs, and parent tester feedback are sufficient.
- EAS Update/over-the-air release complexity until a runtime-version and rollback policy is deliberately configured.
- Runyankole marketing claims until the published, selectable Runyankole path has been reviewed and tested end to end.

## 5. What to adjust in the app

### Required adjustments

1. **Use a stronger adult boundary for sensitive actions.** The arithmetic parent gate is better than the old gate, but children in the intended age range may solve it. For account deletion, privacy choices, external links, and any future sharing/purchase, use parent re-authentication or a parent-created PIN. Rate-limit failed attempts and return safely to child mode.
2. **Use honest parent metrics.** A screen may display real Supabase/local progress or a friendly “No activity recorded yet” state. It must never synthesize progress for presentation.
3. **Keep legal copy synchronized.** The in-app popup, hosted page, Play Data Safety answers, account-deletion page, and actual database behavior must describe the same data and retention model.
4. **Review all release content.** Confirm spelling, Luganda meaning/pronunciation, cultural accuracy, image/audio licences, accessibility labels, and that each published content item is startable and completable.
5. **Tighten release logs.** There are approximately 352 `console.*` calls outside test files. Remove verbose success/progress logs and redact identifiers from recoverable error paths.
6. **Review lint warnings that affect behavior.** Lint has no errors, but hook dependency warnings appear in games, stories, Museum screens, and parent detail. Resolve behavior-sensitive warnings rather than suppressing them globally.
7. **Fix the package-manager mismatch.** The repository uses `package-lock.json`/npm, while `.github/workflows/android-apk-build.yml` runs `yarn install`. Change CI to `npm ci` and run the same verification commands used locally.
8. **Add an `.env.example`.** Include only variable names and safe instructions. Keep the Supabase service-role key and account-deletion admin secret out of Expo/EAS public variables.
9. **Configure EAS production environment values.** Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the `production` EAS environment. The anon key is designed for clients; RLS and grants provide the authorization boundary.
10. **Resolve dependency audit results.** `npm audit --omit=dev` currently reports two high advisories through build/lint tooling (`brace-expansion` and `js-yaml`). Update compatible dependencies/lockfile or document why a remaining advisory cannot reach the mobile runtime, then rerun the audit.
11. **Install/configure `expo-system-ui` or choose a fixed interface style.** Expo config inspection warns that `userInterfaceStyle: automatic` depends on `expo-system-ui`.
12. **Plan the `expo-av` migration.** Expo SDK 54 is the final Expo release that includes it. This does not have to block the first closed beta if audio passes QA, but it should be completed before the next SDK upgrade.

### Useful beta additions

- Show the user-facing version and Android build number in Parent Settings > About.
- Add “Closed beta” and a support/feedback entry in the parent area, not as distracting child-mode copy.
- Add a structured tester feedback form or monitored email. Tell testers not to include a child's full name, screenshots containing personal data, or passwords.
- Add a short release-notes file for every AAB: what changed, known limitations, database migration version, and rollback contact.
- Add a two-account authorization test and the account-deletion finalizer test to the release checklist.

## 6. Data Safety and Families preparation

Baby Steps is designed for young children, so complete the Play Target Audience and Content section conservatively and accurately. The app appears most consistent with **Ages 5 and under** and **Ages 6–8**, but the publisher must choose the actual intended age groups and ensure the content and store listing match. Do not select older groups merely to avoid child-directed requirements.

### Draft data inventory to verify against the final build

| Data/function | Current behavior found | Data Safety preparation |
| --- | --- | --- |
| Parent account | Email, Auth user ID, password handled by Supabase Auth | Declare the applicable personal/account data, required/optional status, purposes, encryption in transit, and deletion behavior. Password handling is by the Auth provider; do not claim Baby Steps can read plaintext passwords. |
| Child profile | Name, age, gender, learning reason, selected language, parent ownership | Treat as child-related personal information. Collect only fields the beta truly needs; make optional fields optional; explain parent control and deletion. Consider replacing exact age with an age band if exact age is unnecessary. |
| Learning activity | Scores, progress, achievements, streaks, activity history | Declare App activity as applicable and use App functionality/account management purposes that match reality. |
| Legal acceptance | Checkbox is required in the client | If proof of consent/version is needed, store a server-side acceptance timestamp and policy version. Do not imply the checkbox alone is verifiable consent if it is not persisted. |
| Artwork | Captured locally, saved to device gallery, optionally shared by explicit user action | For beta, remove sharing. Confirm that artwork is never uploaded to Supabase and describe local saving accurately. Review Google's definition/exceptions while completing Data Safety rather than guessing. |
| Notifications | Device-local weekly schedule; no push token backend found | Do not claim push-token collection. Declare notification permission only as required by the final Android behavior. |
| Diagnostics | No dedicated analytics/crash SDK found | Do not declare an SDK that is not present. Remember that Google Play services and any newly added SDK can change the form answers. |
| Service provider | Supabase receives account/profile/progress data | Decide “collected” and “shared” using Google's definitions and the service-provider exception, contracts, and final architecture. Do not assume that every processor automatically counts as third-party sharing or that it never does. |

### Families checklist

- [ ] Target audience and store artwork clearly match the actual young-child audience.
- [ ] No ads SDK is present; answer **No ads** if this remains true in the final AAB.
- [ ] Every SDK/API is suitable for the declared child audience and used only for its approved purpose.
- [ ] Child mode has no unrestricted browser, external link, social exchange, purchase, or account-management path.
- [ ] Sensitive parent actions use a real adult action, not only an easily solved child challenge.
- [ ] Privacy Policy is available both in the app and at a public HTTPS URL.
- [ ] Data Safety includes production backend behavior and service providers.
- [ ] Store text does not promise educator/government approval, complete offline operation, unsupported languages, or features that are still placeholders.

## 7. Store listing package

Prepare these before creating the release so the Play flow does not stall:

- App title: `Baby Steps`.
- Default language and intended release countries.
- Short description of no more than 80 characters. Keep it factual, for example: `Playful Luganda stories and learning activities for young children.`
- Full description that names only published, working features.
- 512×512 store icon.
- 1024×500 feature graphic.
- At least two phone screenshots from the final AAB; add correctly sized 7-inch and 10-inch tablet screenshots if Play lists those device forms. Avoid child names/emails in screenshots.
- Support email that is owned and monitored. The app currently uses `hello@babystepslearn.com`; verify it receives and can send mail.
- Public Privacy Policy URL, Terms URL, account-deletion URL, and preferably a small support page.
- Reviewer account with a pre-created child profile and non-sensitive sample data, plus exact sign-in/navigation instructions.
- Closed-beta release notes and a tester-facing known-issues list.

Do not put `beta`, `prototype`, `free`, ranking claims, promotional pricing, or unsupported curriculum claims in the permanent app title/icon. “Closed beta” can appear in release notes and the parent About screen.

## 8. Exact deployment playbook

### Phase A — Developer account and ownership

1. Decide whether the publisher is an individual/personal account or a registered organization. Do not choose personal only because it looks faster. Organization verification can require a D-U-N-S number; personal accounts have identity/contact and device-verification requirements.
2. Create or verify the Play Console account, enable two-step verification, pay the registration fee shown by Google, and complete identity/contact verification.
3. If it is a new personal developer account, complete device verification with the Play Console mobile app on a real, non-rooted Android 10+ device.
4. Record who owns the Play account, EAS account, Supabase project, domain/DNS, support mailbox, signing credentials, and recovery codes. Use organization-controlled accounts where possible.

### Phase B — Freeze the beta identity and scope

1. Choose the final Android package ID.
2. Change `app.json` before the first Play upload.
3. Confirm app title, support email, scheme/deep links, Supabase Auth Site URL/redirect allow-list, and hosted URLs.
4. Close every P0 code/backend item in section 3.
5. Freeze the first-beta feature list. Any feature added after Data Safety review must trigger another declaration review.

### Phase C — Prepare the production backend

1. Confirm production and development Supabase projects are not accidentally mixed.
2. Apply and list the intended migrations on the production project. Do not run `schema.sql` as a migration.
3. Run Supabase Security and Performance Advisors and disposition every finding.
4. Execute the two-parent isolation test for every child-owned table/RPC.
5. Configure custom SMTP, email templates, Auth redirect URLs, CAPTCHA/abuse controls as appropriate, and leaked-password protection.
6. Deploy and schedule the account-deletion finalizer; run its QA checklist.
7. Take a restorable backup and write down the rollback/contact procedure.
8. Confirm production EAS environment values reference this production project and contain no service-role key.

### Phase D — Create and verify the build

From a clean checkout on the release commit:

```bash
npm ci
npm run typecheck
npm test
npm run lint
npx expo-doctor
npm audit --omit=dev
```

Then authenticate and build with EAS:

```bash
npm install --global eas-cli
eas login
eas credentials -p android
eas build --platform android --profile production
```

Important points:

- The current `production` profile correctly requests an Android App Bundle and remotely auto-increments the version code.
- Let Play App Signing manage the distribution signing key. Preserve access to the EAS upload key and account.
- An `.aab` is for Play upload; it is not installed directly like an `.apk`.
- The first Play submission should be uploaded manually in Play Console. Configure automated EAS Submit only after the app/track exists and the first upload succeeds.
- Expo SDK 54 targets API 36, which meets Google's announced August 31, 2026 requirement for new apps/updates. Confirm the actual AAB in Play rather than relying only on source versions.

### Phase E — Create the Play Console app

1. Play Console > **Home > Create app**.
2. Select the default language, `App`, `Free`, and the appropriate category (normally Education).
3. Enter the support email and accept the declarations only after reading them.
4. Enrol in Play App Signing.
5. Complete the main store listing and upload the final assets.
6. Complete every item under **Policy and programs > App content**:
   - Privacy Policy
   - Ads (`No`, if unchanged)
   - App access, with working reviewer credentials/instructions
   - Target audience and content/Families answers
   - Content rating questionnaire
   - Data Safety
   - Account deletion URL/data-deletion answers
   - Any additional category or permissions declarations Play presents for the final AAB
7. Configure the countries/regions where testers will access the closed test.

### Phase F — Create the closed test

1. Go to **Testing > Closed testing** and create a track, for example `Beta`.
2. Create a tester list using email addresses or a Google Group. Testers must use Google Accounts.
3. Create a release and upload the production `.aab`.
4. Add concise release notes and save the release.
5. Resolve every Play error and review warning. Run/inspect App Bundle Explorer and the pre-launch report.
6. Roll out the release to the closed track.
7. Copy the tester opt-in link. The app will not be discoverable by normal Play search while it is only in closed testing.
8. Ask testers to open the opt-in link with the same Google Account used by the Play Store, opt in, and install from Play.

### Phase G — Tester requirement for newer personal accounts

If the developer account is a **personal account created after November 13, 2023**, Google currently requires at least **12 opted-in testers continuously for 14 days** before production-access application. Recruit **15–20 reliable adult testers** to provide a buffer; children should use the app only under their participating parent's supervision.

During the 14-day window:

- Keep at least 12 testers opted in continuously.
- Track opt-in status and do not delete/recreate the test track.
- Give testers a short task script covering signup, legal acknowledgement, child creation, orientation, offline/reconnect, all published activities, progress sync, notifications, save-to-gallery, parent gate, password reset, support, sign-out/in, and deletion request/reactivation.
- Monitor Play Android vitals, crashes, ANRs, pre-launch results, support email, Auth delivery/logs, Supabase function/database logs, and feedback.
- Record device model, Android version, app version/build, exact steps, expected result, actual result, and whether personal data appears in any screenshot/log.
- Fix severe crashes, data leaks, cross-account access, broken signup, or data-loss bugs immediately. Update the closed track with a new version code and release notes.

After the requirement is met, Play Console lets an eligible personal developer apply for production access. Be prepared to explain how testers were recruited, their engagement, the feedback received, and the changes made. Closed testing itself does not automatically publish the app to production.

## 9. Suggested first-beta test matrix

| Area | Minimum cases |
| --- | --- |
| Devices | Low/mid/high Android hardware; Android 10 through current; phone and tablet; small and large screens |
| Accounts | New signup, email confirmation, login, wrong password, reset password, session restore, sign out/in |
| Authorization | Two unrelated parents; attempt cross-account child, activity, achievement, progress, streak, and deletion access |
| Child profiles | Zero, one, and multiple children; supported ages; optional fields; archived/deleted child behavior |
| Network | First launch online; launch offline with cache; lose/recover connection during a save; slow connection |
| Content | Every selectable language/menu/card/lesson/story/game reaches a real completion state with correct media |
| Progress | Local save, remote sync, app restart, account switch, simultaneous/offline writes, no invented dashboard values |
| Orientation | Parent flows in portrait/default; child activities landscape; back navigation and system dialogs do not trap rotation |
| Media | Audio interruption, mute/volume, repeat, missing asset; coloring save permission allow/deny/deny permanently |
| Notifications | Allow/deny, schedule/pause/resume, time zone change, no child-name leak when disabled, Android channel settings |
| Legal/support | Terms/Privacy popup, required checkbox, in-app policy access, public URLs, support email |
| Deletion | Request, sign-out, blocked access, reactivation within grace, finalization after simulated expiry, re-signup policy |
| Accessibility | Screen reader labels, font scaling, contrast, touch target size, motion/animation tolerance |

## 10. Verification performed for this audit

| Check | Result on July 21, 2026 |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` | Pass — 97 suites, 694 tests |
| `npm run lint` | Pass with 0 errors and 78 warnings |
| `npx expo-doctor` | Pass — 18/18 checks |
| `npm audit --omit=dev` | Not clean — 2 high advisories in the current dependency/tooling tree |
| App config | Expo SDK 54, React Native 0.81.5, New Architecture enabled, EAS production AAB configured |
| Asset source scan | About 102 MB in `assets`; configured logo is 500×500; no Play feature graphic found |
| Runtime preview/device QA | Not performed at the user's request |
| Signed AAB/Play pre-launch report | Not available during this audit |
| Live Supabase security/deployment validation | Not performed; repository documentation was reviewed |

The passing automated checks are a strong baseline, but they do not validate real-device permissions, media playback, orientation, email delivery, live RLS, Play policy declarations, or a signed artifact.

## 11. Recommended sequence and effort

Do the work in this order to avoid rebuilding store artifacts repeatedly:

1. **Identity and scope:** package ID; remove YouTube/WebView, Share, fake/developer/placeholder UI.
2. **Backend safety:** RLS/advisors, cross-account tests, SMTP, deletion finalizer, backup/restore.
3. **Legal truth:** finalize and host Privacy, Terms, deletion, and support pages; align Data Safety.
4. **Release polish:** logs, hook warnings, CI, dependency audit, icon/feature graphic, screenshots, support/version UI.
5. **Artifact verification:** build AAB, upload to closed track, inspect Play results, fix issues.
6. **Tester rollout:** invite 15–20 adults, hold 12+ continuous opt-ins for 14 days if required, collect evidence and feedback.

## 12. Official references

- [Google Play: Testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play: Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Google Play: Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Google Play: Developer account verification](https://support.google.com/googleplay/android-developer/answer/10841920)
- [Google Play: Device verification for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14316361)
- [Google Play: Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Android Developers: Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
- [Google Play: Families policy requirements](https://support.google.com/googleplay/android-developer/answer/9893335)
- [Google Play: Families SDK requirements](https://support.google.com/googleplay/android-developer/answer/13326895)
- [Google Play: Data Safety form](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play: Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play: Prepare app for review / App content](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Google Play: Store listing asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Expo: Android production build tutorial](https://docs.expo.dev/tutorial/eas/android-production-build/)
- [Expo: APK versus AAB](https://docs.expo.dev/build-reference/apk/)
- [Expo: App versions and remote auto-increment](https://docs.expo.dev/build-reference/app-versions/)
- [Expo: Submit builds to stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
- [Expo SDK 54: Android API 36 and `expo-av` deprecation](https://expo.dev/changelog/sdk-54)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
