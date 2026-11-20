// VCV · lógica de precios. Funciones puras: se usan en la web, en el admin y en los tests.
// Todos los importes en euros. Los valores por defecto se pueden sobrescribir desde la tabla settings.

export const DEFAULT_SETTINGS = {
  // Impuesto de matriculación (IEDMT), tipos estatales península. Configurable por comunidad.
  iedmt_brackets: [
    { max_co2: 120, rate: 0 },
    { max_co2: 159, rate: 0.0475 },
    { max_co2: 199, rate: 0.0975 },
    { max_co2: 9999, rate: 0.1475 },
  ],
  fees: { itv: 150, dgt: 100, placas: 40, otros: 10 }, // ~300 €
  vat_es: 0.21,
  // Traslado
  truck_price: { compacto: 1500, medio: 1750, grande: 2000 }, // precio al cliente (servicio suelto)
  truck_cost: { compacto: 600, medio: 750, grande: 950 },      // coste interno VCV (solo admin)
  rodando_pct: { 1: 0.05, 2: 0.06, 3: 0.07 },                 // por zona de distancia
  rodando_min: 500,
  rodando_below_truck: 300,                                    // rodando siempre <= camión - 300
  // Ofertas con sobreprecio
  markup_share: 0.375,      // VCV se queda ~35-40% de la diferencia con España
  markup_min_pct: 0.03,
  markup_max_pct: 0.07,
  markup_min_eur: 1200,
  min_savings_eur: 2000,    // publicar solo si el cliente ahorra >= 2.000 € ...
  min_savings_pct: 0.05,    // ... o >= 5%
  es_price_factor: 0.15,    // si no hay precio comparable en España, se estima +15%
  offer_valid_days: 7,
  // Servicios sueltos (pedido a la carta)
  services: {
    inspeccion_diagnostico: { label: 'Diagnóstico 200 puntos + informe', price: 190, group: 'inspeccion' },
    inspeccion_manejo: { label: 'Diagnóstico + prueba de manejo', price: 290, group: 'inspeccion' },
    inspeccion_completa: { label: 'Completo: + historial y mantenimiento', price: 390, group: 'inspeccion' },
    gestion: { label: 'Gestión de importación y matrícula', price: 690, price_high: 890, high_from: 30000, group: 'gestion' },
  },
};

export function mergeSettings(overrides = {}) {
  const s = structuredClone(DEFAULT_SETTINGS);
  for (const [k, v] of Object.entries(overrides || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      s[k] = { ...s[k], ...v };
    } else if (v !== undefined && v !== null) {
      s[k] = v;
    }
  }
  return s;
}

const round = (n) => Math.round(n);
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);

export function iedmtRate(co2, s = DEFAULT_SETTINGS) {
  if (co2 === null || co2 === undefined || Number.isNaN(Number(co2))) return s.iedmt_brackets.at(-1).rate;
  const b = s.iedmt_brackets.find((x) => Number(co2) <= x.max_co2);
  return b ? b.rate : s.iedmt_brackets.at(-1).rate;
}

// ¿Es fiscalmente "nuevo"? (<6 meses desde la 1ª matriculación o <6.000 km) → paga IVA español.
export function isFiscallyNew({ first_registration, km }, today = new Date()) {
  if (km !== undefined && km !== null && Number(km) < 6000) return true;
  if (!first_registration) return false;
  const reg = new Date(first_registration);
  const sixMonths = new Date(reg);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return today < sixMonths;
}

export function fixedFees(s = DEFAULT_SETTINGS) {
  return Object.values(s.fees).reduce((a, b) => a + Number(b || 0), 0);
}

// Impuestos estimados en España. La base real del IEDMT son las tablas de Hacienda;
// aquí se aproxima con el precio del coche y se muestra como estimación.
export function estimateTaxes(car, s = DEFAULT_SETTINGS, today = new Date()) {
  const price = Number(car.price_de_eur);
  const rate = iedmtRate(car.co2_wltp, s);
  const iedmt = round(price * rate);
  const iva = isFiscallyNew(car, today) ? round(price * s.vat_es) : 0;
  return { iedmt_rate: rate, iedmt, iva };
}

