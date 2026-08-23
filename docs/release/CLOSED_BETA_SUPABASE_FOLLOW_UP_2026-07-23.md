# Closed-beta Supabase follow-up

**Prepared:** 2026-07-23

**Expected linked project:** `ydtxgwlnldfuqamhxfqi`

No production mutation was made during the readiness pass. Complete this procedure with an authorized operator, an approved maintenance window, and a current restorable backup.

## 1. Apply the hardening migration safely

1. Confirm the CLI is linked to the expected project and compare local/remote history:

   ```bash
   npx supabase@2.109.1 migration list --linked
   ```

2. Review `supabase/migrations/20260723100638_closed_beta_security_hardening.sql` with a second operator. It enables four missing RLS boundaries, narrows Data API grants, restricts account-deletion/streak helpers, fixes trigger search paths, adds advisor-requested indexes, and demotes unreviewed content without deleting it.
3. Take or verify a current restorable backup. Rehearse the migration in an isolated/staging project populated with two unrelated test parents.
4. Preview the remote change:

   ```bash
   npx supabase@2.109.1 db push --linked --dry-run
   ```

5. Apply only after the preview matches the reviewed migration:

   ```bash
   npx supabase@2.109.1 db push --linked
   ```

6. Re-run `migration list --linked`, inspect table RLS/policies/function grants, and run both Security and Performance Advisors. Save the findings and disposition; do not weaken ownership policies to clear an application error.
7. Confirm anonymous/authenticated clients can read only active published/startable reference content and cannot mutate reference tables.

Rollback is not a blind down migration. If application access fails, first stop tester distribution and inspect the exact missing grant/policy. Restore the pre-change database only for a confirmed destructive or unrecoverable outcome. Do not broadly grant tables to `anon` or disable RLS.

## 2. Two-parent isolation QA

Use two unrelated ordinary authenticated accounts, Parent A and Parent B. Do not use a service-role client for any assertion.

1. Give each parent one active child and create distinct rows in `activities`, `child_achievements`, `child_activity_progress`, `child_stage_progress`, streak preferences/epochs/days, and account-deletion state where applicable.
2. As Parent A, verify own rows are readable and supported writes/RPCs succeed.
3. As Parent A, attempt to select Parent B's child and related rows by exact UUID. Expect zero rows or an authorization error.
4. Attempt inserts/updates that name Parent B's child in every writable table/RPC. Expect rejection.
5. Repeat A↔B.
6. Archive a child and verify it is not selectable and cannot receive new client activity/progress/achievement/streak writes.
7. Verify `content_items` returns only `is_active = true`, `editorial_status = 'published'`, `is_startable = true`; verify `nyn` requests never return `lg`.
8. Verify `languages` is read-only and active-only, and `achievements` is read-only to signed-in clients.
9. Sign out and confirm account-scoped local active-child state and visible pending-write counts do not expose the previous account.

## 3. Advisor review

After applying the migration:

- Confirm RLS is enabled on `languages`, `achievements`, `activities`, and `child_achievements`.
- Confirm trigger functions no longer report mutable `search_path`.
- Confirm finalizer helpers are executable only by `service_role`.
- Review any remaining `SECURITY DEFINER` warnings function by function for explicit `search_path`, ownership checks, and minimum grants.
- Enable and validate leaked-password protection if compatible with the chosen Supabase Auth plan.
- Plan an approved Postgres platform upgrade if the Advisor still reports a vulnerable database build.
- Measure new indexes before removing any "unused" index; a fresh or low-traffic beta can make that Advisor signal misleading.

## 4. Deletion finalizer

Read-only inspection on 2026-07-23 found one active Edge Function named `finalize-account-deletions` and exactly one active cron job named `finalize-account-deletions-daily` at `0 2 * * *`. Do not create a duplicate schedule.

With authorized production access:

1. Compare deployed function source/version with `supabase/functions/finalize-account-deletions`.
2. Confirm `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` exist only in the server environment. Verify presence/rotation without printing values.
3. Invoke the endpoint in its default/dry-run mode from a trusted admin environment using `x-baby-steps-admin-secret`; confirm output contains request IDs/counts only and no email, child name, token, or secret.
4. In a staging project, create a disposable parent with representative child/progress/achievement rows, request deletion, simulate expiry, dry-run, then invoke `{ "mode": "run" }`.
5. Confirm app rows are removed, Auth is deleted, the retained request is anonymized, shared content remains, retry is idempotent, and a new account cannot see old data.
6. Observe the next daily production execution and retain an anonymized success record.
7. Configure failure monitoring/alerts for invocation failures and requests stuck in `processing`; name the on-call owner and retry procedure.

## 5. SMTP and authentication operations

1. Configure custom SMTP in Supabase Auth using a sender on a domain controlled by Baby Steps.
2. Publish and verify SPF, DKIM, and DMARC; confirm the From name/address and monitored reply path.
3. Brand and review signup confirmation, password reset, email-change, and other enabled templates. Never include child names or progress.
4. Verify allowed redirect URLs use the existing `babysteps` scheme and the production callback paths.
5. Set defensible Auth/email rate limits and confirm resend UI matches them.
6. Test signup confirmation and password reset delivery to Gmail plus a second provider, including spam-folder placement, expiry, replay, and wrong-device handling.

## 6. Backup and restore

1. Record backup retention, point-in-time recovery availability, encryption, region, responsible owner, and restore-time objective.
2. Restore a recent backup into an isolated project.
3. Validate row counts, constraints, RLS/policies, functions, grants, migration history, content publication state, and Auth linkage without contacting real users.
4. Run the two-parent isolation matrix against the restored project.
5. Record the restore duration and evidence, then destroy the isolated copy under the approved data-handling process.
