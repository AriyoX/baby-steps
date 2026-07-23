# Baby Steps closed-beta independent verification

Date: 2026-07-23

Supabase project reviewed read-only: `ydtxgwlnldfuqamhxfqi`

## Decisions

- **Repository decision: CONDITIONALLY READY**
- **Migration decision: SAFE TO APPLY AFTER BACKUP**

The repository is ready for the next device/Play QA stage, but it is not ready
for tester distribution. Distribution still depends on applying both pending
migrations in order, running the post-application checks in this report,
passing critical Android device QA, rotating the exposed finalizer secret, and
closing the external Play, SMTP, legal, and store-asset gates.

## 1. Initial state and exact review range

- Branch: `feat/child-streak-system`
- HEAD: `b1578b1c792a8c85d3388507e19075019f68a697`
- Checkpoint parent: `ad40a5666a0ccf309dfd23ab2e22de94e4ce9833`
- The checkpoint commit range `HEAD^..HEAD` contains only:
  - modified `README.md`
  - modified `docs/README.md`
  - added `docs/development/scalability.md`
- The substantive readiness pass was uncommitted. The initial review therefore
  covered `HEAD`, every tracked modification/deletion, and every untracked file.
- Initial working-tree inventory: 113 tracked changed paths, 12 untracked
  entries, and 15 deleted paths. No commit, push, amend, rebase, reset, stash,
  clean, or checkout operation was performed.
- Final working-tree inventory before handoff: 113 tracked changed paths, 25
  untracked entries, and the same 15 deleted paths. The 13 additional untracked
  entries are the profile-settings implementation, its tests, and its later
  migration.
- `handover.md`, release notes, readiness audits, and documentation were read
  as claims and checked against code, tests, the live catalogs, and the isolated
  rehearsal.

## 2. Independent findings from the previous readiness pass

Confirmed as implemented:

- The arithmetic gate is gone. The parent gate uses an account-scoped,
  six-digit SecureStore PIN, five-attempt cooldown, password-authenticated setup
  and reset, and no PIN value in AsyncStorage or logs.
- Child mode is restored from SecureStore and root routing protects adult
  routes. Authentication, recovery, and reactivation routes remain reachable.
- Parent dashboard random/fake statistics are gone.
- Museum video/WebView child paths and Coloring system Share are gone. Local
  Coloring Save remains and covers permission allow/deny/permanent-denial,
  cancellation, and failure.
- Content selection uses exact language, publication/startability, supported
  mechanic, valid route, media, payload, and completion-readiness checks.
- Runyankole (`nyn`) is never substituted with Luganda (`lg`) in the content
  pipeline.
- Progress storage/queues are scoped by account, child, language, activity, and
  stage where those dimensions apply.
- Child archive copy and ordinary selection behavior distinguish archive from
  account deletion.
- Package ID `com.babystepslearn.app`, scheme `babysteps`, runtime/build,
  closed-beta copy, feedback details, and dependency removals are present.
- Notifications stay grouped. Background music and in-app sounds remain
  independent controls. Privacy, Terms, Support, About, account deletion, and
  sign-out have working destinations.
- The accepted achievement-notification presentation was not redesigned.

Claims that needed correction are documented below.

## 3. Confirmed defects and root causes

| Confirmed defect | Root cause |
| --- | --- |
| Password reauthentication could replace the app's primary session and fire normal auth listeners. | Reauthentication used the singleton persisted Supabase client. |
| A restored active-child marker was trusted without a current ownership/archive check. | Secure storage established presence, but not current database authorization. |
| A corrupt child marker was deleted during parsing, allowing a later restart to lose the evidence that child mode had been active. | Parse failure was treated as “no active child.” |
| SecureStore read errors could leave startup routing ambiguous. | Missing, corrupt, unavailable, and transient storage failures were not distinct states. |
| Backgrounding during PIN entry retained the entered secret and an in-flight unlock result. | App lifecycle was not part of gate state. |
| Parent-gate completion cleared child mode without waiting before adult navigation. | Secure deactivation was detached from navigation. |
| Recovery/reactivation routes and the gate route itself could be caught by the adult-route redirect. | Root exemptions were incomplete. |
| A successful empty content refresh could retain previously cached content that had become draft. | Empty success was handled like a failed fetch. |
| Legacy progress queue entries could be assigned to whichever account signed in next. | Old records had no account binding and were upgraded before proving ownership. |
| Earned achievements could collide across learning languages. | The database and local identity used child + achievement, without language. |
| The hardening story update also touched an already-draft Runyankole row and would rewrite its audit timestamp. | The predicate selected all unreviewed stories, even when publication state was already correct. |
| Progress row identity could be reassigned during UPDATE. | RLS checked that the destination child was owned but did not make identity columns immutable. |
| Generic child UPDATE grants exposed ownership/lifecycle columns to direct API mutation. | Table-level UPDATE was granted despite a narrower profile-edit contract. |
| Two unused exported reactivation helpers still issued direct client UPDATEs that the hardened grants intentionally deny. | An older client-side cancel/restore implementation remained beside the newer lifecycle RPC. |
| Parent and child profile editing did not exist. | There was no parent profile table/screen and no supported child edit repository/screen. |
| Settings still exposed nonessential tour/developer/placeholder entries. | The prior settings inventory had not been reduced to working beta essentials. |
| Profile save guards could admit a second submission around an awaited request, and parent profile load did not classify all network failures/account-switch races. | Submission/session state was checked only at render-time boundaries. |

## 4. Fixes implemented

- Reauthentication now uses an ephemeral, non-persisted Supabase auth client
  with refresh and URL session detection disabled. It verifies the primary
  client session before returning and signs out only the ephemeral client.
