# Manual QA Checklist

Use this checklist for prototype regression passes and MVP launch readiness. Record device, OS version, app build, Supabase project, and tester name when running it.

## App Startup

- [ ] Fresh install opens without crashing.
- [ ] App splash hides after fonts/session load.
- [ ] Returning user route behavior is correct.
- [ ] Missing/invalid Supabase env behavior is understood.
- [ ] Background music starts only when expected.
- [ ] Background/foreground app state does not break audio.

## Navigation

- [ ] App onboarding routes to login.
- [ ] Login routes to parent dashboard.
- [ ] Parent dashboard routes to child list.
- [ ] Parent dashboard routes to child detail.
- [ ] Child detail launches child mode.
- [ ] Child mode tabs render Games, Coloring, Stories, and Learning.
- [ ] Parent gate varies between simple addition, subtraction, and missing-number challenges.
- [ ] A wrong parent-gate answer shows a fresh challenge without leaving the gate.
- [ ] A correct parent-gate answer returns to the parent dashboard.
- [ ] Android hardware back behavior is acceptable in child mode.
- [ ] Settings future links are removed or handled before release.

## Responsive Child UI

- [ ] Check every Learning Hub mechanic at `640 x 360`, `844 x 390`, and a landscape tablet width.
- [ ] Mechanic content normally fits without vertical scrolling; long authored copy can still scroll.
- [ ] Lesson and game header controls sit comfortably below the top edge without safe-area changes.
- [ ] Word, Matching, Counting, Learning, Puzzle, Ball Trail, and Coloring use the available horizontal space without clipped right-side controls.
- [ ] Coloring tool and color docks leave most of the canvas visible on compact landscape phones.
- [ ] Puzzle tiles remain aligned after entering the route at different landscape sizes.

## Onboarding

- [ ] First-run onboarding appears after clearing storage.
- [ ] All onboarding slides render.
- [ ] Next button works.
- [ ] Final button stores completion state.
- [ ] Skip stores completion state.
- [ ] App does not show onboarding again after completion.

## Auth

- [ ] New signup routes through notification permission and then to the check-email screen.
- [ ] New signup does not remain on the Create Parent Account form after Supabase accepts it.
- [ ] Existing email signup gives helpful sign-in guidance where Supabase safely exposes it.
- [ ] Login with an unconfirmed email routes to confirmation guidance instead of only showing an alert.
- [ ] Resend confirmation email works from the confirmation guidance screen when an email is available.
- [ ] Login with wrong password shows friendly copy and keeps Forgot password visible.
- [ ] Login with a non-existent account shows friendly general copy and keeps Create Account visible.
- [ ] Login after requesting a reset does not block the old password if it still works.
- [ ] Login failure after returning from reset request mentions using the emailed reset link.
- [ ] Forgot password routes to the safe check-email state.
- [ ] Reset link opens the app and shows the reset-password screen.
- [ ] Reset-password fields can show/hide password text.
- [ ] Reset with the same old password shows friendly copy if Supabase returns that error.
- [ ] Expired or invalid reset link shows request-new-link and back-to-sign-in actions.
- [ ] Successful password reset routes clearly back to sign in.
- [ ] Signup confirmation deep link still routes into the authenticated app.
- [ ] Expired or invalid signup confirmation link shows signup/sign-in actions.
- [ ] Logout returns user to unauthenticated flow.

## Notifications

- [ ] New signup explains gentle Baby Steps notifications without promising specific notification categories or displaying a fixed timetable.
- [ ] `Maybe later` continues signup without requesting permission.
- [ ] Granting permission enables the current device-local recurring schedule.
- [ ] Normal builds do not show `Send a test reminder` on the Notifications settings screen.
- [ ] The `notification-test` profile still exposes manual test-notification controls.
- [ ] Denying permission does not block signup or login.
- [ ] Dashboard bell opens notification settings.
- [ ] Settings toggle pauses and resumes the grouped account/device learning reminder.
- [ ] Blocked permission state offers a route to device settings.
- [ ] Test reminder appears after approximately three seconds.
- [ ] Tapping a reminder opens the appropriate signed-in or signed-out root flow.
- [ ] Reminder text and Android channel styling match the Baby Steps theme.
- [ ] Native Android/iOS build includes the `expo-notifications` plugin configuration.

## Child Profiles

- [ ] Empty child list state renders.
- [ ] Add-child flow validates required name/gender where expected.
- [ ] Age and reason selections persist through the flow.
- [ ] Final screen writes profile to Supabase.
- [ ] Child appears in child list and parent dashboard.
- [ ] Child detail opens for the correct child.
- [ ] Launch child mode sets active child.

## Child Learning Streaks

- [ ] Cold-start signed out, signed in as a parent, signed in in child mode, and with a missing/invalid active child; no state requests navigation context before Expo Router is ready.
- [ ] Open a child from the dashboard; the child profile shows current, best, today, and seven-day history without mutation controls.
- [ ] Open Settings -> Child Profiles -> child; streak status, enable switch, reminder participation, and reset are present for that child.
- [ ] Disable a child's streak; the controls remain visible, the child flame disappears, qualification stops, and that child leaves reminder eligibility.
- [ ] Re-enable the streak; a clean current epoch starts without bridging the old streak.
- [ ] Reset after adult confirmation, then complete again on the same local date; only the post-reset completion qualifies the new epoch.
- [ ] Switch repeatedly between two children; neither preference, history, error, nor loading state flashes from the previously viewed child.
- [ ] Test offline/failed hydration and mutation failure; the setting remains visible, retry works, and authoritative state is restored.
- [ ] Complete each qualifying learning/game/story outcome and save coloring; partial progress and unsaved coloring do not qualify.
- [ ] Confirm only the first qualification of the day celebrates, reduced-motion behavior is acceptable, and child header accessibility text is correct.
- [ ] On a physical device, verify permission-denied startup, grouped generic reminder copy, optional first names, all-complete one-shot behavior, foreground refresh, and timezone/date-boundary behavior.
- [ ] Follow the full contract and troubleshooting notes in [Child Learning Streaks](../features/child-streaks.md).

