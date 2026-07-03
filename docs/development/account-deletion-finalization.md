# Account Deletion Finalization

## Current Production Architecture

Baby Steps account deletion has two phases:

1. The app lets a signed-in parent request deletion. The database RPC `request_account_deletion_with_grace` creates or reuses an open request, archives active child profiles, sets `grace_ends_at` to 30 days after `requested_at`, and signs the user out.
2. After `grace_ends_at`, a trusted Supabase Edge Function finalizes deletion with service-role credentials. The mobile app never receives the service-role key and never calls Supabase Admin Auth.

The finalizer is:

- Edge Function: `supabase/functions/finalize-account-deletions`
- Admin secret env var: `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET`
- Service env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Admin header: `x-baby-steps-admin-secret`
- Optional auth header: `Authorization: Bearer <BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET>`

The endpoint defaults to dry-run mode. A real run requires a `POST` request with JSON `{ "mode": "run" }` or a `mode=run` query parameter. JSON `{ "dryRun": false }` is not a real-run trigger.

## Database Helpers

Migration `20260702002000_add_account_deletion_finalizer.sql` adds service-role-only helpers:

- `claim_expired_account_deletion_requests(p_limit, p_dry_run)`
- `finalize_expired_account_deletion_request_app_data(p_request_id, p_dry_run)`
- `complete_finalized_account_deletion_request(p_request_id, p_auth_user_deleted_at)`
- `record_account_deletion_finalization_failure(p_request_id, p_error)`

The claim helper uses `FOR UPDATE SKIP LOCKED` for retry-safe batch work. The app-data helper validates that the request is still `requested` or `processing`, has an expired grace period, and has not completed.

## Data Deleted Or Anonymized

The finalizer deletes user-owned app data tied to the parent account:

- `child_achievements`
- `child_stage_progress`
- `child_activity_progress`
- `activities`
- `children`

It anonymizes the retained request row:

- `email = NULL`
- `note = NULL`
- `archived_child_ids = ARRAY[]::uuid[]`
- final timestamps and attempt metadata are retained

`account_deletion_requests.user_id` becomes nullable and uses `ON DELETE SET NULL`, so after the Supabase Auth user is deleted the request can remain as a minimal operational deletion log.

## Data Intentionally Excluded

The finalizer does not delete shared/global app content:

- `content_items`
- `achievements`
- `languages`
- bundled stories, games, lessons, and assets
- migrations, developer docs, and seed/static content

No payment, subscription, notification token, device token, uploaded artwork, saved artwork metadata, or parent profile tables currently exist in the inspected schema. Add those tables to the finalizer before launching features that store that kind of user-owned data.

## Storage Cleanup

No Supabase Storage buckets or user-owned storage paths are currently defined in migrations or app code. Storage cleanup is therefore a no-op today.

Future user-owned storage should use predictable prefixes such as `users/{user_id}/...` or `children/{child_id}/...`, and the Edge Function should delete those objects before `supabase.auth.admin.deleteUser`.

## Failure And Retry Behavior

The finalizer is idempotent:

- Expired `requested` and `processing` rows are eligible.
- Already-deleted app rows produce zero delete counts on retry.
- App data is deleted before Auth deletion.
- Supabase Auth deletion happens only in the Edge Function.
- After Auth deletion, the request row is retained with `user_id = NULL` and can still be marked completed.
- Failures keep the request in `processing` with a sanitized `finalization_error`, so normal app access remains blocked and the next run can retry.

## Manual Invocation

Dry-run:

```bash
curl -sS -X POST "$SUPABASE_FUNCTION_URL/finalize-account-deletions" \
  -H "content-type: application/json" \
  -H "x-baby-steps-admin-secret: $BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET" \
  -d '{ "dryRun": true, "limit": 10 }'
```

Real run:

```bash
curl -sS -X POST "$SUPABASE_FUNCTION_URL/finalize-account-deletions" \
  -H "content-type: application/json" \
  -H "x-baby-steps-admin-secret: $BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET" \
  -d '{ "mode": "run", "limit": 10 }'
```

## Scheduling

Configure a daily Supabase scheduled invocation after deploying the function. If scheduling is not configured yet, run the real invocation manually from a trusted admin environment.

Example schedule intent:

```text
Daily: POST /functions/v1/finalize-account-deletions
Headers: x-baby-steps-admin-secret: <secret>
Body: { "mode": "run", "limit": 25 }
```

## Manual QA

1. Apply all migrations.
2. Deploy `finalize-account-deletions`.
3. Set `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET` and confirm `SUPABASE_SERVICE_ROLE_KEY` is only configured in the Supabase/server environment.
4. Create a test account.
5. Create at least one child and generate activity/progress/achievement rows.
6. Request account deletion in the app.
7. Manually set that request's `grace_ends_at` to a timestamp in the past in the test database.
8. Run the finalizer in dry-run mode and confirm the account is reported with expected row counts.
9. Run the finalizer with `{ "mode": "run" }`.
10. Confirm child-owned rows and child profiles are deleted.
11. Confirm `content_items`, `achievements`, and `languages` are unchanged.
12. Confirm the Supabase Auth user is deleted.
13. Confirm login fails for the old account.
14. Confirm signing up with the same email creates a fresh account with no old child/progress data if that is the intended Auth configuration.
15. Confirm the retained deletion request row is minimal: no email, no note, no archived child ids, `status = completed`, and final timestamps set.

## Production TODOs

- Verify `hello@babystepslearn.com` is owned and monitored.
- Host `docs/delete-account.html` publicly and link the hosted page from store review materials.
- Deploy the Edge Function to the production Supabase project.
- Set `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET`.
- Configure the daily scheduled invocation.
- Run the manual QA steps above against a non-production/test account before production scheduling.
- Re-run static checks before store submission.
- Update Play Console/App Store review notes to describe the 30-day grace period and secure server-side finalization.