- Restored child mode now revalidates the child by exact ID, authenticated
  parent, and active state. Missing/archived rows clear the marker while keeping
  the parent boundary; network uncertainty fails closed.
- Corrupt markers raise a distinct secure-session error and remain present until
  a verified parent unlock clears them.
- App backgrounding clears entered PIN/password state and invalidates an
  in-flight gate completion.
- Gate completion awaits child-mode deactivation before navigating.
- Root exemptions cover login, signup, email confirmation/check, forgot/reset
  password, callback, account reactivation, and the gate itself.
- Exact-language content caches evict a successful empty publication set;
  malformed/failed responses still retain the last known good cache.
- Legacy progress records remain unbound until a signed-in account proves child
  ownership through the `children` relation; the account binding is persisted
  before upload. A different parent cannot drain the queue.
- Achievements are now keyed and queried by child + exact language +
  achievement. Existing historical awards are explicitly backfilled to `lg`.
- Progress UPDATE triggers reject changes to child/language/activity/stage/level
  identity columns.
- Child Data API writes are reduced to allowlisted profile columns. Archive is
  performed by an ownership-checking RPC.
- The two unreachable legacy direct reactivation mutators were removed;
  reactivation and child restoration now have only the authenticated lifecycle
  RPC path used by the app.
- Parent and child profile editing and focused tests were added.
- Dead/placeholder settings rows were removed.

## 5. Parent profile-editing behavior

Reachable flow: **Parent Settings → Account → Edit parent profile**.

- The screen edits only `display_name`.
- Authenticated email is displayed read-only, with an explicit note that email
  changes are unavailable during closed beta.
- No phone, address, avatar, date of birth, gender, social, password-changing,
  payment, or email-changing flow was added.
- Names are Unicode-preserving, trimmed, nonblank when supplied, control-free,
  and limited to 80 characters.
- Initial loading, saving, success, validation, offline/network,
  authorization, and account-session-change states are represented.
- A mutable request guard prevents double submission.
- The repository checks the authenticated user before and after the request.
- The confirmed server value updates `ParentProfileContext` and the dashboard
  greeting immediately. A failed save leaves the last confirmed value intact.
- This is intentionally online-only; no new offline mutation queue was created.

The separate migration creates `parent_profiles(id, display_name)` because the
live public schema has no suitable parent profile table/field and existing Auth
user metadata contains no product display-name field.

## 6. Child profile-editing behavior

Reachable flow: **Parent Settings → Child profiles → child → Edit child
profile**.

- Editable fields are the existing name, exact age representation, optional
  gender, optional learning reason, and selected learning language.
- IDs, parent ownership, timestamps, deletion/archive internals, streak data,
  progress, and achievements are not writable.
- The existing 3–12 choices and `12+` handling/message are preserved.
- Historical nonstandard age strings remain unchanged until the parent chooses
  a supported exact value; they are not silently rewritten.
- The repository fetches/updates only an active child belonging to the current
  authenticated account and rechecks the account after the server update.
- Saving is server-first. Context, SecureStore active-child state, content
  caches, and UI state update only after a confirmed server response.
- Name/age/gender/reason edits do not touch progress tables.
- A language change requires confirmation explaining separate progress and no
  cross-language copying/fallback. Exact-language availability is refreshed
  before confirmation. A zero-content language is explained before the parent
  can continue.
- Previous-language progress remains stored. No Luganda cache, progress, or
  achievement is copied to Runyankole.
- Archived children are absent from the ordinary edit query/flow.
- A request guard prevents duplicate submission, and actionable validation,
  authorization, network, and session-change errors are shown.

## 7. Final settings inventory

Parent/account:

- Edit parent profile
- Parent PIN management
- Notifications
- Audio: independent background music and in-app sounds
- Privacy Policy
- Terms of Service
- Support/feedback
- About/version/build
- Sign out
- Account deletion with password reauthentication

Per child:

- Edit child profile
- Learning language, integrated into child edit
- Streak enable/disable and existing reset behavior, isolated per child
- Archive child profile with explicit non-permanent wording

Removed/hidden:

- Generic placeholder routes
- “Coming soon” settings
- Developer/debug information
- Redundant tour entry
- Permanent child deletion, reset-all-progress, data export, themes, social,
  advertising, payments, subscriptions, avatars, email change, and in-app
  password change were not added.

## 8. Migration statement inventory

### `20260723100638_closed_beta_security_hardening.sql`

- One explicit `BEGIN`/`COMMIT`; all statements are ordinary transactional
  PostgreSQL statements.
- 9 `ALTER TABLE` statements:
  - add `child_achievements.language_code`
  - set it `NOT NULL`
  - add its language foreign key
  - drop the old two-column unique constraint
  - add child/language/achievement uniqueness
  - enable RLS on four live tables
- 17 policy drops and 17 policy creations across languages, achievements,
  activities, child achievements, children, two progress tables, account
  deletion requests, and content.
- 32 `REVOKE` statements and 35 `GRANT` statements covering 12 tables and exact
  function signatures.
- 2 new/replace trigger functions with empty search paths; 2 trigger drops and
  2 trigger creates.
- 2 existing trigger-function search-path changes.
- 6 ordinary `CREATE INDEX IF NOT EXISTS` statements.
- 3 `UPDATE` statements:
  - 82 historical child-achievement rows: `language_code NULL → lg`
  - 1 Luganda curriculum row: published/startable → draft/unstartable
  - 2 unreviewed prototype story rows: published/startable → draft/unstartable
- No `DELETE`, table/column drop, extension, cron, HTTP/network, Auth, Storage,
  or sequence operation.
- The only constraint drop is the old child/achievement uniqueness, immediately
  replaced in the same transaction by child/language/achievement uniqueness.
