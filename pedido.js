import { mountLayout, $, $$, esc, eur, km, utm } from './layout.js';
import { listZones, submit, IS_DEMO } from './api.js';
import { CATALOG, BODY_TYPES, FUELS, COLORS } from './demo-data.js';
import { DEFAULT_FILTERS, queryToFilters } from './filters.js';

mountLayout({ active: 'A la carta' });
const st = { ...structuredClone(DEFAULT_FILTERS), price_min: 25000, price_max: 45000, ...queryToFilters(location.search) };
const opt = (v, l, sel) => `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${l}</option>`;
const YEARS = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i);
const CVS = [100, 150, 200, 250, 300, 400, 500];

function chips(key, values) {
  const box = $(`.chips[data-key="${key}"]`);
  box.innerHTML = values.map((v) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${st[key].includes(v)}">${esc(v)}</button>`).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v;
    st[key] = st[key].includes(v) ? st[key].filter((x) => x !== v) : [...st[key], v];
    b.setAttribute('aria-pressed', String(st[key].includes(v)));
    if (key === 'makes') { st.model = ''; models(); }
  });
}
chips('body_types', BODY_TYPES); chips('makes', Object.keys(CATALOG)); chips('fuels', FUELS); chips('gearboxes', ['Automático', 'Manual']);
const sw = $('.swatches[data-key="colors"]');
sw.innerHTML = COLORS.map((c) => `<button type="button" class="swatch" title="${c.name}" aria-label="${c.name}" aria-pressed="${st.colors.includes(c.name)}" data-v="${c.name}" style="background:${c.hex}"></button>`).join('');
sw.addEventListener('click', (e) => {
  const b = e.target.closest('.swatch'); if (!b) return;
  const v = b.dataset.v;
  st.colors = st.colors.includes(v) ? st.colors.filter((x) => x !== v) : [...st.colors, v];
  b.setAttribute('aria-pressed', String(st.colors.includes(v)));
});
function models() {
  const list = (st.makes.length ? st.makes : Object.keys(CATALOG)).flatMap((m) => CATALOG[m].map((x) => [m, x]));
  $('#model').innerHTML = opt('', 'Cualquier modelo') + list.map(([m, x]) => opt(x, st.makes.length === 1 ? x : `${m} ${x}`, st.model)).join('');
}
models();
$('#model').addEventListener('change', (e) => { st.model = e.target.value; });
$('#year_min').innerHTML = opt('', 'Indiferente') + [...YEARS].reverse().map((y) => opt(y, y, st.year_min)).join('');
$('#year_max').innerHTML = opt('', 'Indiferente') + YEARS.map((y) => opt(y, y, st.year_max)).join('');
$('#cv_min').innerHTML = opt('', 'Indiferente') + CVS.map((c) => opt(c, `${c} CV`, st.cv_min)).join('');
$('#cv_max').innerHTML = opt('', 'Indiferente') + CVS.map((c) => opt(c, `${c} CV`, st.cv_max)).join('');
for (const k of ['year_min', 'year_max', 'cv_min', 'cv_max']) $(`#${k}`).addEventListener('change', (e) => { st[k] = e.target.value ? Number(e.target.value) : ''; });
const kmEl = $('#km_max'); kmEl.value = st.km_max; $('#o-km').textContent = km(st.km_max);
kmEl.addEventListener('input', () => { st.km_max = Number(kmEl.value); $('#o-km').textContent = km(st.km_max); });

const pmin = $('#p-min'), pmax = $('#p-max'), nmin = $('#n-min'), nmax = $('#n-max');
function price(lo, hi, fromNum) {
  lo = Math.max(0, Number(lo) || 0); hi = Math.max(lo, Number(hi) || lo);
  st.price_min = lo; st.price_max = hi;
  pmin.value = lo; pmax.value = hi;
  if (!fromNum) { nmin.value = lo; nmax.value = hi; }
  $('#o-price').textContent = `${eur(lo)} – ${eur(hi)}`;
}
pmin.addEventListener('input', () => price(Math.min(+pmin.value, +pmax.value), pmax.value));
pmax.addEventListener('input', () => price(pmin.value, Math.max(+pmax.value, +pmin.value)));
nmin.addEventListener('change', () => price(nmin.value, nmax.value, true));
nmax.addEventListener('change', () => price(nmin.value, nmax.value, true));
price(st.price_min, st.price_max);

