# Scouting Report

Simple site for officials to fill in the MOA scouting form. Cloudflare Worker + D1 (SQLite), plain JS front end, no build step.

- `public/` front end (`app.js`, `stats.js`)
- `src/worker.js` JSON API under `/api/*`
- `schema.sql`, `seed.mjs` database schema and the form definition (stored in D1 as JSON)
- Source form: `Assessable Categories for MOA Refs.txt`

Rating 0 is N/A. Only ratings 1-4 count toward a category's "scored" count and average.

## Run locally

    npm install
    npm run db:local
    npm run dev        # http://localhost:8787
    npm test

## Deploy (Cloudflare free tier)

    npx wrangler login
    npx wrangler d1 create scouting-report   # paste database_id into wrangler.toml
    npm run db:remote
    npm run deploy

## Identity

The API uses the `Cf-Access-Authenticated-User-Email` header when present (Cloudflare Access with Google sign-in, no code change).
Otherwise it uses the `name` cookie set by the name prompt. Neither is verified without Access.

## v2 notes

Forms live in the `forms` table; reports reference `form_id`. An admin upload of a `.md` file inserts or replaces a `forms.def` row.
Item ids are positional (`cr-1-1`). A replace must keep ids of surviving items stable or saved scores detach.