- No `CREATE INDEX CONCURRENTLY`.
- Function calls use complete live signatures. No same-name overload was left
  with unintended execute permission.

### `20260723124201_closed_beta_profile_settings.sql`

- One explicit `BEGIN`/`COMMIT`.
- Creates `parent_profiles` and enables RLS.
- Creates 3 own-row policies: SELECT, INSERT, UPDATE with both `USING` and `WITH
  CHECK` where applicable.
- 4 revokes and 7 grants, including column-level grants.
- Removes table-level child INSERT/UPDATE from authenticated callers and grants
  only the six creation columns and five profile-edit columns.
- Creates/replaces 2 functions:
  - invoker trigger function enforcing changed name/age/gender values
  - SECURITY DEFINER archive RPC with empty search path and ownership/active
    checks
- Drops/creates 1 child edit trigger.
- No data `UPDATE`/`DELETE`, index, extension, cron, HTTP/network, or sequence
  operation.

### Transaction, lock, and failure analysis

- `ALTER TABLE`/RLS changes take strong table locks; trigger creation and policy
  changes also lock their target tables. The six non-concurrent index builds
  can block writes while each index is built. The three data updates take row
  locks and normal write locks.
- Expected live row counts are small, but apply during a quiet maintenance
  window and monitor lock waits.
- PostgreSQL rolls back all statements in a failed file because each file has
  an explicit transaction. If the two files are applied separately and the
  second fails, the first can legitimately remain committed.
- No external call or nontransactional concurrent index can outlive a rollback.
- The content publication decision and achievement-language classification are
  semantic changes. They are reversible only with deliberate forward SQL;
  security should not be broadly rolled back merely to restore content.

## 9. Exact live row-impact preview

The corrected predicates were executed as read-only SELECTs against the only
hosted project.

### Content: 3 rows

| ID | Language | Type/slug | Current live state | Readiness reason | Planned state |
| --- | --- | --- | --- | --- | --- |
| `5dee95be-cbe7-4abe-ab96-3c5964e52fb1` | `lg` | story / `family-at-home` | published, startable | prototype/placeholder metadata; not reviewed | draft, unstartable, no `published_at` |
| `f1f6deec-57e5-4935-84b0-702a88dcaa7f` | `lg` | learning_hub / `curriculum` | published, startable | incomplete curriculum payload | draft, unstartable, no `published_at` |
| `f430da29-d298-474e-9973-80d741ad2b34` | `lg` | story / `greetings-at-work` | published, startable | prototype/placeholder metadata; not reviewed | draft, unstartable, no `published_at` |

The already-draft/unstartable Runyankole prototype
`4a8ae736-015a-4ef3-8aa4-f6b356d0f834` is no longer matched and retains its
existing audit timestamp.

Eight reviewed/startable Luganda rows are not affected:

- `a143fd94-663a-4e0b-992e-195409c86f1a` — card game / `cards`
- `555beb7a-2a85-4133-a04f-e10ab86234d1` — child menu / `coloring`
- `43fcdb47-41e1-4584-b876-23ff2967952a` — child menu / `games`
- `794acd44-ab3f-4a45-9425-d0c82eb48b05` — child menu / `stories`
- `ba2551fc-7850-4921-a0da-2bbf3c1e647d` — counting game / `stages`
- `84de58da-eea8-427a-a219-c862817cd642` — learning game / `starter`
- `4eb8e553-7242-4b41-a18a-8d8a824a7212` — puzzle game / `puzzles`
- `c6fa27f7-831e-46b7-90a1-23d5fed7311d` — word game / `levels`

### Historical achievement language: 82 rows

All 82 existing rows have no language because the live column does not yet
exist. Historical awardable content was Luganda-only, so the migration
classifies exactly these non-sensitive child-achievement record IDs as `lg`.
No child IDs, account IDs, or email addresses are included here.

<details>
<summary>82 exact child-achievement record IDs</summary>

