import { mountLayout, $, $$, esc, eur, km } from './layout.js';
import { getRequest, getSettings, listZones, confirmChoice, IS_DEMO } from './api.js';
import { servicesTotal, transportQuote, gestionPrice } from './pricing.js';
import { carArt } from './car-art.js';

mountLayout();
const main = $('#main');
const token = new URLSearchParams(location.search).get('t') || (IS_DEMO ? 'demo-ejemplo' : '');
const STEPS = [
  ['nuevo', 'Recibido'], ['buscando', 'Buscando'], ['propuestas_enviadas', 'Propuestas'], ['elegido', 'Elegido'],
  ['inspeccion', 'Inspección'], ['compra', 'Compra'], ['importacion', 'Importación'], ['traslado', 'Traslado'], ['entregado', 'Entregado'],
];

let data;
try {
  if (!token) throw new Error('Falta el enlace de tu pedido. Usa el botón del email que te enviamos.');
  data = await getRequest(token);
} catch (e) {
  main.innerHTML = `<div class="empty"><h2>No podemos abrir este pedido</h2><p>${esc(e.message)}</p><p><a class="btn" href="index.html">Ir al inicio</a></p></div>`;
  throw e;
}
const [settings, zones] = await Promise.all([getSettings(), listZones()]);
const { request: r, proposals, offer } = data;
const idx = STEPS.findIndex(([s]) => s === r.status);
const f = r.filters || {};
const want = [f.makes?.join(' / '), f.model, f.body_types?.join(', '), f.fuels?.join(', '),
  f.year_min || f.year_max ? `${f.year_min || '…'}–${f.year_max || '…'}` : '', f.km_max ? `< ${km(f.km_max)}` : ''].filter(Boolean).join(' · ');

main.innerHTML = `
  <div class="plate rivets" style="padding:22px 24px">
    <div class="mono dim" style="display:flex;justify-content:space-between;font-size:12px;letter-spacing:.1em;padding:0 6px"><span>${r.kind === 'reserva' ? 'RESERVA DE OFERTA' : 'FICHA DE ENCARGO'}</span><span>Nº ${esc(r.code)}</span></div>
    <h1 style="font-size:clamp(28px,4vw,44px);margin:14px 0 4px">Hola, ${esc(r.first_name || '')}</h1>
    <p class="muted" style="margin:0">${r.status === 'cancelado' ? 'Este pedido está cancelado.' : r.kind === 'reserva' ? 'Estamos confirmando tu reserva con el vendedor.' : r.status === 'propuestas_enviadas' ? 'Ya tienes tus propuestas: compáralas, elige una y añade los servicios que quieras.' : idx >= 3 ? 'Tu coche está en marcha. Te avisamos en cada paso.' : 'Estamos buscando tu coche en Alemania. Te avisamos por email cuando tengamos las propuestas.'}</p>
    <div class="timeline">${STEPS.map(([s, l], i) => `<div class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${l}</div>`).join('')}</div>
    ${r.kind === 'pedido' ? `<p class="dim" style="font-size:14px;margin:14px 0 0"><b class="muted">Tu encargo:</b> ${esc(want || 'a la carta')} · <span class="mono" style="color:var(--copper)">${eur(r.price_min)} – ${eur(r.price_max)}</span> · entrega en ${esc(r.delivery_city || '—')}</p>` : ''}
  </div>
  <div id="content"></div>`;

