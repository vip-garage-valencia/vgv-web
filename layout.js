// Cabecera, pie, WhatsApp y utilidades compartidas.
import { CONFIG } from './config.js';
import { IS_DEMO } from './api.js';
import { carArt } from './car-art.js';
import { offerPrice, eur, num, isOfferFresh } from './pricing.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const km = (n) => `${num(n)} km`;
export { eur, num };

export function toast(msg, ms = 3200) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function daysAgoLabel(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}

const NAV = [
  ['index.html#ofertas', 'Ofertas'],
  ['pedido.html', 'A la carta'],
  ['index.html#servicios', 'Servicios'],
  ['index.html#como-funciona', 'Cómo funciona'],
  ['vendedores.html', 'Vendedores'],
];

export function mountLayout({ active = '' } = {}) {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    ${IS_DEMO ? '<div class="demo-ribbon">MODO DEMO · coches de prueba · los formularios no envían datos reales</div>' : ''}
    <div class="wrap">
      <a class="brand" href="index.html" aria-label="VCV Vip Cars Valencia, inicio">
        <img src="logo-vcv.png" alt="VCV" width="100" height="30">
        <small>VIP · CARS · VALENCIA</small>
      </a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav">MENÚ</button>
      <nav class="nav" id="nav">
        ${NAV.map(([h, l]) => `<a href="${h}" class="${active === l ? 'active' : ''}">${l}</a>`).join('')}
        <a class="btn small" href="pedido.html">Búscame un coche</a>
        <a class="team-link" href="admin.html" title="Acceso para el equipo VCV">Entrar</a>
      </nav>
    </div>`;
  document.body.prepend(header);
  const btn = $('.menu-btn', header);
  btn.addEventListener('click', () => {
    const open = $('#nav').classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="wrap footer-grid">
      <div>
        <img src="logo-vcv.png" alt="VCV · Vip Cars Valencia" style="height:40px;width:auto;margin-bottom:12px">
        <p>Coches alemanes a la carta para toda España: Mercedes-Benz, Audi y BMW inspeccionados en Alemania, importados y entregados matriculados en tu ciudad.</p>
        <p class="dim">VCV actúa como intermediario entre comprador y vendedor. Las estimaciones de impuestos son orientativas; el presupuesto se cierra tras la inspección.</p>
      </div>
      <div>
        <b class="muted">Comprar</b>
        <a href="index.html#ofertas">Ofertas</a><a href="pedido.html">Pedido a la carta</a><a href="index.html#servicios">Servicios y tarifas</a><a href="index.html#faq">Preguntas frecuentes</a>
      </div>
      <div>
        <b class="muted">VCV</b>
        <a href="vendedores.html">Para concesionarios</a>
        ${CONFIG.email ? `<a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a>` : ''}
        <a href="legal.html#aviso">Aviso legal</a><a href="legal.html#privacidad">Privacidad</a><a href="legal.html#cookies">Cookies</a>
        <a href="admin.html" class="dim">Acceso equipo</a>
      </div>
    </div>`;
  document.body.append(footer);

  if (CONFIG.whatsapp) {
    const wa = document.createElement('a');
    wa.className = 'wa';
    wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola VCV, quiero información sobre un coche')}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    wa.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
    document.body.append(wa);
  }
}

// Tarjeta de oferta (hoja de inspección)
export function offerCard(o, settings, { alt = false } = {}) {
  const p = offerPrice(o, settings);
  const fresh = isOfferFresh(o, settings);
  return `<a class="car plate" href="oferta.html?o=${encodeURIComponent(o.slug)}">
    <div class="art">${o.images?.[0] ? `<img src="${esc(o.images[0])}" alt="${esc(o.make)} ${esc(o.model)}" loading="lazy">` : carArt(o, { label: 'ILUSTRACIÓN' })}
      <span class="tag">${alt ? '<span class="alt-badge">Alternativa similar</span>' : o.is_demo ? '<span class="demo-badge">DEMO</span>' : ''}</span>
      ${fresh ? `<span class="fresh">● Verificado ${daysAgoLabel(o.verified_at)}</span>` : ''}
    </div>
    <div class="body">
      <div class="make">${esc(o.make)} · ${esc(o.body_type || '')}</div>
      <h3>${esc(o.model)}</h3>
      <div class="version">${esc(o.version || '')}</div>
      <div class="specline"><span>${esc(o.year)}</span><span>${km(o.km)}</span><span>${esc(o.power_cv)} CV</span><span>${esc(o.fuel)}</span></div>
      <div class="price-block">
        <div>
          <div class="lbl">Precio final en España</div>
          <div class="total">${eur(p.total)}</div>
          <div class="es">${eur(p.es_price)} aquí</div>
        </div>
        ${p.savings > 0 ? `<span class="save">Ahorras ${eur(p.savings)}</span>` : ''}
      </div>
    </div>
  </a>`;
}

export function utm() {
  const u = new URLSearchParams(location.search);
  const out = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (u.get(k)) out[k] = u.get(k);
  return Object.keys(out).length ? out : null;
}
