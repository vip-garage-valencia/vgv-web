import { mountLayout, $, esc, eur, km, utm, daysAgoLabel } from './layout.js';
import { getOffer, getSettings, listZones, submit, IS_DEMO } from './api.js';
import { offerPrice, isOfferFresh } from './pricing.js';
import { carArt } from './car-art.js';
import { filtersToQuery } from './filters.js';

mountLayout({ active: 'Ofertas' });
const slug = new URLSearchParams(location.search).get('o');
const [o, settings, zones] = await Promise.all([slug ? getOffer(slug) : null, getSettings(), listZones()]);
const main = $('#main');

if (!o || (!isOfferFresh(o, settings) && !o.is_demo)) {
  main.innerHTML = `<div class="empty"><h2>Esta oferta ya no está disponible</h2><p>Los coches buenos se venden rápido. Te buscamos uno igual.</p>
    <p><a class="btn" href="index.html#ofertas">Ver otras ofertas</a> <a class="btn ghost" href="pedido.html">Búscame uno parecido</a></p></div>`;
} else {
  const p = offerPrice(o, settings);
  document.title = `${o.make} ${o.model} ${o.version || ''} · ${eur(p.total)} · VCV`;
  const similar = filtersToQuery({ makes: [o.make], model: o.model, body_types: [o.body_type], fuels: [o.fuel], price_min: Math.round(p.total * 0.85 / 1000) * 1000, price_max: Math.round(p.total * 1.15 / 1000) * 1000 });
  const pct = (x) => `${(x * 100).toFixed(x * 100 % 1 ? 2 : 0).replace('.', ',')}%`;
  main.innerHTML = `
  <p class="dim mono" style="margin:22px 0 0;font-size:12px"><a href="index.html#ofertas">← Ofertas</a> / ${esc(o.make)} / ${esc(o.model)}</p>
  <div class="detail">
    <div>
      <div class="art-big plate">${o.images?.[0] ? `<img src="${esc(o.images[0])}" alt="${esc(o.make)} ${esc(o.model)}">` : carArt(o, { label: 'ILUSTRACIÓN' })}</div>
      ${o.images?.length > 1 ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr));margin-top:10px">${o.images.slice(1).map((i) => `<img src="${esc(i)}" alt="" loading="lazy" style="border-radius:4px;aspect-ratio:4/3;object-fit:cover">`).join('')}</div>` : ''}
      <div style="margin-top:26px">
        <div class="make mono dim" style="letter-spacing:.16em;font-size:12px">${esc(o.make).toUpperCase()} · ${esc(o.body_type || '').toUpperCase()} ${o.is_demo ? '· <span class="demo-badge">DEMO</span>' : ''}</div>
        <h1 style="font-size:clamp(30px,4vw,48px);margin:.2em 0 .1em">${esc(o.model)}</h1>
        <p class="lead" style="margin-top:0">${esc(o.version || '')}</p>
        ${isOfferFresh(o, settings) ? `<p><span class="stamp ok">Disponibilidad verificada ${daysAgoLabel(o.verified_at)}</span></p>` : ''}
      </div>
      <div class="plate" style="padding:6px 20px 14px;margin-top:20px">
        <table class="spec-table">
          <tr><td>Primera matriculación</td><td>${esc(o.first_registration ? new Date(o.first_registration).toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' }) : o.year)}</td></tr>
          <tr><td>Kilómetros</td><td>${km(o.km)}</td></tr>
          <tr><td>Potencia</td><td>${esc(o.power_cv)} CV</td></tr>
          <tr><td>Combustible</td><td>${esc(o.fuel)}</td></tr>
          <tr><td>Cambio</td><td>${esc(o.gearbox)}</td></tr>
          <tr><td>Color</td><td>${esc(o.color)}</td></tr>
          <tr><td>Emisiones CO2 (WLTP)</td><td>${esc(o.co2_wltp ?? '—')} g/km</td></tr>
          <tr><td>Ubicación del coche</td><td>${esc(o.location_de || 'Alemania')}</td></tr>
        </table>
        ${o.equipment?.length ? `<p class="flabel" style="margin-top:16px">Equipamiento destacado</p><div class="chips">${o.equipment.map((e) => `<span class="chip" style="cursor:default">${esc(e)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="plate" style="padding:18px 20px;margin-top:18px">
        <h3>Qué incluye el precio final</h3>
        <ul class="includes">
          <li>Inspección de 200 puntos en Alemania, con prueba de manejo, historial e informe con fotos.</li>
          <li>Compra y papeles alemanes, ITV de importación, impuesto de matriculación, DGT y placas.</li>
          <li>Traslado en camión hasta tu ciudad.</li>
          <li>Reservas con señal: el coche solo se paga si supera la inspección y das el visto bueno.</li>
        </ul>
      </div>
    </div>
    <aside class="sticky-col">
      <div class="plate rivets" style="padding:22px 20px">
        <div class="flabel" style="margin-top:6px">Precio final en España</div>
        <div class="mono" style="font-size:38px;font-weight:700;color:var(--copper);line-height:1.1">${eur(p.total)}</div>
        <p style="margin:6px 0 14px"><span class="save">Ahorras ${eur(p.savings)}</span> <span class="dim mono" style="font-size:13px">vs. ${eur(p.es_price)} aquí</span></p>
        <table class="breakdown">
          <tr><td>Precio del vendedor en Alemania</td><td>${eur(p.seller)}</td></tr>
          <tr><td>Honorario VCV (${pct(p.markup_pct)}) · inspección y gestión</td><td>${eur(p.markup)}</td></tr>
          <tr><td>Traslado en camión</td><td>${eur(p.transport)}</td></tr>
          <tr><td>ITV de importación, DGT y placas</td><td>${eur(p.fees)}</td></tr>
          <tr><td>Impuesto de matriculación (${pct(p.iedmt_rate)}) <span class="dim">estimado</span></td><td>${eur(p.iedmt)}</td></tr>
          ${p.iva ? `<tr><td>IVA español (coche fiscalmente nuevo)</td><td>${eur(p.iva)}</td></tr>` : ''}
          <tr class="total"><td>Total</td><td>${eur(p.total)}</td></tr>
        </table>
        <p class="dim" style="font-size:12px;margin:10px 0 18px">Estimación orientativa: el impuesto de matriculación lo fija Hacienda según sus tablas. Te damos el presupuesto cerrado tras la inspección.</p>
        <a class="btn block" href="#reservar">Reservar este coche</a>
        <a class="btn ghost block" style="margin-top:10px" href="pedido.html?${similar}">Búscame uno parecido</a>
      </div>
    </aside>
  </div>
  <section id="reservar" style="padding-top:40px">
    <div class="plate rivets" style="padding:26px 24px;max-width:760px">
      <div class="eyebrow">Reserva sin compromiso</div>
      <h2 style="font-size:28px">Reservar ${esc(o.make)} ${esc(o.model)}</h2>
      <p class="muted">Confirmamos la disponibilidad con el vendedor y te escribimos en 24–48 h para organizar la inspección y la señal.</p>
      <form class="form" id="f" novalidate>
        <div class="row2"><div class="field"><label for="name">Nombre y apellidos</label><input id="name" name="name" type="text" required autocomplete="name"></div>
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email"></div></div>
        <div class="row2"><div class="field"><label for="phone">Teléfono / WhatsApp</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="field"><label for="city">Ciudad de entrega</label><select id="city" name="delivery_city">${zones.map((z) => `<option ${z.city === 'Valencia' ? 'selected' : ''}>${esc(z.city)}</option>`).join('')}<option>Otra</option></select></div></div>
        <div class="field"><label for="message">Comentarios</label><textarea id="message" name="message" placeholder="¿Algo que debamos revisar en especial?"></textarea></div>
        <input class="hp" name="website_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check"><input type="checkbox" name="whatsapp_ok" checked> Podéis escribirme por WhatsApp.</label>
        <label class="check"><input type="checkbox" name="gdpr_consent" required> Acepto la <a href="legal.html#privacidad" target="_blank">política de privacidad</a> y que VCV trate mis datos para gestionar esta reserva.</label>
        <label class="check"><input type="checkbox" name="marketing_consent"> Quiero recibir nuevas ofertas por email.</label>
        <div id="msg"></div>
        <button class="btn" type="submit">Enviar reserva <span class="arrow">→</span></button>
      </form>
    </div>
  </section>`;

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const fd = new FormData(f); const msg = $('#msg');
    if (!fd.get('name') || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fd.get('email') || '')) { msg.innerHTML = '<div class="alert err">Revisa tu nombre y tu email.</div>'; return; }
    if (!fd.get('gdpr_consent')) { msg.innerHTML = '<div class="alert err">Necesitamos que aceptes la política de privacidad.</div>'; return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await submit('reserva', {
        offer_slug: o.slug, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
        delivery_city: fd.get('delivery_city'), message: fd.get('message'), website_hp: fd.get('website_hp'),
        whatsapp_ok: !!fd.get('whatsapp_ok'), gdpr_consent: !!fd.get('gdpr_consent'), marketing_consent: !!fd.get('marketing_consent'),
        utm: utm(),
      });
      f.outerHTML = `<div class="alert ok"><b>Reserva recibida: ${esc(r.code)}</b><br>Te hemos enviado un email de confirmación${IS_DEMO ? ' (en modo demo no se envía)' : ''}. Te escribimos en 24–48 h.</div>
        ${r.token ? `<p style="margin-top:16px"><a class="btn" href="mi-pedido.html?t=${encodeURIComponent(r.token)}">Ver mi pedido</a></p>` : ''}`;
    } catch (err) {
      msg.innerHTML = `<div class="alert err">${esc(err.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Enviar reserva →';
    }
  });
}