const content = $('#content');
if (r.kind === 'reserva' && offer) {
  content.innerHTML = `<div class="plate" style="padding:22px;margin-top:20px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:20px;align-items:center">
    <div style="border-radius:4px;overflow:hidden">${carArt(offer)}</div>
    <div><div class="make mono dim">${esc(offer.make)}</div><h2 style="font-size:26px;margin:4px 0">${esc(offer.model)} <span class="muted" style="font-size:16px;text-transform:none">${esc(offer.version || '')}</span></h2>
    <p class="mono muted">${esc(offer.year)} · ${km(offer.km)} · ${esc(offer.power_cv)} CV · ${esc(offer.fuel)}</p>
    <p class="mono" style="font-size:26px;color:var(--copper);margin:6px 0">${eur(offer.price_vcv_eur)}</p>
    <p class="dim" style="font-size:13px">Precio final en España con inspección, importación, matrícula y traslado incluidos. Te contactamos para la señal y la inspección.</p></div></div>`;
} else if (!proposals.length) {
  content.innerHTML = `<div class="plate empty" style="margin-top:20px"><p class="stamp">Buscando</p><p style="margin-top:14px">Nuestro equipo está revisando concesionarios en Alemania. Recibirás un email cuando tengas tus 5–6 propuestas.</p></div>`;
} else {
  const chosenId = proposals.find((p) => p.chosen)?.id || null;
  const locked = idx >= 3;
  content.innerHTML = `
    <div class="section-head" style="margin:34px 0 14px"><div><div class="eyebrow">${proposals.length} propuestas</div><h2 style="font-size:28px;margin:0">${locked ? 'Tu elección' : 'Elige tu coche'}</h2></div>
    ${IS_DEMO ? '<span class="demo-badge">PROPUESTAS DE EJEMPLO</span>' : ''}</div>
    <div class="grid" id="props">${proposals.map((p) => `
      <div class="car plate proposal ${p.id === chosenId ? 'selected' : ''}" data-id="${esc(p.id)}" tabindex="0" role="button" aria-pressed="${p.id === chosenId}">
        <div class="art">${p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="">` : carArt({ body_type: f.body_types?.[0] || 'Berlina', color: p.color })}
          ${p.id === chosenId ? '<span class="fresh" style="color:var(--copper)">● ELEGIDO</span>' : ''}</div>
        <div class="body">
          <div class="make">${esc(p.make)}</div><h3>${esc(p.model)}</h3><div class="version">${esc(p.version || '')}</div>
          <div class="specline"><span>${esc(p.year)}</span><span>${km(p.km)}</span><span>${esc(p.power_cv || '—')} CV</span><span>${esc(p.fuel || '')}</span><span>${esc(p.color || '')}</span></div>
          ${p.notes ? `<p class="dim" style="font-size:13px;margin:0">${esc(p.notes)}</p>` : ''}
          <div class="price-block"><div><div class="lbl">Precio en Alemania</div><div class="total">${eur(p.price_de_eur)}</div></div>
          ${p.source_url && p.source_url !== '#' ? `<a class="dim mono" style="font-size:12px" href="${esc(p.source_url)}" target="_blank" rel="noopener">Ver anuncio ↗</a>` : ''}</div>
        </div>
      </div>`).join('')}</div>
    <div class="plate rivets" style="padding:24px;margin-top:24px" id="config">
      <div class="eyebrow">Servicios</div><h2 style="font-size:26px">Configura tu compra</h2>
      <p class="muted" id="cfg-car">Elige primero uno de los coches.</p>
      <div class="form" id="cfg" style="max-width:720px">
        <div class="field"><span class="label">1 · Inspección en Alemania</span><div class="form" style="gap:8px" id="insp"></div></div>
        <div class="field"><span class="label">2 · Gestión de importación y matrícula</span><div class="form" style="gap:8px" id="gest"></div></div>
        <div class="field"><span class="label">3 · Traslado</span>
          <select id="city" style="margin-bottom:8px">${zones.map((z) => `<option value="${esc(z.city)}" data-zone="${z.zone}" ${z.city === r.delivery_city ? 'selected' : ''}>${esc(z.city)}</option>`).join('')}</select>
          <div class="form" style="gap:8px" id="tras"></div></div>
        <table class="breakdown" id="totals"></table>
        <div id="msg"></div>
        <button class="btn" id="confirm" ${locked ? 'disabled' : ''}>${locked ? 'Elección confirmada' : 'Confirmar mi elección'} <span class="arrow">→</span></button>
        <p class="dim" style="font-size:12.5px;margin:0">Al confirmar no pagas nada todavía: te contactamos para la señal y para organizar la inspección. El impuesto de matriculación y las tasas se pagan al coste y con justificante.</p>
      </div>
    </div>`;

  let sel = chosenId ? proposals.find((p) => p.id === chosenId) : null;
  const choice = { inspeccion: 'inspeccion_manejo', gestion: true, traslado: 'camion', ...(r.chosen_services || {}) };
  const radio = (name, value, label, price, sub = '') => `<label class="opt"><input type="radio" name="${name}" value="${value}" ${String(choice[name]) === String(value) ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="p">${price}</span></label>`;
  function render() {
    const price = sel ? Number(sel.price_de_eur) : 0;
    const zone = Number($('#city').selectedOptions[0]?.dataset.zone || 2);
    const size = sel?.size_class || 'medio';
    const S = settings.services;
    $('#cfg-car').innerHTML = sel ? `Coche elegido: <b>${esc(sel.make)} ${esc(sel.model)} ${esc(sel.version || '')}</b> · <span class="mono">${eur(price)}</span>` : 'Elige primero uno de los coches.';
    $('#insp').innerHTML = ['inspeccion_diagnostico', 'inspeccion_manejo', 'inspeccion_completa'].map((k) => radio('inspeccion', k, S[k].label, eur(S[k].price))).join('') + radio('inspeccion', '', 'Sin inspección', '0 €', 'No recomendado: compras sin ver el coche.');
    $('#gest').innerHTML = radio('gestion', 'true', 'Sí, encargaos de todo', eur(gestionPrice(price, settings)), 'Impuestos y tasas aparte, al coste.') + radio('gestion', 'false', 'No, lo gestiono yo', '0 €');
    const q = transportQuote(price, size, zone, settings);
    $('#tras').innerHTML = radio('traslado', 'camion', 'En camión', eur(q.truck), 'El coche llega sin sumar kilómetros.') + radio('traslado', 'rodando', 'Conducido', eur(q.rodando), 'Un conductor profesional lo trae por carretera: suma unos 2.000 km.') + radio('traslado', '', 'Lo recojo yo en Alemania', '0 €');
    const t = servicesTotal({ inspeccion: choice.inspeccion || null, gestion: String(choice.gestion) === 'true', traslado: choice.traslado || null }, price, size, zone, settings);
    $('#totals').innerHTML = (sel ? `<tr><td>Coche en Alemania (lo pagas al vendedor)</td><td>${eur(price)}</td></tr>` : '') + t.lines.map((l) => `<tr><td>${esc(l.label)}</td><td>${eur(l.price)}</td></tr>`).join('') + `<tr class="total"><td>Total servicios VGV</td><td>${eur(t.total)}</td></tr>`;
    $('#confirm').dataset.total = t.total;
    $$('#cfg input[type=radio]').forEach((i) => i.addEventListener('change', () => { choice[i.name] = i.value; render(); }));
  }
  $('#city').addEventListener('change', render);
  $$('.proposal').forEach((el) => {
    const pick = () => {
      if (locked) return;
      sel = proposals.find((p) => String(p.id) === el.dataset.id);
      $$('.proposal').forEach((x) => { x.classList.toggle('selected', x === el); x.setAttribute('aria-pressed', String(x === el)); });
      render(); $('#config').scrollIntoView({ behavior: 'smooth' });
    };
    el.addEventListener('click', pick);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  render();
  $('#confirm').addEventListener('click', async () => {
    const msg = $('#msg');
    if (!sel) { msg.innerHTML = '<div class="alert err">Elige uno de los coches.</div>'; return; }
    const btn = $('#confirm'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await confirmChoice({ token, proposal_id: sel.id, services: { inspeccion: choice.inspeccion || null, gestion: String(choice.gestion) === 'true', traslado: choice.traslado || null },
        services_total: Number(btn.dataset.total), delivery_city: $('#city').value });
      msg.innerHTML = '<div class="alert ok"><b>¡Elección confirmada!</b> Te contactamos en 24 h para la señal y para organizar la inspección.</div>';
      btn.textContent = 'Elección confirmada';
    } catch (e) {
      msg.innerHTML = `<div class="alert err">${esc(e.message)}</div>`;
      btn.disabled = false; btn.innerHTML = 'Confirmar mi elección <span class="arrow">→</span>';
    }
  });
}