## Stories

- [ ] Each story card opens the correct route.
- [ ] Every story page renders image and text.
- [ ] Previous/next buttons work.
- [ ] Page indicators work.
- [ ] Page-turn audio does not crash.
- [ ] Final page writes reading activity.
- [ ] Quiz opens from final page.
- [ ] Quiz answers can be selected.
- [ ] Quiz scoring is correct.
- [ ] Quiz completion writes activity.

## Games

- [ ] Word Game loads, validates letters, completes a level, and saves progress.
- [ ] Luganda Counting loads, handles correct/wrong selections, completes a stage, and saves progress.
- [ ] Luganda Learning loads stages/levels, plays word audio, completes a quiz, and saves progress.
- [ ] Card Matching loads cards, saves partial state, completes game, and writes activity.
- [ ] Puzzle Game loads all puzzle images, moves tiles, detects completion, and writes activity.
- [ ] Game progress persists after leaving/reopening each game.
- [ ] Achievement checks do not crash when no achievements are seeded.

## Coloring

- [ ] Each coloring template opens.
- [ ] Brush, eraser, fill, undo, redo, and clear work.
- [ ] Color palette and brush size controls work.
- [ ] Save to gallery works after granting permission.
- [ ] Save handles denied permission gracefully.
- [ ] Share does not request photo-library permission.
- [ ] Eraser removes paint without drawing white over the template lines.
- [ ] Saved pictures contain the artwork only, with no toolbar, loader, or message overlay.
- [ ] Share works where device sharing is available.

## Museum

- [ ] Museum is hidden from the child tab bar while archived.
- [ ] Artifacts screen opens and each item modal renders.
- [ ] Art screen opens, modal renders, and video links are valid or flagged.
- [ ] Instruments screen opens, details render, and sounds play/stop.
- [ ] Textiles screen opens, pinch behavior works, and details render.
- [ ] Back button closes modals before leaving screens.

## Content And Media Loading

- [ ] Bundled images render on Android.
- [ ] Bundled images render on iOS if in scope.
- [ ] Bundled audio plays on Android.
- [ ] Bundled audio plays on iOS if in scope.
- [ ] No broken image imports appear in cards, stories, games, museum, or coloring.
- [ ] Text with encoding artifacts is listed for cleanup.

## Progress, Scoring, And Completion

- [ ] Supabase `activities` rows are created for tracked stories/games.
- [ ] Activity scores match visible scores.
- [ ] Parent dashboard recent activities update.
- [ ] All Activities search and filters work.
- [ ] Achievements display correctly when definitions are seeded.
- [ ] Static `/parent/child-progress` screen is either accepted as prototype-only or replaced before release.

## Offline Or Poor Network Behavior

- [ ] App opens with no network after a previous signed-in session.
- [ ] Going offline on any route shows one themed pop-up and a persistent offline banner.
- [ ] Launching while offline shows the pop-up after the splash animation finishes.
- [ ] Changing connectivity while the app is backgrounded is detected when it returns to the foreground.
- [ ] Login and signup explain which functionality requires internet.
- [ ] Offline sign-in, signup, password recovery, confirmation resend, and child-profile save show action-specific messages.
- [ ] Restoring connectivity removes the banner and allows the action to be retried.
- [ ] Local-only game progress still loads.
- [ ] Supabase-backed screens handle failed requests gracefully.
- [ ] Activity writes fail gracefully or retry behavior is defined.
- [ ] Remote Sunbird prototype helpers are not required for core app use.

## Android Testing

- [ ] Test on emulator.
- [ ] Test on physical Android device if available.
- [ ] Test orientation changes and locks.
- [ ] Test media save/share permissions.
- [ ] Test Android hardware back in child, game, story, museum, and coloring screens.
- [ ] Build with EAS profile if preparing a release.

## iOS Testing

- [ ] Test on simulator if macOS/Xcode are available.
- [ ] Test on physical iOS device before App Store release.
- [ ] Test reset-password deep link.
- [ ] Test media save/share permissions.
- [ ] Test orientation changes and locks.

## Regression Checks After Refactors

- [ ] Auth still works.
- [ ] Add-child flow still writes profiles.
- [ ] Child mode still launches from child detail.
- [ ] All tab cards still link to existing routes.
- [ ] Games still complete and save progress.
- [ ] Stories still write reading and quiz activities.
- [ ] Activities and achievements still render.
- [ ] No new TypeScript errors.
- [ ] No lint errors.
- [ ] Existing Jest tests pass.

## Deployment Readiness Checks

- [ ] README setup commands are current.
- [ ] `.env` variables are configured in build environment.
- [ ] No hardcoded secrets remain.
- [ ] Missing settings routes are fixed or removed.
- [ ] Privacy policy and account deletion page are current.
- [ ] App store feature claims match implemented behavior.
- [ ] Manual QA findings are triaged before release.
