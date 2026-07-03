# finalize-account-deletions

Secure Supabase Edge Function for permanent account deletion after the 30-day grace period.

## Required Secrets

Set these only in Supabase/server-side configuration:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET` to the Expo React Native app.

## Deploy

```bash
supabase functions deploy finalize-account-deletions
supabase secrets set BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET="<strong random secret>"
```

## Dry Run

The endpoint defaults to dry-run mode:

```bash
curl -sS -X POST "$SUPABASE_FUNCTION_URL/finalize-account-deletions" \
  -H "content-type: application/json" \
  -H "x-baby-steps-admin-secret: $BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET" \
  -d '{ "dryRun": true, "limit": 10 }'
```

## Real Run

Real deletion finalization requires `POST` with `mode=run`. Sending `dryRun: false`
without `mode=run` remains a dry run.

```bash
curl -sS -X POST "$SUPABASE_FUNCTION_URL/finalize-account-deletions" \
  -H "content-type: application/json" \
  -H "x-baby-steps-admin-secret: $BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET" \
  -d '{ "mode": "run", "limit": 25 }'
```

## Scheduling

Configure a daily scheduled invocation in Supabase with:

- Method: `POST`
- Body: `{ "mode": "run", "limit": 25 }`
- Header: `x-baby-steps-admin-secret: <secret>`

The database migration keeps requests retryable if a run is interrupted.