```text
01f06984-7398-4f95-b77f-29b9c29d6776
02482709-deec-43c0-bf34-dd2b1684a219
024dca97-636f-479d-bd54-12a0e96b4157
02b94163-bd8b-482c-b61e-2bb31c7f3a12
08b725af-5073-4c78-b913-e99a1058cbe8
0ab21996-21d3-48c4-8384-4ba5afae43d3
0e464777-6e7f-498c-9244-11ccbaf313c9
12ecff07-0c20-4df8-94a2-3624a20b4b42
13eda46e-3ad3-410e-8f92-030203ed26bc
1aef54c8-3e46-4c7f-bb89-109139253378
1dbc00b0-5129-4d0f-a265-693d22efc0b7
1f5bac09-31df-4a13-9650-8b0b111956f9
2037f218-b61c-4c44-beac-2d56799ffa65
246541a5-6afc-4c16-a0c7-e294af998673
24a74f3f-e443-4130-8826-567c61430804
276a2803-46d1-4c5b-8025-a07e095bfd40
2aafb8c8-1250-475b-b011-34fad2383147
2b0a2b32-ee16-465f-9840-c8ecc7a060d3
2f90d5d0-329a-4a72-bc2d-a62c127cde15
3109a5f5-6378-4167-8994-3e79b13d1af3
33c03732-f52f-4a1c-af94-e814013b2330
350f9769-3525-46ce-87cf-78822aa08259
384a455e-7162-43c8-9444-10be9e4f34cf
38e03c98-5371-43d6-8225-4a2fea86c8ea
3910b87c-dbb7-4cf4-99ef-03102de0b3fc
3c59591d-244e-4c6f-9b64-8c523b202cc3
3d448757-fe86-4e71-9c08-740aa047a531
437e4c9a-4e76-4621-873a-9f01b1cec3f7
447b76c4-6455-431a-b56c-9b90c93a7487
46ab2d69-7f5b-43d7-a48c-44ef1e9eb911
4a2b7cb6-aad4-4980-a1ea-96f278bb9ec5
518c4130-8ea0-4997-8a1a-b916d3853ab3
52fe38aa-0f32-43ea-a4a5-5a41b3087dd3
537c4d63-8e0a-4d62-9e6a-bdc09b5b82fa
57d8fd91-b1b1-4d91-af78-ad6daab1e41e
5d9d4c32-6f00-40e9-b749-e355904af8a7
6100c8dc-74f1-4a21-ae68-141bb1f92798
63973fd8-4a5e-4eab-834d-87b090a391a1
6b3847ef-b305-4b0f-ac7c-84a7a8abe720
6cd05138-de75-4025-883a-5d100800b96a
7499b468-6949-461b-a1a7-524b3c2d5b19
77b534f9-eb8b-49f6-af7d-c4439c91ac39
79142762-cba5-4499-a287-e5a4a0bd8ced
7e20fc68-00e7-4c87-93f9-aef031dee7f4
8368f573-03a7-4f8a-97e3-40316403f7f4
8665c633-2d60-4dab-b73f-feb3d45e122c
874b3b98-d227-4980-bc4c-8ab881f38d6c
8a58d669-23a1-4edc-ab81-951b68836168
8b772556-ebcc-43b3-815d-b92d79d86ddb
8c0fbcec-a6b2-4346-87b7-afe3e0941d13
8d36be41-97ac-4d8c-a4d2-a87f0f99f359
8d93e00c-6b08-43bb-8898-e4df8b4c6137
924dfbe8-fdd1-496f-8af1-1577adada675
93600ebd-4a4d-464c-a64f-a29f1b5516c5
9a0e1234-d540-47e3-9539-d63ccd821998
a08a05d2-c667-4446-8a6e-4525777e077d
a1669d66-6d48-489a-a2cb-ba99addef1fb
a348f266-6273-4e9b-81ab-2d2042ec71ec
a728c147-7fcb-486c-a0b6-18a26fc0a0d7
ae50a6e8-9ce2-4e02-84b9-eb917248bf6a
b2ebfab7-f646-46ce-bcab-a1148743d6bb
b34fb5a3-34f9-466b-9ddd-a1a7c47a3795
b674c4d2-4bc6-4520-b717-07cbcaea5415
b67dd907-a2ac-4dfc-bce5-e52e19ca8cc0
b93ae385-5ec0-4125-aea5-03fc379ff33b
bb2e7101-b10a-47ad-83c3-2a6bcafdfbdd
bd9a7a7a-f291-445a-857c-0668093b2382
cebeb28e-32ba-417a-890b-08697506b056
d47079a9-8104-45eb-8f9b-71d53a084886
d670b686-ee71-4b1e-a91e-091547255c52
d8127958-76cc-44c4-be10-c73279902b1e
d866792b-0b69-4db6-81c0-b6c935159c9b
d8f692c1-fa7b-44cd-bab8-edf112951082
df76c5ca-40a8-4d2b-ade4-651c49f56874
e0757a7d-5c06-4584-a9ab-227e236d58c1
e6156fc0-ee7f-4a66-858e-30cec1345996
ef05a631-41f2-4a24-b36b-72ad68f14203
f23fa1be-69a0-4627-9052-bdd6f15ea0ec
f2bd2ffd-5f1b-459a-ad8d-e8fec1188d57
f5095d76-36b7-45b8-944d-397037ecafc4
f74cf5fb-f6ec-4451-87ff-1d0f88b2e6ed
fcf82268-3ea5-4084-994a-bde576c048ed
```

</details>

### Child data relevant to the profile migration

- 23 child rows exist.
- 19 rows use historical age strings outside the new edit choices.
- The migration performs no child-row rewrite.
- Its UPDATE trigger validates only values that actually change, so all 19
  historical age values survive unchanged until a parent explicitly edits age.

There are no destructive deletes in either migration.

## 10. RLS access matrix after both migrations

`S/I/U/D` means SELECT/INSERT/UPDATE/DELETE. “Own” means ownership is resolved
through trusted `children.parent_id` or the authenticated profile key and
`auth.uid()`, never editable user metadata.

| Table/group | `anon` | Parent A | Parent B | `service_role` |
| --- | --- | --- | --- | --- |
| `languages` | S active only; no I/U/D | S active only; no I/U/D | same | S/I/U/D |
| `content_items` | S published + active + startable only; no I/U/D | same | same | S/I/U/D |
| `achievements` | no S/I/U/D | S; no I/U/D | S; no I/U/D | S/I/U/D |
| `children` | no S/I/U/D | S own; I own with allowlisted columns; U own allowlisted profile columns; no D | identical but only B-owned rows | S/I/U/D |
| `activities` | no S/I/U/D | S/I through active owned child; no U/D | only B-owned child | S/I/U/D |
| `child_achievements` | no S/I/U/D | S/I through active owned child; exact language required; no U/D | only B-owned child | S/I/U/D |
| both progress tables | no S/I/U/D | S/I/U through active owned child; identity reassignment rejected; no D | only B-owned child | S/I/U/D |
| streak tables | no S/I/U/D | S own; no direct I/U/D; ownership-checking RPC mutations | only B-owned child | S/I/U/D |
| `account_deletion_requests` | no S/I/U/D | S own; lifecycle RPC mutation only | S own | S/I/U/D |
| `parent_profiles` | no S/I/U/D | S/I/U own display name only; no D | own row only | S/I/U/D |

Additional conclusions:

- UPDATE has an applicable SELECT policy and both `USING` and `WITH CHECK`.
- Parent A cannot read, attach records to, or update Parent B's child.
- `parent_id`, child ID, archive/deletion fields, timestamps, and internal
  account-deletion fields have no authenticated UPDATE grant.
