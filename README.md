# Air Quality Dashboard

An Angular dashboard for the [Air Quality Checker](../air-quality-checker) project.

---

## Tech Stack

- **Frontend:** Angular 20, Angular Material, Chart.js
- **Backend / Database:** Supabase (Postgres, Auth, Realtime)
- **Deployment:** Vercel (frontend), Supabase CLI (database)

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

The Supabase CLI is included as a dev dependency, so you don't need to install it globally.

### 2. Create and configure a Supabase project

1. Log in to Supabase:
   ```bash
   npx supabase login
   ```

2. Create a new cloud project:
   ```bash
   npx supabase projects create --org-id <your-org-id> --region <your-region> --plan free air-quality-dashboard
   ```
   Note the new project ref (e.g. `abcdefgh12345678`).

3. Link the local project to the cloud project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

4. Deploy the migrations:
   ```bash
   npx supabase db push
   ```
   This creates the `rooms`, `sensors`, and `air_quality_data` tables, enables realtime, and sets up RLS policies.

5. Seed the default room and sensor:
   ```bash
   npx supabase db reset --linked
   ```
   **Warning:** `db reset` drops and recreates the database. Only use it when starting fresh.

   Alternatively, run the seed SQL manually from the Supabase SQL Editor:
   ```sql
   \i supabase/seed.sql
   ```

6. Copy `.env.example` to `.env` and fill in your new credentials:
   ```bash
   cp .env.example .env
   ```
   Update:
   ```
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   ```

### 3. Run the dashboard locally

```bash
npm start
```

The `prestart` script generates `src/environments/environment.ts` from `.env` automatically.

### 4. Create a user

Open the Supabase dashboard, go to **Authentication > Users**, and create a user. Use those credentials to log in.

---

## Updating the Database Schema

All schema changes must be expressed as migrations in `supabase/migrations/`.

To add a new migration:

```bash
npx supabase migration new <descriptive-name>
```

Edit the generated file, then push:

```bash
npx supabase db push
```

Or use the provided script:

```bash
# Bash / Git Bash / WSL
./scripts/deploy-supabase.sh

# Windows Command Prompt
scripts\deploy-supabase.bat
```

---

## Vercel Deployment

Set these environment variables in the Vercel dashboard:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Your new anon key |

The build command (`npm run build`) uses `generate-env.js` to inject these into the Angular environment files.

---

## Device Configuration

The sensor device posts readings with the service role key. After creating the new Supabase project:

1. Go to **Project Settings > API** in Supabase and copy the `service_role` key.
2. Update `../air-quality-checker/src/secrets.h`:
   ```c
   #define API_KEY   "<your-new-service-role-key>"
   #define API_URL   "https://<your-project-ref>.supabase.co/rest/v1/air_quality_data"
   ```
3. Rebuild and reflash the device.

See `../air-quality-checker/src/secrets.h.example` for a template.

---

## Security Notes

- `src/environments/environment.ts` and `environment.prod.ts` are generated from `.env` and are gitignored. **Never commit them.**
- The previous Supabase anon key and service role key were committed to Git history. After switching to the new project, rotate or delete the old keys in the old Supabase project to prevent abuse.
- The device uses the `service_role` key, which bypasses RLS. Keep this key secret and never use it in the browser.

---

## Project Structure

```
supabase/
  migrations/      # Database schema migrations
  seed.sql         # Default room + sensor
  config.toml      # Supabase CLI config
scripts/
  deploy-supabase.sh / .bat  # Manual migration deployment helpers
src/
  environments/
    .gitkeep       # Generated files are ignored
  app/services/supabase.service.ts  # Supabase client + data access
```
