import { mountLayout, $, $$, esc, eur, km, offerCard } from './layout.js';
import { listOffers, getSettings, listZones } from './api.js';
import { offerPrice, transportQuote, isOfferFresh } from './pricing.js';
import { CATALOG, BODY_TYPES, FUELS, COLORS } from './demo-data.js';
import { carArt } from './car-art.js';
import { filtersToQuery, queryToFilters, DEFAULT_FILTERS } from './filters.js';

mountLayout({ active: 'Ofertas' });
$('#hero-art').innerHTML = carArt({ body_type: 'Familiar', color: 'Gris' });

const settings = await getSettings();
const offers = (await listOffers()).filter((o) => isOfferFresh(o, settings) || o.is_demo);
const priced = offers.map((o) => ({ ...o, _p: offerPrice(o, settings) })).filter((o) => o._p.publishable);
const state = { ...DEFAULT_FILTERS, ...queryToFilters(location.search) };

// ---------- construir controles ----------
const YEARS = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i);
const CVS = [100, 150, 200, 250, 300, 400, 500];
function chips(key, values) {
  const box = $(`.chips[data-key="${key}"]`);
  box.innerHTML = values.map((v) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="false">${esc(v)}</button>`).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v; const arr = state[key];
    state[key] = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    if (key === 'makes') state.model = '';
    update();
  });
}
chips('body_types', BODY_TYPES);
chips('makes', Object.keys(CATALOG));
chips('fuels', FUELS);
chips('gearboxes', ['Automático', 'Manual']);
const sw = $('.swatches[data-key="colors"]');
sw.innerHTML = COLORS.map((c) => `<button type="button" class="swatch" title="${c.name}" aria-label="${c.name}" aria-pressed="false" data-v="${c.name}" style="background:${c.hex}"></button>`).join('');
sw.addEventListener('click', (e) => {
  const b = e.target.closest('.swatch'); if (!b) return;
  const v = b.dataset.v;
  state.colors = state.colors.includes(v) ? state.colors.filter((x) => x !== v) : [...state.colors, v];
  update();
});
const opt = (v, l, sel) => `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${l}</option>`;
$('#f-ymin').innerHTML = opt('', 'Desde') + [...YEARS].reverse().map((y) => opt(y, y, state.year_min)).join('');
$('#f-ymax').innerHTML = opt('', 'Hasta') + YEARS.map((y) => opt(y, y, state.year_max)).join('');
$('#f-cvmin').innerHTML = opt('', 'Mín. CV') + CVS.map((c) => opt(c, `${c} CV`, state.cv_min)).join('');
$('#f-cvmax').innerHTML = opt('', 'Máx. CV') + CVS.map((c) => opt(c, `${c} CV`, state.cv_max)).join('');

const bind = (sel, key, num = true) => $(sel).addEventListener('change', (e) => { state[key] = e.target.value === '' ? '' : num ? Number(e.target.value) : e.target.value; update(); });
bind('#f-ymin', 'year_min'); bind('#f-ymax', 'year_max'); bind('#f-cvmin', 'cv_min'); bind('#f-cvmax', 'cv_max');
bind('#f-model', 'model', false);
$('#f-km').addEventListener('input', (e) => { state.km_max = Number(e.target.value); update(); });
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });

const pmin = $('#f-pmin'), pmax = $('#f-pmax'), npmin = $('#n-pmin'), npmax = $('#n-pmax');
function setPrice(lo, hi, from) {
  lo = Math.max(0, Number(lo) || 0); hi = Math.max(lo, Number(hi) || lo);
  state.price_min = lo; state.price_max = hi;
  if (from !== 'num') { npmin.value = lo; npmax.value = hi; }
  update();
}
pmin.addEventListener('input', () => { if (+pmin.value > +pmax.value) pmin.value = pmax.value; setPrice(pmin.value, pmax.value); });
pmax.addEventListener('input', () => { if (+pmax.value < +pmin.value) pmax.value = pmin.value; setPrice(pmin.value, pmax.value); });
npmin.addEventListener('change', () => setPrice(npmin.value, npmax.value, 'num'));
npmax.addEventListener('change', () => setPrice(npmin.value, npmax.value, 'num'));
$('#reset').addEventListener('click', () => { Object.assign(state, structuredClone(DEFAULT_FILTERS)); syncControls(); update(); });

$('#open-filters').addEventListener('click', () => $('#filters').classList.add('open'));
$('#close-filters').addEventListener('click', () => $('#filters').classList.remove('open'));
$('#apply-filters').addEventListener('click', () => { $('#filters').classList.remove('open'); $('#results').scrollIntoView({ behavior: 'smooth' }); });

function syncControls() {
  for (const key of ['body_types', 'makes', 'fuels', 'gearboxes']) {
    $$(`.chips[data-key="${key}"] .chip`).forEach((b) => b.setAttribute('aria-pressed', String(state[key].includes(b.dataset.v))));
  }
  $$('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(state.colors.includes(b.dataset.v))));
  const models = (state.makes.length ? state.makes : Object.keys(CATALOG)).flatMap((m) => CATALOG[m].map((x) => [m, x]));
  $('#f-model').innerHTML = opt('', 'Todos los modelos') + models.map(([m, x]) => opt(x, state.makes.length === 1 ? x : `${m} ${x}`, state.model)).join('');
  $('#f-ymin').value = state.year_min; $('#f-ymax').value = state.year_max;
  $('#f-cvmin').value = state.cv_min; $('#f-cvmax').value = state.cv_max;
  $('#f-km').value = state.km_max; $('#o-km').textContent = km(state.km_max);
  pmin.value = state.price_min; pmax.value = state.price_max; npmin.value = state.price_min; npmax.value = state.price_max;
  $('#o-price').textContent = `${eur(state.price_min)} – ${eur(state.price_max)}`;
  $('#sort').value = state.sort;
}

// ---------- coincidencia y "6 como mínimo" ----------
function matches(o) {
  const f = state; const t = o._p.total;
  return (!f.body_types.length || f.body_types.includes(o.body_type))
    && (!f.makes.length || f.makes.includes(o.make))
    && (!f.model || o.model === f.model)
    && (!f.year_min || o.year >= f.year_min) && (!f.year_max || o.year <= f.year_max)
    && (!f.km_max || o.km <= f.km_max)
    && (!f.colors.length || f.colors.includes(o.color))
    && (!f.cv_min || o.power_cv >= f.cv_min) && (!f.cv_max || o.power_cv <= f.cv_max)
    && (!f.fuels.length || f.fuels.includes(o.fuel))
    && (!f.gearboxes.length || f.gearboxes.includes(o.gearbox))
    && t >= f.price_min && t <= f.price_max;
}
function similarity(o) {
  const f = state; let s = 0; const t = o._p.total;
  if (f.makes.includes(o.make)) s += 4;
  if (f.model && o.model === f.model) s += 4;
  if (f.body_types.includes(o.body_type)) s += 3;
  if (f.fuels.includes(o.fuel)) s += 2;
  if (f.colors.includes(o.color)) s += 1;
  const mid = (f.price_min + f.price_max) / 2;
  s -= Math.abs(t - mid) / 10000;
  if (f.km_max && o.km > f.km_max) s -= (o.km - f.km_max) / 20000;
  return s;
}
const SORTS = {
  savings: (a, b) => b._p.savings - a._p.savings,
  price_asc: (a, b) => a._p.total - b._p.total,
  price_desc: (a, b) => b._p.total - a._p.total,
  km: (a, b) => a.km - b.km,
  year: (a, b) => b.year - a.year,
};

function update() {
  syncControls();
  const exact = priced.filter(matches).sort(SORTS[state.sort]);
  let alts = [];
  if (exact.length < 6) {
    alts = priced.filter((o) => !exact.includes(o)).sort((a, b) => similarity(b) - similarity(a)).slice(0, 6 - exact.length);
  }
  $('#count').textContent = exact.length
    ? `${exact.length} ${exact.length === 1 ? 'oferta encaja' : 'ofertas encajan'} con tu pedido${alts.length ? ` · ${alts.length} alternativas similares` : ''}`
    : `Ninguna oferta exacta ahora mismo · ${alts.length} alternativas similares`;
  $('#results').innerHTML = exact.map((o) => offerCard(o, settings)).join('') + alts.map((o) => offerCard(o, settings, { alt: true })).join('');
  const q = filtersToQuery(state);
  history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
  $('#to-order').href = `pedido.html${q ? `?${q}` : ''}`;
}
update();

// ---------- servicios ----------
const S = settings.services;
$('#sv-insp').innerHTML = ['inspeccion_diagnostico', 'inspeccion_manejo', 'inspeccion_completa']
  .map((k) => `<li><span>${esc(S[k].label)}</span><b>${eur(S[k].price)}</b></li>`).join('');
$('#sv-gest').innerHTML = `<li><span>Coche hasta ${eur(S.gestion.high_from)}</span><b>${eur(S.gestion.price)}</b></li><li><span>Coche de más de ${eur(S.gestion.high_from)}</span><b>${eur(S.gestion.price_high)}</b></li><li><span>Impuestos y tasas</span><b>al coste</b></li>`;
const zones = await listZones();
$('#tq-city').innerHTML = zones.map((z) => `<option value="${z.zone}" ${z.city === 'Valencia' ? 'selected' : ''}>${esc(z.city)}</option>`).join('');
function tq() {
  const q = transportQuote(Number($('#tq-price').value), $('#tq-size').value, Number($('#tq-city').value), settings);
  $('#sv-tras').innerHTML = `<li><span>En camión</span><b>${eur(q.truck)}</b></li><li><span>Conducido</span><b>${eur(q.rodando)}</b></li>`;
}
['#tq-price', '#tq-size', '#tq-city'].forEach((s) => $(s).addEventListener('input', tq));
tq();

const avg = priced.length ? priced.reduce((a, o) => a + o._p.savings_pct, 0) / priced.length : 0.1;
$('#hero-save').textContent = `−${Math.round(avg * 100)}%`;
