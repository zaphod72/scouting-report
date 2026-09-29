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

Then protect the Worker with Cloudflare Access (see Identity). Add admin emails to `ADMINS` in `src/worker.js` and redeploy.

## Identity

Login is Cloudflare Access (free up to 50 users). Sign-in is Google.
The Worker reads the signed-in email from `ctx.access`, which exists only when Access authenticated the request.
Without Access, the API has no identity and returns 401.

Set up Access: dashboard > Workers & Pages > scouting-report > Access tab > "Protect this Worker behind Access" > All traffic.
Pick an allow policy (specific emails, or an email domain).
Add Google as a login method under Zero Trust > Settings > Authentication if the policy needs it.

Local dev has no Access. `.dev.vars` (gitignored) sets `DEV_COOKIE_LOGIN=1`, which enables a name prompt and cookie instead. Never set it in production.

Each report stores its creator and creation date. Only the creator can view or edit it. Emails in `ADMINS` can view and edit every report.

## v2 notes

Forms live in the `forms` table; reports reference `form_id`. An admin upload of a `.md` file inserts or replaces a `forms.def` row.
Item ids are positional (`cr-1-1`). A replace must keep ids of surviving items stable or saved scores detach.
