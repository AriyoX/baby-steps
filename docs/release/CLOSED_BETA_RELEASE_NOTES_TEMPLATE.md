# Baby Steps closed-beta release notes

- **Release date:** YYYY-MM-DD
- **App version:** _Add value._
- **Android version code:** _Add value._
- **Git commit:** _Add value._
- **EAS build:** _Add value._
- **Tester group:** _Add value._

## What testers should focus on

- Parent signup/login and account recovery.
- Creating and switching child profiles.
- Parent PIN setup and leaving child mode.
- Luganda activities that are visible in the build.
- Honest Runyankole unavailable states where reviewed content is not yet published.
- Progress after restart or temporary loss of connectivity.
- Audio, orientation, reminders, Coloring Save, and parent account deletion/reactivation.

## Changes in this build

- _Add release-specific change._

## Known limitations

- No ads, payments, analytics SDKs, chat, public profiles, social features, external child video, or child-facing system sharing are included.
- Only reviewed, published, exact-language content should be visible.
- _Add release-specific limitation._

## Feedback

Email `hello@babystepslearn.com` with the app version, Android version, device model, steps taken, and what happened.

Do not send passwords, children's full names, account tokens, or screenshots containing personal information.

## Release verification

- [ ] Repository verification commands passed.
- [ ] Supabase migration list and Advisor findings reviewed.
- [ ] Two-parent isolation QA passed.
- [ ] Deletion finalizer and daily schedule passed controlled QA.
- [ ] Legal/support URLs were opened on a phone.
- [ ] SMTP delivery passed Gmail and one other provider.
- [ ] Phone/tablet smoke matrix passed.
- [ ] Production AAB permission/target API/16 KB inspection passed.
- [ ] Play pre-launch report reviewed.

## Rollback trigger and owner

- **Owner:** _Add owner._
- **Rollback build/version:** _Add value._

**Rollback triggers:** cross-account data exposure, child-to-parent gate bypass, startup crash/loop, progress corruption, deletion malfunction, or a material policy/privacy mismatch.