- Reference data is client-readable only as intended and not client-mutable.
- `service_role` retains table access and exact finalizer RPC access.
- Destructive finalizer helpers are not executable by PUBLIC, anon, or
  authenticated.
- Lifecycle and streak RPCs retain only their required authenticated access.
- Live public views: none.
- Affected sequences: none; all affected identifiers are UUID/text, so no
  sequence privilege is required.

## 11. App-call compatibility matrix

| Application source | Operation/role | Required post-migration access | Rehearsed result |
| --- | --- | --- | --- |
| `context/UserContext.tsx`, `lib/utils.ts`, `lib/accountManagement.ts` | child SELECT/INSERT and owned child lookup as authenticated parent | children SELECT; column INSERT; own-row policies | allowed for owner; cross-parent denied |
| `lib/childProfileRepository.ts` | active child SELECT and allowlisted UPDATE | children SELECT; UPDATE on name/gender/age/reason/language; own-row policy | owner succeeds; archive/cross-parent/session switch rejected |
| `lib/accountManagement.ts` | `archive_child_profile` | authenticated execute; SECURITY DEFINER internal owned-row update | owner active child applied; cross-parent/archived rejected |
| `lib/parentProfileRepository.ts` | profile SELECT/INSERT/UPDATE | own-row RLS; column grants | owner succeeds; other parent/anon denied |
| `lib/utils.ts` | activity SELECT/INSERT | SELECT/INSERT plus active-child RLS | owner succeeds; other child denied |
| `components/games/achievements/achievementManager.ts` | achievement SELECT; child-achievement SELECT/INSERT | authenticated reference SELECT and owned-child award policy | exact-language award succeeds; duplicate blocked; cross-parent denied |
| `lib/progressRepository.ts` | progress SELECT/upsert | SELECT/INSERT/UPDATE plus owned-active-child policies | upsert succeeds; language/child/stage identity move rejected |
| `lib/streakRepository.ts` | streak SELECT and five mutation RPCs | table SELECT; exact authenticated function execute | owner succeeds; Parent B denied; direct table mutations denied |
| `content/contentRepository.ts` | content SELECT as anon/authenticated | published/active/startable SELECT policy | exact-language eligible rows only |
| `lib/accountManagement.ts` | deletion request SELECT; request/reactivate RPC | own SELECT; lifecycle execute | four lifecycle API assertions passed |
| `supabase/functions/finalize-account-deletions/index.ts` | claim/finalize/complete/failure RPCs as service role | service-role execute only | service allowed; anon/auth denied |

Expected failure handling after migration:

- Unauthorized/cross-account child/profile calls return RLS/privilege failures or
  no owned row and are surfaced as authorization/session errors.
- Exact-language queries can honestly return empty arrays. They do not fall back
  to stale Luganda.
- Missing RPC is an application/deployment mismatch and is a hard post-apply
  failure indicator, not a cached success.
- Network failures retain last confirmed profile values and last-known-good
  content only where that cache is explicitly supported.

## 12. Local migration-rehearsal results

The repository migration folder is not a reconstructable production baseline,
so it was not used with `db reset`.

Rehearsal method:

1. Used current Supabase CLI `2.109.1`.
2. Created a schema-only logical dump from the linked project outside the
   repository. No hosted user data was dumped.
3. Started a fresh temporary Supabase stack outside the repository, including
   local Auth and PostgREST.
4. Restored the current hosted schema.
5. Added only synthetic local Auth users/parents/children/content/progress,
   achievements, and streak fixtures.
6. Applied the exact hardening migration, then the exact profile migration.
7. Exercised actual Data API requests and RPCs using anon, Parent A, Parent B,
   and service-role tokens.

Results:

- Hardening precheck: no language column; 1 synthetic achievement backfill row;
  2 synthetic content withdrawals.
- Hardening apply: success.
- Profile precheck: no profile table/RPC; 1 legacy age fixture.
- Profile apply: success.
- RLS/Data API/grant/RPC matrix: **84/84 checks passed**.
- Account-deletion request/reactivation lifecycle: **4/4 checks passed**.
- Postconditions:
  - 13 affected tables have the intended RLS state.
  - all 6 indexes exist.
  - 0 NULL achievement languages.
  - 1 synthetic historical achievement classified as Luganda.
  - 2 incomplete synthetic content rows withdrawn.
  - reviewed Luganda and already-draft Runyankole fixtures unchanged.
  - legacy age preserved exactly.
  - all 3 new enforcement triggers present.
- `supabase db lint --local --level warning`: exit 0, with one pre-existing
  unused-variable warning (`v_preferences` in `create_child_streak_state`).
- No Auth/Storage production data was required; local Auth supplied synthetic
  users.
- The temporary Supabase stack, schema dump, and synthetic data were destroyed
  after verification.

## 13. Tests added or materially strengthened

New focused suites:

- `lib/__tests__/profileValidation.test.ts`
- `lib/__tests__/parentProfileRepository.test.ts`
- `lib/__tests__/childProfileRepository.test.ts`
- `app/parent/settings/__tests__/editParentProfile.test.tsx`
- `app/parent/settings/__tests__/editChildProfile.test.tsx`
- `supabase/migrations/__tests__/closedBetaProfileSettings.test.ts`

Strengthened existing coverage:

- active child restoration, corrupt/unavailable SecureStore, ownership,
  archive, account switch, and fail-closed startup
- root adult-route exemptions and no self-redirect
- parent gate cooldown, lifecycle clearing, password fallback, and awaited
  deactivation
- isolated reauthentication and account-deletion reauthentication
- RPC-only account reactivation/restoration after hardened grants
- exact-language content cache eviction/no fallback
- account-proofed legacy queues, language-separated progress, and identity
  protections
