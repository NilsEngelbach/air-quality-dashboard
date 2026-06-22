# AGENTS.md — Air Quality Dashboard

Dashboard / backend for the air-quality-checker firmware at `../air-quality-checker`. See `../air-quality-checker/AGENTS.md` for hardware and sensor context.

## Tech Stack

- **Frontend:** Angular 20, standalone components, Angular Material, Plotly.js
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Deployment:** Vercel (static build), Supabase CLI (migrations)

## Daily Commands

```bash
npm install
npm start          # dev server; prestart generates env files from .env
npm run build      # production build; prebuild generates env files
npm test           # Karma + Jasmine
npm run lint       # Angular ESLint on src/**/*.ts and src/**/*.html
```

## Environment Files Are Generated

`src/environments/environment.ts` and `environment.prod.ts` are **generated** by `generate-env.js` from `.env` during `prestart` / `prebuild`. They are gitignored.

- Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Do not hand-edit the generated files; they are overwritten on every start/build.
- **Do not commit real Supabase keys.** The repo currently contains a committed `environment.ts` with credentials; rotate or remove those keys in Supabase if they are still active.

## Supabase Backend

- The Supabase CLI is a dev dependency (`npm`/`npx supabase`); no global install required.
- Migrations live in `supabase/migrations/` and run in lexical order (`001_` … `006_`).
- Seed file: `supabase/seed.sql` creates a default room and sensor with fixed UUIDs.
- Row Level Security is enabled; authenticated users have read/insert on `rooms` and `sensors` and read on `air_quality_data`.
- The device writes to `air_quality_data` using the **service_role key**, which bypasses RLS. Keep that key out of the frontend.
- Realtime is enabled on `air_quality_data`; the dashboard subscribes to inserts per sensor.

## Deployment

- Vercel config in `vercel.json` uses `@vercel/static-build` with output dir `dist/air-quality-dashboard/browser` and SPA fallback to `index.html`.
- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the Vercel dashboard; `npm run build` injects them via `generate-env.js`.
- Database deploy helpers: `scripts/deploy-supabase.sh` and `scripts/deploy-supabase.bat` run `npx supabase db push`.

## Architecture Notes

- The real entrypoint is `src/main.ts`, which bootstraps the standalone `AppComponent` from `src/app/app.component.ts` using `app.routes.ts`.
- `src/app/app.module.ts` and `src/app/app.ts` exist but are **not used** by `main.ts`.
- `src/app/app.spec.ts` imports from `app.ts` and tests for an `h1` title that does not exist in the current router-outlet-only templates.
- `src/app/services/supabase.service.ts` owns the Supabase client, auth state, data fetching, and realtime subscription management.

## Lint / Style

- ESLint config enforces Angular selector prefixes: `app` for both components (`kebab-case` elements) and directives (`camelCase` attributes).
- TypeScript strict mode is enabled in `tsconfig.json`.
