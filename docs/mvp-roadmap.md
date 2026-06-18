# MVP Roadmap

## Current State

Baby Steps has a broad prototype foundation:

- Supabase auth.
- Parent dashboard and settings.
- Add-child flow and child profiles.
- Child mode with games, stories, coloring, and museum tabs.
- Several playable games.
- Eight story screens with quizzes.
- Local game progress.
- Supabase activities and achievements for some flows.
- Hardcoded cultural, language, media, and translation content.

The prototype is not yet a deployable MVP because major data, testing, content, security, and polish work remains.

## Needed Before MVP Deployment

- Stabilize auth and route guards.
- Confirm child profile and parent/child switching behavior on devices.
- Normalize activity, progress, scoring, and achievement data.
- Replace placeholder/random dashboard metrics.
- Remove or implement missing settings routes.
- Clean encoding artifacts in source text.
- Secure third-party credentials.
- Replace or plan replacement for deprecated `expo-av`.
- Add UI/integration smoke coverage for core flows.
- Complete manual Android QA and iOS QA if iOS launch is in scope.
- Confirm database schema/migrations and Supabase policies.
- Verify privacy policy, deletion page, and app store claims.

## 8-Week MVP Development Priorities

| Week | Priority | Expected outcome |
| --- | --- | --- |
| 1 | Audit, cleanup, validation | Reduce high-risk warnings, verify device flows, confirm MVP scope. |
| 2 | Scope and content contracts | Decide shipped content, define story/game/lesson/media contracts. |
| 3 | Core stability | Harden auth, child profiles, route guards, parent/child switching, missing settings routes. |
| 4 | Database content foundation | Add first content schema/API approach for one low-risk content type while keeping fallback content. |
| 5 | Progress and game/story polish | Normalize scoring/completion, improve achievements, add key tests. |
| 6 | Pilot and feedback | Test with parents/children/teachers and fix navigation, difficulty, pacing, and content issues. |
| 7 | Launch prep | Privacy, deletion, analytics decision, app store assets, onboarding polish, deployment config. |
| 8 | Final QA and release readiness | Android/iOS QA, regression pass, build verification, rollback/support plan. |

## Out Of Scope For The Current Prototype

- Payments and subscriptions.
- Premium entitlements.
- Admin/content creator publishing tools.
- Fully database-driven curriculum.
- Institution/school management.
- Production analytics and personalization.
- Full offline sync.

These may be future MVP or post-MVP work, but they are not implemented today.

## Risks And Blockers

- Hardcoded content makes content updates slow and risky.
- Story and game components are large and duplicated.
- Progress is split between Supabase and local AsyncStorage.
- No UI/E2E tests cover the main user journeys.
- The parent progress screen is sample/static.
- `expo-av` deprecation will become more important with future Expo upgrades.
- Hardcoded Sunbird token is a production security blocker.
- Missing settings routes can produce broken navigation.
- App text/media needs cultural, language, and encoding review.

## Recommended MVP Sequence

1. Fix broken/future settings routes.
2. Secure credentials.
3. Stabilize auth and child mode entry/exit.
4. Decide the exact stories/games/lessons to ship.
5. Normalize progress and activity tracking.
6. Add tests around the riskiest completion flows.
7. Migrate one content type to a typed content contract.
8. Complete manual QA and release readiness.

## References

- [README](../README.md)
- [Refactor report](../REFACTOR_REPORT.md)
- [Verification report](../VERIFICATION_REPORT.md)
- [Deployment readiness](development/deployment.md)
- [Manual QA checklist](qa/manual-qa-checklist.md)
