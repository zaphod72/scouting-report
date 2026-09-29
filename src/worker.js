// Only /api/* reaches this Worker (see run_worker_first in wrangler.toml); static files are served directly.

const json = (data, status = 200) => Response.json(data, { status });
const fail = (status, error) => json({ error }, status);

// Cloudflare Access (Google sign-in) sets the email header; otherwise use the name cookie.
function whoami(req) {
  const email = req.headers.get('Cf-Access-Authenticated-User-Email');
  if (email) return email;
  const m = /(?:^|;\s*)name=([^;]*)/.exec(req.headers.get('Cookie') || '');
  try {
    return m ? decodeURIComponent(m[1]).trim().slice(0, 100) : '';
  } catch {
    return '';
  }
}

async function readReport(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || body.title.length > 200) return null;
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return null;
  if (!Number.isInteger(body.form_id)) return null;
  const data = JSON.stringify(body.data);
  if (data.length > 100_000) return null;
  return { form_id: body.form_id, title: body.title.trim(), data };
}

export default {
  async fetch(req, env) {
    const [, , resource, rawId] = new URL(req.url).pathname.split('/'); // /api/<resource>/<id>
    const id = Number(rawId);
    const { method } = req;
    const db = env.DB;
    const name = whoami(req);

    if (resource === 'me' && method === 'GET') {
      return json({ name, sso: req.headers.has('Cf-Access-Authenticated-User-Email') });
    }

    if (resource === 'forms' && method === 'GET') {
      if (!rawId) return json((await db.prepare('SELECT id, name FROM forms ORDER BY id').all()).results);
      const row = await db.prepare('SELECT id, name, def FROM forms WHERE id = ?').bind(id).first();
      return row ? json({ ...row, def: JSON.parse(row.def) }) : fail(404, 'not found');
    }

    if (resource === 'reports') {
      if (method === 'GET' && !rawId) {
        const { results } = await db
          .prepare('SELECT id, form_id, author, title, updated_at FROM reports ORDER BY updated_at DESC LIMIT 500')
          .all();
        return json(results);
      }
      if (method === 'GET') {
        const row = await db.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
        return row ? json({ ...row, data: JSON.parse(row.data) }) : fail(404, 'not found');
      }
      if (!name) return fail(401, 'name required');
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
          .prepare("UPDATE reports SET title = ?, data = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(r.title, r.data, id)
          .run();
        return res.meta.changes ? json({ id }) : fail(404, 'not found');
      }
    }

    return fail(404, 'not found');
  },
};