export function estimatedSpainPrice(car, s = DEFAULT_SETTINGS) {
  if (car.est_es_price_eur) return Number(car.est_es_price_eur);
  return round(Number(car.price_de_eur) * (1 + s.es_price_factor));
}

// Oferta: precio VCV todo incluido. Inspección y gestión incluidas; camión a coste.
export function offerPrice(car, s = DEFAULT_SETTINGS, today = new Date()) {
  const seller = Number(car.price_de_eur);
  const size = car.size_class || 'medio';
  const transport = Number(s.truck_cost[size] ?? s.truck_cost.medio);
  const fees = fixedFees(s);
  const { iedmt, iedmt_rate, iva } = estimateTaxes(car, s, today);
  const esPrice = estimatedSpainPrice(car, s);
  const landed = seller + transport + fees + iedmt + iva;
  const gap = esPrice - landed;

  let markup;
  let markupPct;
  if (car.markup_pct !== undefined && car.markup_pct !== null && car.markup_pct !== '') {
    markupPct = Number(car.markup_pct);
    markup = round(seller * markupPct);
  } else {
    const wanted = gap * s.markup_share;
    const lo = Math.max(seller * s.markup_min_pct, s.markup_min_eur);
    const hi = Math.max(seller * s.markup_max_pct, lo);
    markup = round(clamp(wanted, lo, hi));
    markupPct = markup / seller;
  }

  const total = round(landed + markup);
  const savings = round(esPrice - total);
  const savingsPct = esPrice > 0 ? savings / esPrice : 0;
  const publishable = savings >= s.min_savings_eur || savingsPct >= s.min_savings_pct;
  return {
    seller, markup, markup_pct: markupPct, transport, fees, iedmt, iedmt_rate, iva,
    total, es_price: esPrice, savings, savings_pct: savingsPct, publishable,
    block_reason: publishable ? null
      : `El cliente ahorraría ${savings} € (${(savingsPct * 100).toFixed(1)}%). Mínimo: ${s.min_savings_eur} € o ${(s.min_savings_pct * 100).toFixed(0)}%.`,
  };
}

// Traslado como servicio suelto (pedido a la carta).
export function transportQuote(carPrice, size = 'medio', zone = 2, s = DEFAULT_SETTINGS) {
  const truck = Number(s.truck_price[size] ?? s.truck_price.medio);
  const pct = Number(s.rodando_pct[zone] ?? s.rodando_pct[2]);
  let rodando = Math.max(s.rodando_min, round(Number(carPrice || 0) * pct));
  rodando = Math.min(rodando, truck - s.rodando_below_truck);
  rodando = Math.max(rodando, s.rodando_min);
  return { truck, rodando, rodando_pct: pct };
}

export function gestionPrice(carPrice, s = DEFAULT_SETTINGS) {
  const g = s.services.gestion;
  return Number(carPrice) > g.high_from ? g.price_high : g.price;
}

// Total de servicios elegidos en "Mi pedido".
// sel = { inspeccion: 'inspeccion_manejo' | null, gestion: bool, traslado: 'camion' | 'rodando' | null }
export function servicesTotal(sel, carPrice, size, zone, s = DEFAULT_SETTINGS) {
  const lines = [];
  if (sel.inspeccion && s.services[sel.inspeccion]) {
    const sv = s.services[sel.inspeccion];
    lines.push({ key: sel.inspeccion, label: sv.label, price: sv.price });
  }
  if (sel.gestion) lines.push({ key: 'gestion', label: s.services.gestion.label, price: gestionPrice(carPrice, s) });
  if (sel.traslado) {
    const q = transportQuote(carPrice, size, zone, s);
    lines.push(sel.traslado === 'camion'
      ? { key: 'traslado_camion', label: 'Traslado en camión', price: q.truck }
      : { key: 'traslado_rodando', label: 'Traslado conducido', price: q.rodando });
  }
  return { lines, total: lines.reduce((a, l) => a + l.price, 0) };
}

export function isOfferFresh(offer, s = DEFAULT_SETTINGS, now = new Date()) {
  if (!offer.verified_at) return false;
  const age = (now - new Date(offer.verified_at)) / 86400000;
  return age <= s.offer_valid_days;
}

const NF = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 });
export const num = (n) => NF.format(Math.round(Number(n) || 0));
export const eur = (n) => `${num(n)} €`;