- language-scoped achievements and duplicate prevention
- settings reachability and no placeholder rows
- hardening migration contracts and exact function signatures

The SQL source-contract tests are not represented as runtime RLS proof. Runtime
proof is the separate 84-check local Data API/RPC rehearsal. No skipped/focused
tests were found. Fake timers are confined to behaviors that actually depend on
cooldowns, retries, or time. One stale navigation test mock was corrected to
provide `useFocusEffect`; product expectations were not weakened.

## 14. Final commands and results

Initial baseline before corrections:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npx jest --runInBand --watchAll=false` | 100 suites, 726 tests passed |
| `npm run lint` | pass |
| `npx expo-doctor` | 18/18 checks passed |
| `npm audit --omit=dev` | 0 vulnerabilities |

Final verification results are recorded here after the full clean rerun:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npx jest --runInBand --watchAll=false` | 106 suites, 767 tests passed; 0 skipped; 0 snapshots |
| `npm run lint` | pass |
| `npx expo-doctor` | 18/18 checks passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Android JavaScript export to temporary directory | pass; 2,325 modules, 212 assets, 7.43 MB Hermes bundle |
| removed-route/import search | pass |
| production console side-effect AST audit | 207 files, 299 console calls, 0 effectful console arguments |
| secret filename/signature scan | 0 private-key/service-key/password-URL token matches; `.env` is ignored and untracked |
| `git diff --check` | pass; only existing LF→CRLF working-tree notices |

`npm ci` was not required: the lockfile and installed dependency graph resolve,
the focused suites run, and Expo Doctor/audit verify the dependency state.

## 15. Files changed by the independent correction/settings pass

Security/session/content/progress corrections:

- `app/_layout.tsx`
- `app/child/parent-gate.tsx`
- `context/ChildContext.tsx`
- `lib/activeChildSession.ts`
- `lib/parentAccess.ts`
- `lib/accountManagement.ts`
- `lib/progressRepository.ts`
- `content/contentRepository.ts`
- `components/games/achievements/achievementManager.ts`
- `components/games/achievements/achievementTypes.ts`
- `components/games/achievements/useAchievements.ts`

Profile/settings implementation:

- `app/parent/index.tsx`
- `app/parent/settings.tsx`
- `app/parent/settings/account.tsx`
- `app/parent/settings/child-profile-detail.tsx`
- `app/parent/settings/edit-parent-profile.tsx`
- `app/parent/settings/edit-child-profile.tsx`
- `context/ParentProfileContext.tsx`
- `lib/childProfileOptions.ts`
- `lib/childProfileRepository.ts`
- `lib/parentProfileRepository.ts`
- `lib/profileValidation.ts`

Database and tests:

- both migration files listed below
- both migration contract suites
- the six new profile suites listed above
- the existing active-session, gate, context, content, progress, achievement,
  account-management, routing, and settings suites touched by the focused fixes

This list identifies this independent pass. The much larger uncommitted Max
readiness diff remains present and was not discarded.

## 16. Migrations changed/created

1. Corrected in place, because read-only migration history proves it is
   unapplied:
   `20260723100638_closed_beta_security_hardening.sql`
   - SHA-256:
     `cd91225d26b3f0f3aaa8edd597e227e0e94877c8feca0f0e92c6137951802bd9`
2. Created as a separate later schema/profile change:
   `20260723124201_closed_beta_profile_settings.sql`
   - SHA-256:
     `9259a451d335f23bb4b4598f2ce1d90908ca5d33c455b601d5738f4c27c98afd`

Live migration history ends at `20260721140831`; neither pending version is
recorded in project `ydtxgwlnldfuqamhxfqi`. Both files remain unapplied
remotely.

## 17. Exact migration application procedure

Do not use `db reset`, `migration repair`, or a blind `db push`; this repository
does not contain a complete historical reconstruction baseline.

1. Close external release gates that can affect recovery: identify the operator,
   maintenance window, and incident owner.
2. Obtain a fresh downloadable physical backup or verified logical
   schema/data backup outside the repository. Record backup timestamp and
   restoration target.
3. Re-run the read-only prechecks below. Abort on any changed count, signature,
   object definition, policy, grant, or migration-history result.
4. Recompute both SHA-256 hashes and compare them with section 16.
5. Run the deployment tool's dry run. It must propose **exactly**
   `20260723100638` followed by `20260723124201`, and nothing older or
   unrelated. If it proposes anything else, abort; do not repair history.
6. Apply the hardening SQL as migration version `20260723100638`.
7. Run the hardening subset of section 18 before proceeding.
8. Apply the profile SQL as migration version `20260723124201`.
9. Run all SQL and app smoke tests in section 18.
10. Re-run Supabase security/performance advisors and retain results with the
    release record.
11. Only after post-verification passes, produce an internal QA build and begin
    the manual device checklist.

Pre-application SQL:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('20260723100638', '20260723124201')
order by version;

select
  to_regclass('public.parent_profiles') as parent_profiles,
  to_regprocedure('public.archive_child_profile(uuid)') as archive_rpc,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'child_achievements'
      and column_name = 'language_code'
  ) as achievement_language_exists;

select
  count(*) as historical_achievement_rows,
  md5(string_agg(id::text, ',' order by id)) as stable_id_digest
from public.child_achievements;

select id, language_code, content_type, slug, editorial_status,
       is_startable, published_at
from public.content_items
where id in (
  '5dee95be-cbe7-4abe-ab96-3c5964e52fb1',
  'f1f6deec-57e5-4935-84b0-702a88dcaa7f',
  'f430da29-d298-474e-9973-80d741ad2b34',
  '4a8ae736-015a-4ef3-8aa4-f6b356d0f834'
)
order by id;

