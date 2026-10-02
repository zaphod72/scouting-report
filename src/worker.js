// Only /api/* reaches this Worker (see run_worker_first in wrangler.toml); static files are served directly.

const json = (data, status = 200) => Response.json(data, { status });
const fail = (status, error) => json({ error }, status);

// Admins can view and edit any report. Everyone else sees only their own.
// Match the identity the API sees: the Access email (locally, the name typed at the prompt).
const ADMINS = ['Darren', 'Devin']; // TODO: replace with admin emails when real login is on
const isAdmin = (name) => ADMINS.some((a) => a.toLowerCase() === name.toLowerCase());

// Production identity comes from Cloudflare Access. ctx.access exists only when Access authenticated the request.
// The name cookie works only when DEV_COOKIE_LOGIN is set (local dev, in .dev.vars); otherwise no identity.
async function whoami(req, env, ctx) {
  if (ctx.access) return (await ctx.access.getIdentity())?.email ?? '';
  if (!env.DEV_COOKIE_LOGIN) return '';
  const m = /(?:^|;\s*)name=([^;]*)/.exec(req.headers.get('Cookie') || '');
  try {
    return m ? decodeURIComponent(m[1]).trim().slice(0, 100) : '';
  } catch {
    return '';
  }
}

async function readReport(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) return null;
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return null;
  if (!Number.isInteger(body.form_id)) return null;
  const { difficulty, overall } = body.data;
  if (typeof difficulty !== 'string' || !difficulty || difficulty.length > 50) return null;
  if (!['1', '2', '3', '4'].includes(String(overall))) return null;
  const data = JSON.stringify(body.data);
  if (data.length > 100_000) return null;
  return { form_id: body.form_id, title: body.title.trim(), data };
}

export default {
  async fetch(req, env, ctx) {
    const [, , resource, rawId] = new URL(req.url).pathname.split('/'); // /api/<resource>/<id>
    const id = Number(rawId);
    const { method } = req;
    const db = env.DB;
    const name = await whoami(req, env, ctx);

    if (resource === 'me' && method === 'GET') {
      return json({ name, admin: isAdmin(name), cookieLogin: !!env.DEV_COOKIE_LOGIN });
    }

    if (resource === 'forms' && method === 'GET') {
      if (!rawId) return json((await db.prepare('SELECT id, name FROM forms ORDER BY id').all()).results);
      const row = await db.prepare('SELECT id, name, def FROM forms WHERE id = ?').bind(id).first();
      return row ? json({ ...row, def: JSON.parse(row.def) }) : fail(404, 'not found');
    }

    if (resource === 'reports') {
      if (!name) return fail(401, 'name required');
      const admin = isAdmin(name) ? 1 : 0;
      // "author = ? COLLATE NOCASE OR ?" lets the owner or an admin through, in one query.
      if (method === 'GET' && !rawId) {
        const { results } = await db
          .prepare(
            `SELECT id, form_id, author, title, created_at, updated_at FROM reports
             WHERE author = ? COLLATE NOCASE OR ? ORDER BY updated_at DESC LIMIT 500`,
          )
          .bind(name, admin)
          .all();
        return json(results);
      }
      if (method === 'GET') {
        const row = await db
          .prepare('SELECT * FROM reports WHERE id = ? AND (author = ? COLLATE NOCASE OR ?)')
          .bind(id, name, admin)
          .first();
        return row ? json({ ...row, data: JSON.parse(row.data) }) : fail(404, 'not found');
      }
      const r = await readReport(req);
      if (!r) return fail(400, 'invalid report');
      if (method === 'POST' && !rawId) {
        const res = await db
          .prepare('INSERT INTO reports (form_id, author, title, data) VALUES (?, ?, ?, ?)')
          .bind(r.form_id, name, r.title, r.data)
          .run();
        return json({ id: res.meta.last_row_id }, 201);
      }
      if (method === 'PUT' && rawId) {
        const res = await db
          .prepare(
            `UPDATE reports SET title = ?, data = ?, updated_at = datetime('now')
             WHERE id = ? AND (author = ? COLLATE NOCASE OR ?)`,
          )
          .bind(r.title, r.data, id, name, admin)
          .run();
        return res.meta.changes ? json({ id }) : fail(404, 'not found');
      }
    }

    return fail(404, 'not found');
  },
};
