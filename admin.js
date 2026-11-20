// Panel del equipo VCV. Con Supabase: login de admin + REST con RLS. Sin Supabase: modo demo en memoria.
import { CONFIG } from './config.js';
import { IS_DEMO, getSettings, OFFER_COLUMNS } from './api.js';
import { offerPrice, mergeSettings, isOfferFresh, DEFAULT_SETTINGS } from './pricing.js';
import { DEMO_OFFERS, DEMO_PROPOSALS, CATALOG, BODY_TYPES, FUELS, COLORS } from './demo-data.js';
import { $, $$, esc, eur, km, toast, daysAgoLabel } from './layout.js';

const app = $('#app');
const STATUSES = ['nuevo', 'buscando', 'propuestas_enviadas', 'elegido', 'inspeccion', 'compra', 'importacion', 'traslado', 'entregado', 'cancelado'];
const OFFER_STATUSES = ['borrador', 'publicada', 'reservada', 'vendida', 'retirada'];
const statusPill = (s) => `<span class="pill ${s === 'nuevo' ? 'nuevo' : ['entregado', 'publicada', 'aprobado'].includes(s) ? 'ok' : ['cancelado', 'retirada', 'rechazado'].includes(s) ? '' : 'warn'}">${esc(s.replace('_', ' '))}</span>`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

// ---------------- sesión ----------------
const ss = {
  get() { try { return JSON.parse(sessionStorage.getItem('vcv_admin')); } catch { return null; } },
  set(v) { try { v ? sessionStorage.setItem('vcv_admin', JSON.stringify(v)) : sessionStorage.removeItem('vcv_admin'); } catch { /* */ } },
};
let session = IS_DEMO ? { access_token: 'demo', user: { email: 'demo@vcv' } } : ss.get();

async function login(email, password) {
  const r = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || 'Email o contraseña incorrectos');
  session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000, user: d.user };
  ss.set(session);
}
async function refreshIfNeeded() {
  if (IS_DEMO || !session?.refresh_token || session.expires_at - Date.now() > 60000) return;
  const r = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!r.ok) { logout(); throw new Error('La sesión ha caducado'); }
  const d = await r.json();
  session = { ...session, access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000 };
  ss.set(session);
}
function logout() { session = null; ss.set(null); render(); }

// ---------------- datos ----------------
const demoDb = {
  offers: structuredClone(DEMO_OFFERS),
  requests: [
    { id: 'r1', code: 'VCV-0041', access_token: 'demo-ejemplo', kind: 'pedido', status: 'nuevo', name: 'Laura Martín', email: 'laura@example.com', phone: '+34 600 000 001', whatsapp_ok: true, delivery_city: 'Valencia', timeline: 'En 1–3 meses', filters: { makes: ['BMW'], model: 'Serie 3', body_types: ['Familiar'], fuels: ['Híbrido enchufable'], year_min: 2021, km_max: 60000 }, price_min: 35000, price_max: 45000, must_have: 'Techo panorámico', services_interest: ['inspeccion', 'gestion', 'traslado'], created_at: new Date(Date.now() - 3600e3).toISOString() },
    { id: 'r2', code: 'VCV-0040', access_token: 'demo-2', kind: 'reserva', status: 'buscando', offer_id: 'd3', name: 'Jorge Ruiz', email: 'jorge@example.com', phone: '+34 600 000 002', delivery_city: 'Madrid', filters: { offer: { make: 'Mercedes-Benz', model: 'Clase C', version: 'C 300 e AMG Line' } }, created_at: new Date(Date.now() - 86400e3).toISOString() },
  ],
  proposals: DEMO_PROPOSALS.map((p, i) => ({ ...p, id: `dp${i}`, request_id: 'r1', sort: i })),
  sellers: [{ id: 's1', company: 'Autohaus Beispiel GmbH', country: 'DE', city: 'Múnich', contact_name: 'Herr Müller', email: 'verkauf@example.de', phone: '+49 89 000000', stock_size: '21–100', status: 'pendiente', created_at: new Date().toISOString() }],
  settings: [{ key: 'pricing', value: {} }],
};
let seq = 100;