select jobid, jobname, schedule, active
from cron.job
where jobname = 'finalize-account-deletions-daily';
```

Expected prechecks:

- no rows for the two pending migration versions
- `parent_profiles`, archive RPC, and achievement language column absent
- 82 historical achievement rows with stable-ID digest
  `7f36f66284c55647729dda2759728361`
- the first three content IDs published/startable and the Runyankole ID already
  draft/unstartable
- exactly one active deletion job at `0 2 * * *`

## 18. Exact post-application SQL and app smoke tests

Post-application SQL:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('20260723100638', '20260723124201')
order by version;

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'languages', 'content_items', 'achievements', 'activities',
    'children', 'child_achievements', 'child_activity_progress',
    'child_stage_progress', 'child_streak_epochs',
    'child_streak_preferences', 'child_streak_days',
    'account_deletion_requests', 'parent_profiles'
  )
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'languages', 'content_items', 'achievements', 'activities',
    'children', 'child_achievements', 'child_activity_progress',
    'child_stage_progress', 'account_deletion_requests',
    'parent_profiles'
  )
order by tablename, policyname;

select
  has_table_privilege('anon', 'public.children', 'select') as anon_child_select,
  has_table_privilege('authenticated', 'public.children', 'select')
    as auth_child_select,
  has_column_privilege('authenticated', 'public.children', 'name', 'update')
    as auth_child_name_update,
  has_column_privilege('authenticated', 'public.children', 'parent_id', 'update')
    as auth_child_parent_update,
  has_column_privilege('authenticated', 'public.parent_profiles', 'display_name', 'update')
    as auth_display_name_update,
  has_column_privilege('authenticated', 'public.parent_profiles', 'id', 'update')
    as auth_profile_id_update;

select
  has_function_privilege(
    'authenticated',
    'public.archive_child_profile(uuid)',
    'execute'
  ) as auth_archive,
  has_function_privilege(
    'anon',
    'public.archive_child_profile(uuid)',
    'execute'
  ) as anon_archive,
  has_function_privilege(
    'authenticated',
    'public.claim_expired_account_deletion_requests(integer,boolean)',
    'execute'
  ) as auth_finalizer,
  has_function_privilege(
    'service_role',
    'public.claim_expired_account_deletion_requests(integer,boolean)',
    'execute'
  ) as service_finalizer;

select
  count(*) filter (where language_code is null) as null_languages,
  count(*) filter (where language_code = 'lg') as luganda_rows
from public.child_achievements;

select id, language_code, content_type, slug, editorial_status,
       is_startable, published_at
from public.content_items
where id in (
  '5dee95be-cbe7-4abe-ab96-3c5964e52fb1',
  'f1f6deec-57e5-4935-84b0-702a88dcaa7f',
  'f430da29-d298-474e-9973-80d741ad2b34',
  '4a8ae736-015a-4ef3-8aa4-f6b356d0f834'
)
order by id;

select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'enforce_child_activity_progress_identity',
    'enforce_child_stage_progress_identity',
    'enforce_child_profile_edit_contract'
  )
order by trigger_name;

select jobid, jobname, schedule, active
from cron.job
where jobname = 'finalize-account-deletions-daily';
```

Expected privilege booleans in order:

- `anon_child_select = false`
- `auth_child_select = true`
- `auth_child_name_update = true`
- `auth_child_parent_update = false`
- `auth_display_name_update = true`
- `auth_profile_id_update = false`
- `auth_archive = true`
- `anon_archive = false`
- `auth_finalizer = false`
- `service_finalizer = true`

Post-application app smoke tests:

1. Create two synthetic QA parents and one active child for each.
2. Parent A can load/update only A's display name; email remains read-only.
3. Parent A can edit A's active child and cannot fetch/update B's child ID.
4. Name/age/reason change keeps existing progress and achievements unchanged.
5. Change A's child from `lg` to `nyn`: see the zero-content warning, confirm,
   observe no Luganda cards/content/achievements, then switch back and verify
   prior Luganda progress remains.
6. Complete one exact-language activity offline, restart, reconnect, and verify
   exactly one progress/achievement write.
7. Switch from Parent A to Parent B while A has a legacy/pending queue item;
   verify B cannot upload it.
8. Toggle/reset each child's streak and verify the other child is unchanged.
9. Archive A's child; it disappears from ordinary selection, cannot reopen in
   child mode, and B cannot invoke archive on it.
10. Request and reactivate deletion using password reauthentication; verify the
    primary app session remains stable.
11. Invoke no finalizer helper from an anon/authenticated client; verify the
    calls are denied. Exercise the worker only through its normal service path.
12. Verify the three withdrawn content IDs are invisible through anon/auth Data
    API and all eight reviewed Luganda rows remain available.

## 19. Manual device QA checklist

- Fresh install/no session: login/signup/recovery routes render; no blank screen.
- Authenticated parent/no child: dashboard and child creation render.
- Restored active child after force-stop: child route restores without adult
  flash.
- Missing, corrupt, archived, and cross-account active-child markers fail
  closed and require parent authentication.
- PIN create/confirm/change/reset; wrong PIN; fifth failure; cooldown; correct
  PIN afterward; password fallback; SecureStore unavailable.
- Background/foreground and force-stop during PIN/password entry; hardware back;
  modal dismissal; orientation change.
- Direct deep links to `/child-list`, every `/parent/*` route, notifications,
  account deletion, edit parent, and edit child while child mode is active.
- Confirm no redirect loop and no “Couldn't find a navigation context” message.
- Dashboard → child detail → child mode → parent gate → parent screen; invalid,
  missing, archived IDs; back navigation.
- Parent profile initial load/save/success/validation/offline/auth failure and
  dashboard refresh.
