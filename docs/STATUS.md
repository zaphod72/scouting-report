# Status and next steps

Updated 2026-09-29.

## Current state

The site is live in **test mode**: https://scouting-report.darrenk1972.workers.dev

Test mode means anyone with the URL can sign in by typing any name. The name is stored in a cookie for one year.
Do not enter real assessments until real login is in place.

| Area | State |
|---|---|
| Hosting | Cloudflare Worker with static assets, free tier |
| Database | Cloudflare D1 `scouting-report`, schema and MOA form loaded |
| Form | 64 line items in 11 categories (Center Referee, Assistant Referee, 4th Official), plus game title, Game Difficulty and overall rating |
| Category stats | Collapsed or open, each category shows "n of total scored" and the average. No average when no item has a rating of 1 to 4 |
| Rating rules | 0 is N/A. N/A counts as scored, but only ratings 1 to 4 enter the average |
| Ownership | Each report stores its creator and creation date. Only the creator can view or edit it |
| Admins | Names in `ADMINS` (`src/worker.js`) can view and edit every report. Test mode: `Darren` and `Devin` |
| Login | Test mode: name cookie, enabled by `DEV_COOKIE_LOGIN` in `wrangler.toml`. Real login: not built yet |

Verified on the live site on 2026-09-29: a report created by one name is hidden from a second name (404), and the owner can read it.
Not verified live: admin access (`Darren`, `Devin`), and anything that depends on `ctx.access` (Cloudflare Access).

Uncommitted at the time of writing: the `[vars]` block in `wrangler.toml` and this file.
Commit `ac3f8e6` holds the ownership rules and the Access-based identity code.

## Known limits of test mode

- The cookie proves nothing. A tester can type an admin's name and get admin rights.
- Anyone who finds the URL can create reports and read any name's reports.
- Test reports stay in D1. Clear them before real use:
  `npx wrangler d1 execute scouting-report --remote --command "DELETE FROM reports"`

## Next steps

1. **Choose real login** (Option A or B below). Recommendation: Option A.
2. **Add admin emails** to `ADMINS` in `src/worker.js`. Use emails, since both options identify users by email.
3. **Turn off test mode.** Delete the `[vars]` block from `wrangler.toml` and redeploy.
4. **Clear test data** with the command above.
5. **Version 2:** an admin page that uploads a `.md` file to add a form or replace one (see below).

## Login options

Both options end at the same place: the Worker learns a verified email, and `ADMINS` holds emails.
The single seam is `whoami()` in `src/worker.js`.

| | A. Cloudflare Access | B. Firebase Authentication |
|---|---|---|
| Code to write | None. The Worker already reads `ctx.access` | About 60 lines: Firebase JS SDK in the page, token check in the Worker |
| Where sign-in happens | Cloudflare login page, before the site loads | Inside the app, with a Google sign-in button |
| Verified identity | Yes. `ctx.access` exists only for requests Access authenticated | Yes, once the Worker verifies the ID token |
| User cap | Free plan is limited (believed 50 users; check current pricing) | Generous free tier (check current limits) |
| Who may sign in | Your Access policy: listed emails or an email domain | Any Google account, unless you add an allow list in the Worker |
| Extra accounts and setup | Zero Trust is already on your Cloudflare account | New Firebase project |
| Lock-in | Cloudflare only | Works on any host |

### Option A: Cloudflare Access (recommended)

Code is done and tested locally. Live behavior is not tested yet.

1. Remove the `[vars]` block from `wrangler.toml` and run `npm run deploy`.
2. Dashboard: Workers & Pages, `scouting-report`, **Access** tab, "Protect this Worker behind Access", **All traffic**.
3. Add an allow policy (specific emails, or an email domain) and apply it.
4. Under Zero Trust, Settings, Authentication, make sure Google is a login method.
5. Open the site. The header should show your email. If the page says "Sign-in required", `ctx.access` is not set and the Worker needs a fix.

### Option B: Firebase Authentication

Firebase Authentication is the login piece. Firestore is a database and is not needed: keep D1.

1. Create a Firebase project. Enable the Google sign-in provider.
2. Add the site hostname (`scouting-report.darrenk1972.workers.dev`) under Authentication, Settings, Authorized domains.
3. Page: load the Firebase JS SDK from a CDN. Call `signInWithPopup` with the Google provider. Send `await user.getIdToken()` as `Authorization: Bearer <token>` on every `/api` call. Refresh the token when it expires.
4. Worker: replace the `ctx.access` branch in `whoami()` with token verification, using the `jose` library.
   Fetch Google's signing keys for Firebase tokens, and check the signature, `exp`, `aud` (the Firebase project id) and `iss` (`https://securetoken.google.com/<project-id>`).
   Use the `email` claim as the name, and require `email_verified`.
   The exact key URL and claim names come from memory. Confirm them against the Firebase docs before building.
5. Decide who may sign in. Without an allow list, any Google account can create reports.
6. Remove the `[vars]` block from `wrangler.toml`, and remove the cookie fallback from `whoami()` and the name prompt from `public/app.js`.
7. Test with two Google accounts: one owner and one non-owner, then an admin email.

Choose B over A if you expect more users than the Access free plan allows, or want sign-in inside the app.

## Version 2: form upload

- Forms live in the D1 `forms` table as JSON (`def`). Reports store `form_id`.
- The admin page will parse an uploaded `.md` file into the same JSON shape that `seed.mjs` writes, then insert a new row or replace `def` on an existing row.
- Item ids are positional (`cr-1-1`). A replace must keep the ids of surviving items stable, or saved scores detach from their items.
- Only names in `ADMINS` may use the page. The Worker must check this on the server.
- The report page currently uses the first form. Version 2 needs a form picker on "New report".

## Other open items

- No delete or export for reports.
- No warning when leaving the form with unsaved changes.
- The list shows at most 500 reports.
- The Assistant Referee and 4th Official scales are assumed to be 0 to 4, like the Center Referee scale.
