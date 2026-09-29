import { summarize } from './stats.js';

const app = document.getElementById('app');

const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k.startsWith('on') ? el.addEventListener(k.slice(2), v) : (el[k] = v);
  el.append(...kids);
  return el;
};

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const when = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString();
const fmt = ({ count, avg }) => `${count} scored` + (avg === null ? '' : ` · avg ${avg.toFixed(2)}`);

function askName() {
  const input = h('input', { type: 'text', required: true, maxLength: 100, placeholder: 'Your full name' });
  app.replaceChildren(
    h('h2', {}, 'Who are you?'),
    h('form', {
      onsubmit: (e) => {
        e.preventDefault();
        document.cookie = `name=${encodeURIComponent(input.value.trim())}; max-age=31536000; path=/; SameSite=Lax`;
        route();
      },
    }, input, h('p', {}, h('button', {}, 'Continue'))),
  );
}

function list(reports) {
  app.replaceChildren(
    h('h2', {}, 'Reports'),
    h('p', {}, h('button', { onclick: () => (location.hash = '#/new') }, 'New report')),
    h('table', {},
      h('tr', {}, ...['Game', 'Author', 'Created', 'Updated'].map((t) => h('th', {}, t))),
      ...reports.map((r) => h('tr', {},
        h('td', {}, h('a', { href: `#/r/${r.id}` }, r.title || '(untitled)')),
        h('td', {}, r.author),
        h('td', {}, when(r.created_at)),
        h('td', {}, when(r.updated_at)),
      )),
    ),
  );
}

const select = (options, current, onchange) =>
  h('select', { onchange: (e) => onchange(e.target.value) },
    ...options.map(([value, label]) => h('option', { value, selected: String(current ?? '') === String(value) }, label)));

async function edit(id) {
  let report = { form_id: null, title: '', data: { difficulty: '', overall: '', scores: {} } };
  if (id) report = await api(`/reports/${id}`);
  else report.form_id = (await api('/forms'))[0].id;
  const form = await api(`/forms/${report.form_id}`);
  const { def } = form;
  const data = report.data;
  data.scores ??= {};
  const ratings = [['', '—'], ...def.scale.map(([v, label]) => [v, v === 0 ? label : `${v} ${label}`])];

  const title = h('input', { type: 'text', maxLength: 200, value: report.title, placeholder: 'e.g. Team A vs Team B, 2026-09-29' });
  const difficulty = select([['', '—'], ...def.difficulty.map((d) => [d, d])], data.difficulty, (v) => (data.difficulty = v));
  const overall = select(ratings, data.overall, (v) => (data.overall = v));

  const category = (c) => {
    const ids = c.items.map((i) => i.id);
    const stat = h('span', { className: 'stat' });
    const update = () => (stat.textContent = fmt(summarize(ids, data.scores)));
    update();
    return h('details', {},
      h('summary', {}, c.name, stat),
      ...c.items.map((i) => h('label', { className: 'item' },
        h('span', {}, i.text),
        select(ratings, data.scores[i.id], (v) => {
          v === '' ? delete data.scores[i.id] : (data.scores[i.id] = Number(v));
          update();
        }),
      )),
    );
  };

  const status = h('span');
  const save = async () => {
    status.className = '';
    status.textContent = 'Saving…';
    const body = { form_id: report.form_id, title: title.value, data };
    try {
      if (id) {
        await api(`/reports/${id}`, 'PUT', body);
        status.textContent = `Saved ${new Date().toLocaleTimeString()}`;
      } else {
        location.hash = `#/r/${(await api('/reports', 'POST', body)).id}`;
      }
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message;
    }
  };

  app.replaceChildren(
    h('h2', {}, form.name),
    id ? h('p', {}, `Created by ${report.author} on ${when(report.created_at)}`) : '',
    h('label', { className: 'field' }, 'Game', title),
    h('label', { className: 'field' }, 'Game Difficulty ', difficulty),
    h('label', { className: 'field' }, 'Performance rating ', overall),
    ...def.roles.flatMap((r) => [h('h2', {}, r.name), ...r.categories.map(category)]),
    h('div', { className: 'bar' }, h('button', { onclick: save }, 'Save'), status),
  );
}

async function route() {
  try {
    const me = await api('/me');
    if (!me.name) {
      if (me.cookieLogin) return askName();
      throw new Error('Sign-in required. Open this site through its Cloudflare Access login.');
    }
    document.getElementById('who').textContent = me.name + (me.admin ? ' (admin)' : '');
    const [, page, id] = location.hash.split('/');
    if (page === 'new') return await edit();
    if (page === 'r') return await edit(Number(id));
    list(await api('/reports'));
  } catch (e) {
    app.replaceChildren(h('p', { className: 'err' }, e.message));
  }
}

addEventListener('hashchange', route);
route();