async function api(method, path, body, extra = {}) {
  if (IS_DEMO) return demoApi(method, path, body);
  await refreshIfNeeded();
  const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json',
      Prefer: method === 'GET' ? 'count=exact' : 'return=representation', ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { logout(); throw new Error('Sesión caducada'); }
  const d = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.message || `Error ${r.status}`);
  return d;
}
function demoApi(method, path, body) {
  const [table, qs] = path.split('?');
  const rows = demoDb[table];
  const q = new URLSearchParams(qs || '');
  const match = (row) => [...q.entries()].every(([k, v]) => !v.startsWith('eq.') || String(row[k]) === v.slice(3));
  if (method === 'GET') return structuredClone(rows.filter(match));
  if (method === 'POST') { const row = { id: `x${++seq}`, created_at: new Date().toISOString(), ...body }; rows.push(row); return [row]; }
  if (method === 'PATCH') { const out = []; rows.forEach((r) => { if (match(r)) { Object.assign(r, body); out.push(r); } }); return out; }
  if (method === 'DELETE') { demoDb[table] = rows.filter((r) => !match(r)); return null; }
  return null;
}
async function callFn(payload) {
  if (IS_DEMO) return { ok: true, count: 5 };
  await refreshIfNeeded();
  const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/submit-lead`, {
    method: 'POST', headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `Error ${r.status}`);
  return d;
}
async function uploadImages(files, folder) {
  if (IS_DEMO) { toast('En modo demo no se suben fotos'); return []; }
  const urls = [];
  for (const f of files) {
    const path = `${folder}/${Date.now()}-${f.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase()}`;
    const r = await fetch(`${CONFIG.supabaseUrl}/storage/v1/object/vehicle-photos/${path}`, {
      method: 'POST', headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': f.type || 'image/jpeg' }, body: f,
    });
    if (!r.ok) throw new Error('No se pudo subir la foto. ¿Ejecutaste 2-fotos-opcional.sql?');
    urls.push(`${CONFIG.supabaseUrl}/storage/v1/object/public/vehicle-photos/${path}`);
  }
  return urls;
}

let settings = DEFAULT_SETTINGS;
async function loadSettings() {
  const rows = await api('GET', 'settings?select=key,value&key=eq.pricing');
  settings = mergeSettings(rows[0]?.value || {});
}

// ---------------- vistas ----------------
let tab = location.hash.startsWith('#vendedores') ? 'vendedores' : location.hash.startsWith('#ofertas') ? 'ofertas' : 'pedidos';

function render() {
  $('#logout').hidden = !session || IS_DEMO;
  $('#who').textContent = session ? (IS_DEMO ? 'MODO DEMO · datos de prueba' : session.user?.email) : '';
  if (!session) return renderLogin();
  app.innerHTML = `<div class="admin-shell">
    <nav class="admin-nav">
      ${[['pedidos', 'Pedidos y reservas'], ['ofertas', 'Ofertas'], ['vendedores', 'Vendedores'], ['ajustes', 'Ajustes de precios']]
        .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}
    </nav>
    <div class="admin-main" id="main"><p class="dim">Cargando…</p></div></div>`;
  $$('.admin-nav button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  ({ pedidos: viewRequests, ofertas: viewOffers, vendedores: viewSellers, ajustes: viewSettings })[tab]().catch((e) => {
    $('#main').innerHTML = `<div class="alert err">${esc(e.message)}${/permission|policy|42501/i.test(e.message) ? '<br>Tu usuario no es administrador. Regístrate con uno de los emails de administrador o añádelo a la tabla admins.' : ''}</div>`;
  });
}

function renderLogin() {
  app.innerHTML = `<div class="wrap" style="max-width:420px;padding:60px 20px">
    <div class="plate rivets" style="padding:28px 24px">
      <h2 style="font-size:24px">Acceso del equipo</h2>
      <form class="form" id="lf"><div class="field"><label for="le">Email</label><input id="le" type="email" autocomplete="username" required></div>
      <div class="field"><label for="lp">Contraseña</label><input id="lp" type="password" autocomplete="current-password" required></div>
      <div id="lmsg"></div><button class="btn block">Entrar</button></form>
      <p class="dim" style="font-size:12.5px;margin-top:14px">El usuario se crea en Supabase → Authentication → Users.</p>
    </div></div>`;
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await login($('#le').value.trim(), $('#lp').value); render(); } catch (err) { $('#lmsg').innerHTML = `<div class="alert err">${esc(err.message)}</div>`; }
  });
}

function drawer(html) {
  closeDrawer();
  const d = document.createElement('div');
  d.className = 'drawer'; d.id = 'drawer'; d.innerHTML = html;
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
  return d;
}
function closeDrawer() { $('#drawer')?.remove(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// ---------- Pedidos ----------
async function viewRequests() {
  const main = $('#main');
  const filter = main.dataset.filter || 'activos';
  const rows = await api('GET', 'requests?select=*&order=created_at.desc&limit=300');
  const shown = rows.filter((r) => filter === 'todos' || (filter === 'activos' ? !['entregado', 'cancelado'].includes(r.status) : r.status === filter));
  const what = (r) => (r.kind === 'reserva' ? `${r.filters?.offer?.make || ''} ${r.filters?.offer?.model || ''}` : [r.filters?.makes?.join('/'), r.filters?.model].filter(Boolean).join(' ') || 'A la carta');
  main.innerHTML = `
    <div class="toolbar"><h2 style="font-size:24px;margin:0 auto 0 0">Pedidos y reservas</h2>
      <select id="rf" style="width:auto">${['activos', 'todos', ...STATUSES].map((s) => `<option ${s === filter ? 'selected' : ''} value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select>
      <button class="btn ghost small" id="csv">Exportar CSV</button></div>
    ${shown.length ? `<table class="data"><thead><tr><th>Código</th><th>Fecha</th><th>Tipo</th><th>Cliente</th><th>Qué busca</th><th>Presupuesto</th><th>Entrega</th><th>Estado</th></tr></thead><tbody>
    ${shown.map((r) => `<tr class="click" data-id="${esc(r.id)}"><td class="mono">${esc(r.code)}</td><td class="mono dim">${fmtDate(r.created_at)}</td><td>${r.kind === 'reserva' ? 'Reserva' : 'A la carta'}</td>
      <td>${esc(r.name)}<br><span class="dim">${esc(r.email)}</span></td><td>${esc(what(r))}</td>
      <td class="mono">${r.price_min || r.price_max ? `${eur(r.price_min)}–${eur(r.price_max)}` : '—'}</td><td>${esc(r.delivery_city || '')}</td><td>${statusPill(r.status)}</td></tr>`).join('')}
    </tbody></table>` : '<div class="empty plate">No hay pedidos con este filtro.</div>'}`;
  $('#rf').addEventListener('change', (e) => { main.dataset.filter = e.target.value; viewRequests(); });
  $$('tr[data-id]', main).forEach((tr) => tr.addEventListener('click', () => openRequest(rows.find((r) => String(r.id) === tr.dataset.id))));
  $('#csv').addEventListener('click', () => {
    const cols = ['code', 'created_at', 'kind', 'status', 'name', 'email', 'phone', 'delivery_city', 'price_min', 'price_max', 'timeline'];
    const csv = [cols.join(';'), ...rows.map((r) => [...cols.map((c) => `"${String(r[c] ?? '').replaceAll('"', '""')}"`), `"${what(r)}"`].join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' })); a.download = 'pedidos-vcv.csv'; a.click();
  });
  const m = location.hash.match(/pedido=([\w-]+)/);
  if (m) { const r = rows.find((x) => String(x.id) === m[1]); if (r) openRequest(r); history.replaceState(null, '', location.pathname); }
}

async function openRequest(r) {
  const f = r.filters || {};
  const props = await api('GET', `proposals?select=*&request_id=eq.${r.id}&order=sort`);
  const clientLink = `${location.origin}${location.pathname.replace('admin.html', '')}mi-pedido.html?t=${r.access_token}`;
  const wa = r.phone ? `https://wa.me/${r.phone.replace(/\D/g, '')}` : '';
  const d = drawer(`
    <div class="drawer-head"><div><div class="mono dim">${r.kind === 'reserva' ? 'RESERVA' : 'PEDIDO A LA CARTA'}</div><h2 style="font-size:26px;margin:0">${esc(r.code)}</h2></div><button class="btn ghost small" data-close>Cerrar</button></div>
    <div class="toolbar"><select id="st" style="width:auto">${STATUSES.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="btn small" id="save-st">Guardar estado</button>
      <a class="btn ghost small" href="mailto:${esc(r.email)}?subject=${encodeURIComponent(`Tu pedido ${r.code} · VCV`)}">Email</a>
      ${wa ? `<a class="btn ghost small" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      <a class="btn ghost small" href="${esc(clientLink)}" target="_blank" rel="noopener">Ver como cliente</a></div>
    <div class="plate" style="padding:16px 18px"><dl class="kv">
      <dt>Cliente</dt><dd>${esc(r.name)} · ${esc(r.email)} · ${esc(r.phone || '')} ${r.whatsapp_ok ? '(WhatsApp sí)' : ''}</dd>
      <dt>Entrega</dt><dd>${esc(r.delivery_city || '—')} · ${esc(r.timeline || '')}</dd>
      ${r.kind === 'reserva' ? `<dt>Oferta</dt><dd>${esc(f.offer?.make)} ${esc(f.offer?.model)} ${esc(f.offer?.version || '')} · ${eur(f.offer?.price_vcv_eur)}</dd>` : `
      <dt>Busca</dt><dd>${esc([f.makes?.join(' / '), f.model, f.body_types?.join(', ')].filter(Boolean).join(' · ') || '—')}</dd>
      <dt>Detalles</dt><dd>${esc([f.fuels?.join(', '), f.gearboxes?.join(', '), f.year_min || f.year_max ? `año ${f.year_min || '…'}–${f.year_max || '…'}` : '', f.km_max ? `< ${km(f.km_max)}` : '', f.cv_min || f.cv_max ? `${f.cv_min || '…'}–${f.cv_max || '…'} CV` : '', f.colors?.length ? `color ${f.colors.join('/')}` : ''].filter(Boolean).join(' · ') || '—')}</dd>
      <dt>Presupuesto</dt><dd class="mono">${eur(r.price_min)} – ${eur(r.price_max)}</dd>`}
      <dt>Imprescindible</dt><dd>${esc(r.must_have || '—')}</dd><dt>Mensaje</dt><dd>${esc(r.message || '—')}</dd>
      <dt>Servicios interés</dt><dd>${esc((r.services_interest || []).join(', ') || '—')}</dd>
      ${r.chosen_services ? `<dt>Eligió</dt><dd>${esc(JSON.stringify(r.chosen_services))} · total ${eur(r.services_total)}</dd>` : ''}
    </dl></div>
    ${r.kind === 'pedido' ? `
    <div class="toolbar" style="margin-top:22px"><h3 style="margin:0 auto 0 0">Propuestas (${props.length})</h3>
      <button class="btn small" id="send-props" ${props.length ? '' : 'disabled'}>Enviar propuestas al cliente</button></div>
    <table class="data"><tbody>${props.map((p) => `<tr><td>${p.chosen ? '★ ' : ''}<b>${esc(p.make)} ${esc(p.model)}</b> ${esc(p.version || '')}<br><span class="dim mono">${esc(p.year)} · ${km(p.km)} · ${esc(p.fuel || '')} · ${esc(p.power_cv || '')} CV</span>
      ${p.source_url ? `<br><a href="${esc(p.source_url)}" target="_blank" rel="noopener" class="mono" style="font-size:12px">anuncio ↗</a>` : ''}</td><td class="mono">${eur(p.price_de_eur)}</td>
      <td><button class="btn ghost small" data-del="${esc(p.id)}">Quitar</button></td></tr>`).join('')}</tbody></table>
    <form class="plate form" id="pf" style="padding:16px 18px;margin-top:12px">
      <b>Añadir propuesta</b>
      <div class="row2"><input name="make" placeholder="Marca" list="dl-makes" required><input name="model" placeholder="Modelo" required></div>
      <input name="version" placeholder="Versión (p. ej. 320d Touring M Sport)">
      <div class="row2"><input name="year" type="number" placeholder="Año"><input name="km" type="number" placeholder="Km"></div>
      <div class="row2"><select name="fuel">${FUELS.map((x) => `<option>${x}</option>`).join('')}</select><input name="power_cv" type="number" placeholder="CV"></div>
      <div class="row2"><select name="color">${COLORS.map((c) => `<option>${c.name}</option>`).join('')}</select><select name="size_class"><option value="compacto">Compacto</option><option value="medio" selected>Medio</option><option value="grande">Grande</option></select></div>
      <div class="row2"><input name="price_de_eur" type="number" placeholder="Precio en Alemania €" required><input name="co2_wltp" type="number" placeholder="CO2 g/km"></div>
      <input name="source_url" type="url" placeholder="Enlace al anuncio">
      <textarea name="notes" placeholder="Notas para el cliente (estado, garantía, dueños…)"></textarea>
      <label class="field"><span class="label">Fotos</span><input type="file" name="photos" accept="image/*" multiple></label>
      <button class="btn small">Añadir propuesta</button></form>
    <datalist id="dl-makes">${Object.keys(CATALOG).map((m) => `<option>${m}</option>`).join('')}</datalist>` : ''}`);

  $('#save-st', d).addEventListener('click', async () => {
    try { await api('PATCH', `requests?id=eq.${r.id}`, { status: $('#st', d).value }); toast('Estado guardado'); closeDrawer(); viewRequests(); } catch (e) { toast(e.message); }
  });
  $$('[data-del]', d).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Quitar esta propuesta?')) return;
    await api('DELETE', `proposals?id=eq.${b.dataset.del}`); openRequest(r);
  }));
  $('#send-props', d)?.addEventListener('click', async () => {
    try { const x = await callFn({ action: 'proposals_ready', request_id: r.id }); toast(`Enviadas ${x.count} propuestas al cliente`); r.status = 'propuestas_enviadas'; closeDrawer(); viewRequests(); } catch (e) { toast(e.message); }
  });
  $('#pf', d)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const num = (k) => (fd.get(k) ? Number(fd.get(k)) : null);
    try {
      const images = await uploadImages(fd.getAll('photos').filter((x) => x.size), `pedidos/${r.code}`);
      await api('POST', 'proposals', {
        request_id: r.id, make: fd.get('make'), model: fd.get('model'), version: fd.get('version'), year: num('year'), km: num('km'),
        fuel: fd.get('fuel'), power_cv: num('power_cv'), color: fd.get('color'), size_class: fd.get('size_class'),
        price_de_eur: num('price_de_eur'), co2_wltp: num('co2_wltp'), source_url: fd.get('source_url') || null, notes: fd.get('notes'),
        images, sort: props.length,
      });
      if (r.status === 'nuevo') { await api('PATCH', `requests?id=eq.${r.id}`, { status: 'buscando' }); r.status = 'buscando'; }
      toast('Propuesta añadida'); openRequest(r);
    } catch (err) { toast(err.message); }
  });
}

// ---------- Ofertas ----------
async function viewOffers() {
  await loadSettings();
  const rows = await api('GET', `offers?select=${OFFER_COLUMNS},source_url,notes_internal,seller_id,created_at&order=created_at.desc`);
  const main = $('#main');
  const demos = rows.filter((o) => o.is_demo).length;
  main.innerHTML = `
    <div class="toolbar"><h2 style="font-size:24px;margin:0 auto 0 0">Ofertas</h2>
      ${demos ? `<button class="btn ghost small" id="del-demo">Borrar ${demos} ofertas demo</button>` : ''}
      <button class="btn small" id="new-offer">Nueva oferta</button></div>
    <p class="dim" style="font-size:13px;margin-top:-6px">Una oferta publicada solo se ve en la web durante ${settings.offer_valid_days} días desde la última verificación de disponibilidad.</p>
    <table class="data"><thead><tr><th>Coche</th><th>Estado</th><th>Disponibilidad</th><th>Precio DE</th><th>Precio VCV</th><th>Honorario</th><th>Ahorro cliente</th></tr></thead><tbody>
    ${rows.map((o) => { const p = offerPrice(o, settings); const fresh = isOfferFresh(o, settings); return `<tr class="click" data-id="${esc(o.id)}">
      <td><b>${esc(o.make)} ${esc(o.model)}</b> ${o.is_demo ? '<span class="demo-badge">DEMO</span>' : ''}<br><span class="dim">${esc(o.version || '')} · ${esc(o.year)} · ${km(o.km)}</span></td>
      <td>${statusPill(o.status)}</td><td>${o.verified_at ? `<span class="pill ${fresh ? 'ok' : 'warn'}">${fresh ? '' : 'caducada · '}${daysAgoLabel(o.verified_at)}</span>` : '<span class="pill warn">sin verificar</span>'}</td>
      <td class="mono">${eur(p.seller)}</td><td class="mono">${eur(p.total)}</td><td class="mono">${eur(p.markup)} <span class="dim">(${(p.markup_pct * 100).toFixed(1)}%)</span></td>
      <td>${p.publishable ? `<span class="pill ok">${eur(p.savings)}</span>` : `<span class="pill warn">${eur(p.savings)}</span>`}</td></tr>`; }).join('')}
    </tbody></table>`;
  $('#new-offer').addEventListener('click', () => openOffer({ status: 'borrador', mode: 'intermediacion', size_class: 'medio', gearbox: 'Automático', fuel: 'Diésel', body_type: 'Berlina', color: 'Negro', make: 'BMW', equipment: [], images: [] }));
  $('#del-demo')?.addEventListener('click', async () => {
    if (!confirm('¿Borrar todas las ofertas demo?')) return;
    await api('DELETE', 'offers?is_demo=eq.true'); toast('Ofertas demo borradas'); viewOffers();
  });
  $$('tr[data-id]', main).forEach((tr) => tr.addEventListener('click', () => openOffer(rows.find((o) => String(o.id) === tr.dataset.id))));
}

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function openOffer(o) {
  const isNew = !o.id;
  const sel = (name, opts, val) => `<select name="${name}">${opts.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  const inp = (name, val, type = 'text', ph = '') => `<input name="${name}" type="${type}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${type === 'number' ? 'step="any"' : ''}>`;
  const field = (label, html) => `<div class="field"><label>${label}</label>${html}</div>`;
  const d = drawer(`
    <div class="drawer-head"><h2 style="font-size:24px;margin:0">${isNew ? 'Nueva oferta' : `${esc(o.make)} ${esc(o.model)}`}</h2><button class="btn ghost small" data-close>Cerrar</button></div>
    <form class="form" id="of">
      <div class="row2">${field('Marca', sel('make', Object.keys(CATALOG), o.make))}${field('Modelo', inp('model', o.model, 'text', 'Serie 3'))}</div>
      ${field('Versión', inp('version', o.version, 'text', '330e Touring M Sport'))}
      <div class="row2">${field('Carrocería', sel('body_type', BODY_TYPES, o.body_type))}${field('Tamaño (traslado)', sel('size_class', [['compacto', 'Compacto'], ['medio', 'Medio'], ['grande', 'Grande']], o.size_class))}</div>
      <div class="row2">${field('Año', inp('year', o.year, 'number'))}${field('1ª matriculación', inp('first_registration', o.first_registration, 'date'))}</div>
      <div class="row2">${field('Kilómetros', inp('km', o.km, 'number'))}${field('Potencia (CV)', inp('power_cv', o.power_cv, 'number'))}</div>
      <div class="row2">${field('Combustible', sel('fuel', FUELS, o.fuel))}${field('Cambio', sel('gearbox', ['Automático', 'Manual'], o.gearbox))}</div>
      <div class="row2">${field('Color', sel('color', COLORS.map((c) => c.name), o.color))}${field('CO2 WLTP (g/km)', inp('co2_wltp', o.co2_wltp, 'number'))}</div>
      <div class="row2">${field('Precio del vendedor (€)', inp('price_de_eur', o.price_de_eur, 'number'))}${field('Precio del mismo coche en España (€)', inp('est_es_price_eur', o.est_es_price_eur, 'number', 'si vacío: +15%'))}</div>
      <div class="row2">${field('Sobreprecio manual (%)', inp('markup_pct_ui', o.markup_pct != null ? (o.markup_pct * 100).toFixed(2) : '', 'number', 'vacío = automático'))}${field('Modo', sel('mode', [['intermediacion', 'Intermediación'], ['compraventa', 'Compraventa (VCV vende)']], o.mode))}</div>
      <div class="plate calc-box" id="calc"></div>
      ${field('Equipamiento (separado por comas)', inp('equipment', (o.equipment || []).join(', ')))}
      <div class="row2">${field('Ubicación en Alemania', inp('location_de', o.location_de, 'text', 'Múnich'))}${field('Enlace al anuncio (interno)', inp('source_url', o.source_url, 'url'))}</div>
      ${field('Notas internas', `<textarea name="notes_internal">${esc(o.notes_internal || '')}</textarea>`)}
      <div class="field"><label>Fotos</label><div class="chips" id="imgs">${(o.images || []).map((u, i) => `<span class="chip" data-i="${i}">foto ${i + 1} ✕</span>`).join('')}</div><input type="file" name="photos" accept="image/*" multiple style="margin-top:8px"></div>
      ${field('Estado', sel('status', OFFER_STATUSES, o.status))}
      <label class="check"><input type="checkbox" name="verify" ${isNew ? 'checked' : ''}> Acabo de confirmar con el vendedor que sigue disponible (renueva la verificación de ${settings.offer_valid_days} días)</label>
      <div id="omsg"></div>
      <div class="toolbar"><button class="btn">Guardar</button>${isNew ? '' : '<button type="button" class="btn ghost small" id="del-offer">Borrar oferta</button>'}</div>
    </form>`);
  const form = $('#of', d);
  let images = [...(o.images || [])];
  $('#imgs', d).addEventListener('click', (e) => { const c = e.target.closest('[data-i]'); if (!c) return; images.splice(Number(c.dataset.i), 1); c.remove(); });
  const read = () => {
    const fd = new FormData(form); const n = (k) => (fd.get(k) === '' || fd.get(k) === null ? null : Number(fd.get(k)));
    return {
      make: fd.get('make'), model: fd.get('model').trim(), version: fd.get('version').trim(), body_type: fd.get('body_type'), size_class: fd.get('size_class'),
      year: n('year'), first_registration: fd.get('first_registration') || null, km: n('km'), power_cv: n('power_cv'), fuel: fd.get('fuel'), gearbox: fd.get('gearbox'),
      color: fd.get('color'), co2_wltp: n('co2_wltp'), price_de_eur: n('price_de_eur'), est_es_price_eur: n('est_es_price_eur'),
      markup_pct: fd.get('markup_pct_ui') === '' ? null : Number(fd.get('markup_pct_ui')) / 100, mode: fd.get('mode'),
      equipment: fd.get('equipment').split(',').map((s) => s.trim()).filter(Boolean), location_de: fd.get('location_de'),
      source_url: fd.get('source_url') || null, notes_internal: fd.get('notes_internal'), status: fd.get('status'),
    };
  };
  const calc = () => {
    const v = read();
    if (!v.price_de_eur) { $('#calc', d).innerHTML = '<span class="dim">Introduce el precio del vendedor para calcular.</span>'; return null; }
    const p = offerPrice(v, settings);
    $('#calc', d).innerHTML = `<table class="breakdown">
      <tr><td>Precio vendedor</td><td>${eur(p.seller)}</td></tr><tr><td>Honorario VCV (${(p.markup_pct * 100).toFixed(2)}%)</td><td>${eur(p.markup)}</td></tr>
      <tr><td>Camión (coste)</td><td>${eur(p.transport)}</td></tr><tr><td>ITV, DGT, placas</td><td>${eur(p.fees)}</td></tr>
      <tr><td>Impuesto matriculación (${(p.iedmt_rate * 100).toFixed(2)}%)</td><td>${eur(p.iedmt)}</td></tr>${p.iva ? `<tr><td>IVA</td><td>${eur(p.iva)}</td></tr>` : ''}
      <tr class="total"><td>Precio VCV</td><td>${eur(p.total)}</td></tr></table>
      <p style="margin:10px 0 0">${p.publishable ? `<span class="pill ok">Publicable</span> El cliente ahorra <b>${eur(p.savings)}</b> (${(p.savings_pct * 100).toFixed(1)}%) frente a ${eur(p.es_price)}.` : `<span class="pill warn">No publicable</span> ${esc(p.block_reason)}`}</p>`;
    return p;
  };
  form.addEventListener('input', calc); calc();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = read(); const p = calc(); const msg = $('#omsg', d);
    if (!v.model || !v.price_de_eur) { msg.innerHTML = '<div class="alert err">Modelo y precio del vendedor son obligatorios.</div>'; return; }
    if (v.status === 'publicada' && !p.publishable) { msg.innerHTML = `<div class="alert err">No se puede publicar: ${esc(p.block_reason)} Baja el sobreprecio o guarda como borrador.</div>`; return; }
    try {
      const newImgs = await uploadImages(new FormData(form).getAll('photos').filter((x) => x.size), `ofertas/${slugify(`${v.make}-${v.model}`)}`);
      const row = { ...v, images: [...images, ...newImgs], price_vcv_eur: p.total, est_savings_eur: p.savings };
      if (new FormData(form).get('verify')) row.verified_at = new Date().toISOString();
      if (isNew) {
        row.slug = `${slugify(`${v.make}-${v.model}-${v.version || ''}-${v.year || ''}`)}-${Math.random().toString(36).slice(2, 6)}`;
        await api('POST', 'offers', row);
      } else {
        await api('PATCH', `offers?id=eq.${o.id}`, row);
      }
      toast('Oferta guardada'); closeDrawer(); viewOffers();
    } catch (err) { msg.innerHTML = `<div class="alert err">${esc(err.message)}</div>`; }
  });
  $('#del-offer', d)?.addEventListener('click', async () => {
    if (!confirm('¿Borrar esta oferta?')) return;
    await api('DELETE', `offers?id=eq.${o.id}`); closeDrawer(); viewOffers();
  });
}

// ---------- Vendedores ----------
async function viewSellers() {
  const rows = await api('GET', 'sellers?select=*&order=created_at.desc');
  const main = $('#main');
  main.innerHTML = `<div class="toolbar"><h2 style="font-size:24px;margin:0 auto 0 0">Vendedores</h2></div>
    ${rows.length ? `<table class="data"><thead><tr><th>Empresa</th><th>Contacto</th><th>Stock</th><th>Mensaje</th><th>Estado</th><th></th></tr></thead><tbody>
    ${rows.map((s) => `<tr><td><b>${esc(s.company)}</b><br><span class="dim">${esc(s.city || '')} · ${esc(s.country)}</span>${s.website ? `<br><a href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.website)}</a>` : ''}</td>
      <td>${esc(s.contact_name || '')}<br><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><br>${esc(s.phone || '')}</td><td>${esc(s.stock_size || '')}</td><td class="dim">${esc(s.message || '')}</td>
      <td>${statusPill(s.status)}</td><td><button class="btn ghost small" data-st="aprobado" data-id="${esc(s.id)}">Aprobar</button> <button class="btn ghost small" data-st="rechazado" data-id="${esc(s.id)}">Rechazar</button></td></tr>`).join('')}
    </tbody></table>` : '<div class="empty plate">Aún no hay solicitudes de vendedores.</div>'}`;
  $$('[data-st]', main).forEach((b) => b.addEventListener('click', async () => {
    await api('PATCH', `sellers?id=eq.${b.dataset.id}`, { status: b.dataset.st }); toast('Vendedor actualizado'); viewSellers();
  }));
}

// ---------- Ajustes ----------
async function viewSettings() {
  await loadSettings();
  const { services: _s, ...editable } = settings;
  const main = $('#main');
  main.innerHTML = `<div class="toolbar"><h2 style="font-size:24px;margin:0 auto 0 0">Ajustes de precios</h2></div>
    <p class="muted">Cambia aquí tasas, porcentajes y tarifas. Se aplican al momento en la web. Formato JSON: respeta comillas y comas.</p>
    <ul class="dim" style="font-size:13.5px"><li><b>markup_share</b>: parte de la diferencia con España que se queda VCV (0,375 = 37,5%).</li>
      <li><b>markup_min_pct / markup_max_pct / markup_min_eur</b>: límites del sobreprecio.</li><li><b>min_savings_eur / min_savings_pct</b>: ahorro mínimo del cliente para publicar.</li>
      <li><b>truck_price / truck_cost / rodando_pct</b>: tarifas de traslado. <b>fees</b>: ITV, DGT, placas.</li></ul>
    <textarea id="js" style="min-height:420px;font-family:var(--mono);font-size:13px">${esc(JSON.stringify(editable, null, 2))}</textarea>
    <div id="smsg" style="margin:10px 0"></div><button class="btn" id="save">Guardar ajustes</button>`;
  $('#save').addEventListener('click', async () => {
    let value;
    try { value = JSON.parse($('#js').value); } catch (e) { $('#smsg').innerHTML = `<div class="alert err">JSON no válido: ${esc(e.message)}</div>`; return; }
    try { await api('PATCH', 'settings?key=eq.pricing', { value, updated_at: new Date().toISOString() }); toast('Ajustes guardados'); } catch (e) { $('#smsg').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  });
}

$('#logout').addEventListener('click', logout);
await getSettings();
render();