const zones = await listZones();
$('#city').innerHTML = zones.map((z) => `<option ${z.city === 'Valencia' ? 'selected' : ''}>${esc(z.city)}</option>`).join('') + '<option>Otra</option>';

// ---------- pasos ----------
let step = 1;
const msg = $('#msg');
function show(n) {
  step = n;
  $$('.form-step').forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  $$('.stepper span').forEach((s, i) => s.classList.toggle('on', i < n));
  $('#prev').hidden = n === 1;
  $('#next').innerHTML = n === 3 ? 'Enviar pedido <span class="arrow">→</span>' : 'Siguiente →';
  msg.innerHTML = '';
  if (n === 3) summary();
  $('#box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function summary() {
  const parts = [
    st.makes.join(' / ') || 'Cualquier marca', st.model, st.body_types.join(', '), st.fuels.join(', '),
    st.year_min || st.year_max ? `${st.year_min || '…'}–${st.year_max || '…'}` : '', st.km_max ? `< ${km(st.km_max)}` : '',
  ].filter(Boolean);
  $('#summary').innerHTML = `<div class="flabel">Tu encargo</div><div>${esc(parts.join(' · '))}</div>
    <div class="mono" style="color:var(--copper);margin-top:6px">${eur(st.price_min)} – ${eur(st.price_max)} · entrega en ${esc($('#city').value)}</div>`;
}
$('#prev').addEventListener('click', () => show(step - 1));
$('#next').addEventListener('click', async () => {
  if (step === 1 && !st.makes.length && !st.body_types.length) {
    msg.innerHTML = '<div class="alert err">Elige al menos una marca o un tipo de coche.</div>'; return;
  }
  if (step < 3) return show(step + 1);
  const fd = new FormData($('#f'));
  if (!fd.get('name') || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fd.get('email') || '')) { msg.innerHTML = '<div class="alert err">Revisa tu nombre y tu email.</div>'; return; }
  if (!fd.get('gdpr_consent')) { msg.innerHTML = '<div class="alert err">Necesitamos que aceptes la política de privacidad.</div>'; return; }
  const btn = $('#next'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const { sort: _s, price_min, price_max, ...filters } = st;
    const r = await submit('pedido', {
      filters, price_min, price_max,
      name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), message: fd.get('message'),
      delivery_city: fd.get('delivery_city'), timeline: fd.get('timeline'), must_have: fd.get('must_have'),
      services_interest: fd.getAll('services'), website_hp: fd.get('website_hp'),
      whatsapp_ok: !!fd.get('whatsapp_ok'), gdpr_consent: true, marketing_consent: !!fd.get('marketing_consent'), utm: utm(),
    });
    $('#box').innerHTML = `
      <div class="sheet-head mono dim" style="display:flex;justify-content:space-between;font-size:12px;letter-spacing:.1em;margin-bottom:14px"><span>FICHA DE ENCARGO</span><span>Nº ${esc(r.code)}</span></div>
      <p><span class="stamp">Encargo recibido</span></p>
      <h2 style="margin-top:14px">Gracias, ya estamos buscando</h2>
      <p class="muted">Tu pedido es el <b class="mono" style="color:var(--copper)">${esc(r.code)}</b>. Te hemos enviado un email con un enlace privado para seguirlo${IS_DEMO ? ' (en modo demo no se envía)' : ''}. Normalmente tenemos las propuestas en 24–72 h.</p>
      ${r.token ? `<p style="margin-top:18px"><a class="btn" href="mi-pedido.html?t=${encodeURIComponent(r.token)}">Ver mi pedido</a></p>` : ''}`;
  } catch (err) {
    msg.innerHTML = `<div class="alert err">${esc(err.message)}</div>`;
    btn.disabled = false; btn.innerHTML = 'Enviar pedido <span class="arrow">→</span>';
  }
});