- Child valid edit, 3/12/12+, legacy age, unauthorized ID, archive, network
  failure, duplicate tap, language confirmation, zero-content language, and
  context/SecureStore refresh.
- Multi-child progress, language, streak, and cache isolation.
- Offline completion → force-stop → reconnect; duplicate-achievement
  prevention; hydration cooldown.
- Luganda eligible story/lesson/card/puzzle routes and real completion.
- Runyankole exact empty state with no Luganda content/cache/achievement.
- Publication demotion refresh removes stale content without deleting drafts.
- Coloring Save: allow, deny, permanent denial, cancellation, failure; no Share.
- Museum has no video/WebView/YouTube path.
- Notifications grouped; background music and in-app sounds independent.
- Privacy, Terms, Support, About/version/build, sign-out, account deletion,
  archive, and parent PIN rows all work; no “coming soon.”

## 20. External blockers

These are not repository-test failures, but they block tester distribution:

- Rotate the account-deletion cron/Edge shared secret before beta. A read-only
  catalog review exposed the current value to the verification tool output; it
  is intentionally omitted from this report.
- Apply both migrations after backup and pass all post-application checks.
- Enable Supabase leaked-password protection and schedule the available
  PostgreSQL security upgrade after reviewing release notes.
- Configure and verify production SMTP/deliverability for confirmation,
  recovery, and account lifecycle mail.
- Complete Google Play closed-testing track setup, signing, tester list, Data
  safety, content rating, target audience/families declarations, privacy URL,
  store copy, screenshots, icon/feature graphic, and review access.
- Obtain owner/legal review of Privacy Policy, Terms, child-data disclosures,
  support/feedback details, and published legal URLs.
- Pass the critical Android device checklist above using the same release
  configuration that will be submitted.

## 21. Rollback and forward-corrective strategy

Default response to an issue is a forward corrective migration. Do not disable
RLS or restore broad grants.

### Content-only restoration

If editorial review explicitly decides to restore the three rows, the exact
pre-migration publication/audit values were:

- `editorial_status = 'published'`
- `is_startable = true`
- `published_at = '2026-07-18 09:00:00+00'`
- `updated_at = '2026-07-19 15:03:35.372674+00'`

Apply only after verifying the IDs/payloads still match:

```sql
begin;
alter table public.content_items
  disable trigger set_content_items_updated_at;

update public.content_items
set editorial_status = 'published',
    is_startable = true,
    published_at = '2026-07-18 09:00:00+00',
    updated_at = '2026-07-19 15:03:35.372674+00'
where id in (
  '5dee95be-cbe7-4abe-ab96-3c5964e52fb1',
  'f1f6deec-57e5-4935-84b0-702a88dcaa7f',
  'f430da29-d298-474e-9973-80d741ad2b34'
);

alter table public.content_items
  enable trigger set_content_items_updated_at;
commit;
```

### Achievement-language reversal

Only before any post-migration award is written and only with a simultaneous
application rollback, a corrective migration can restore the old shape:

```sql
begin;
do $$
declare
  v_count bigint;
  v_digest text;
begin
  select count(*), md5(string_agg(id::text, ',' order by id))
  into v_count, v_digest
  from public.child_achievements;

  if v_count <> 82
     or v_digest <> '7f36f66284c55647729dda2759728361'
  then
    raise exception
      'Achievement set changed after hardening; use a forward correction.';
  end if;
end
$$;

alter table public.child_achievements
  drop constraint child_achievements_unique_child_language_achievement;
alter table public.child_achievements
  drop constraint child_achievements_language_code_fkey;
alter table public.child_achievements
  alter column language_code drop not null;
update public.child_achievements
set language_code = null
where language_code = 'lg';
alter table public.child_achievements
  add constraint child_achievements_unique_child_achievement
  unique (child_id, achievement_id);
alter table public.child_achievements
  drop column language_code;
commit;
```

Do not use that reversal after a language-scoped client is released. Correct
wrong classifications by explicit record ID/language instead.

### Profile migration failure

- If the second migration fails, leave the successfully applied hardening
  migration in place.
- Keep profile-edit UI out of the distributed build or roll the app release
  back, then ship a new corrective migration.
- Do not drop `parent_profiles` after real writes without exporting the rows.
- Do not restore generic child table UPDATE. Fix the specific column grant,
  policy, trigger, or RPC signature.

Failure indicators requiring an immediate release stop:

- either migration version absent after the operator reports success
- any NULL achievement language or duplicate child/language/achievement tuple
- any expected RLS table disabled
- anon/auth finalizer execute privilege
- authenticated `children.parent_id`/lifecycle UPDATE privilege
- Parent A access to Parent B's rows
- missing archive/streak/lifecycle RPC
- reviewed Luganda rows missing or any Runyankole→Luganda fallback
- a second deletion cron

## 22. Remote-change confirmation

This verification used only read-only live catalog/data/advisor/migration
queries and a schema-only dump. It did **not** apply either migration and did
not execute remote DDL, DML, GRANT, REVOKE, policy, Auth, function, trigger,
extension, or cron changes.

No remote database state, cron job, Auth setting, Edge Function, website,
signed/mobile build, Google Play listing, tester track, or release artifact was
created or changed. The only database writes occurred in the destroyed
temporary local Supabase rehearsal with synthetic users/data.

## Official Supabase references used

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Data API security and table privileges](https://supabase.com/docs/guides/api/securing-your-api)
- [Database functions and SECURITY DEFINER guidance](https://supabase.com/docs/guides/database/functions)
- [Column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Restoring a downloaded backup](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup)
- [Cron](https://supabase.com/docs/guides/cron)
- [Supabase changelog](https://supabase.com/changelog?types=breaking-change)
