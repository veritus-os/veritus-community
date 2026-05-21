# Checkout Auth Seed

Temporary seed script for the four pilot checkout users:

- `recepcao@cav.local`
- `infantil@cav.local`
- `fundamental@cav.local`
- `suporte@cav.local`

## Required environment

Export these before running the script:

```bash
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
export CHECKOUT_TEST_PASSWORD="TempPasswordHere"
```

## Run

```bash
node scripts/seed/seed-checkout-auth-users.js
```

## Behavior

- Creates each user if the email does not exist.
- If the email already exists, updates `user_metadata` only.
- Uses `email_confirm: true` when creating users.
- Fails safely if any required environment variable is missing.
- Uses the Supabase Auth Admin HTTP API directly, so it does not require a Node websocket transport.
- Requires the service-role key to have permission to manage Auth users.

## Notes

- Do not commit `.env` or any secret values.
- Use a temporary password only for pilot testing.
- Rotate or remove the test accounts after the demo if they are no longer needed.
