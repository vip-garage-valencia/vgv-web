// Capa de datos: Supabase (REST + Edge Function) o MODO DEMO si no hay configuración.
import { CONFIG } from './config.js';
import { DEFAULT_SETTINGS, mergeSettings } from './pricing.js';
import { DEMO_OFFERS, DEMO_ZONES, DEMO_PROPOSALS } from './demo-data.js';

export const IS_DEMO = !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey;

export const OFFER_COLUMNS = 'id,slug,status,is_demo,mode,make,model,version,body_type,year,first_registration,km,color,power_cv,fuel,gearbox,co2_wltp,size_class,price_de_eur,est_es_price_eur,markup_pct,price_vcv_eur,est_savings_eur,equipment,images,location_de,verified_at';

const headers = () => ({
  apikey: CONFIG.supabaseAnonKey,
  Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
  'Content-Type': 'application/json',
});

async function rest(path) {
  const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`Error ${r.status} al cargar datos`);
  return r.json();
}

async function fn(payload) {
  const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/submit-lead`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

// --- almacenamiento local seguro (solo modo demo) ---
const mem = {};
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return mem[k] ?? null; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

let settingsCache;
export async function getSettings() {
  if (settingsCache) return settingsCache;
  if (IS_DEMO) return (settingsCache = DEFAULT_SETTINGS);
  try {
    const rows = await rest('settings?select=key,value&key=eq.pricing');
    settingsCache = mergeSettings(rows[0]?.value || {});
  } catch { settingsCache = DEFAULT_SETTINGS; }
  return settingsCache;
}

export async function listOffers() {
  if (IS_DEMO) return DEMO_OFFERS;
  return rest(`offers?select=${OFFER_COLUMNS}&status=eq.publicada&order=verified_at.desc&limit=200`);
}

export async function getOffer(slug) {
  if (IS_DEMO) return DEMO_OFFERS.find((o) => o.slug === slug) || null;
  const rows = await rest(`offers?select=${OFFER_COLUMNS}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] || null;
}

export async function listZones() {
  if (IS_DEMO) return DEMO_ZONES;
  try { return await rest('delivery_zones?select=city,zone,km&order=city'); } catch { return DEMO_ZONES; }
}

function demoCode() {
  const n = (store.get('vcv_demo_seq') || 41) + 1;
  store.set('vcv_demo_seq', n);
  return `VCV-${String(n).padStart(4, '0')}`;
}

export async function submit(action, payload) {
  if (!IS_DEMO) return fn({ action, ...payload });
  await new Promise((r) => setTimeout(r, 450));
  if (action === 'vendedor') return { ok: true };
  const code = demoCode();
  const token = `demo-${Math.random().toString(36).slice(2, 10)}`;
  const offer = action === 'reserva' ? DEMO_OFFERS.find((o) => o.slug === payload.offer_slug) : null;
  const req = {
    code, kind: action, status: action === 'pedido' ? 'propuestas_enviadas' : 'nuevo',
    filters: payload.filters || {}, price_min: payload.price_min, price_max: payload.price_max,
    first_name: (payload.name || '').split(' ')[0], delivery_city: payload.delivery_city,
    services_interest: payload.services_interest || [], created_at: new Date().toISOString(), offer,
  };
  const all = store.get('vcv_demo_requests') || {};
  all[token] = req;
  store.set('vcv_demo_requests', all);
  return { ok: true, code, token };
}

export async function getRequest(token) {
  if (!IS_DEMO) return fn({ action: 'get_request', token });
  const all = store.get('vcv_demo_requests') || {};
  const req = all[token] || {
    code: 'VCV-0042', kind: 'pedido', status: 'propuestas_enviadas', first_name: 'Cliente',
    filters: { makes: ['BMW'], model: 'Serie 3', year_min: 2020, km_max: 80000, fuels: [] },
    price_min: 22000, price_max: 36000, delivery_city: 'Valencia', created_at: new Date().toISOString(),
  };
  const now = Date.now();
  const events = [{ status: 'nuevo', created_at: new Date(now - 2 * 86400000).toISOString() }];
  if (req.status === 'propuestas_enviadas') events.push({ status: 'propuestas_enviadas', created_at: new Date(now).toISOString() });
  return {
    request: req,
    proposals: req.kind === 'pedido' ? DEMO_PROPOSALS : [],
    events,
    offer: req.offer || null,
  };
}

export async function confirmChoice(payload) {
  if (!IS_DEMO) return fn({ action: 'confirm', ...payload });
  await new Promise((r) => setTimeout(r, 400));
  const all = store.get('vcv_demo_requests') || {};
  if (all[payload.token]) { all[payload.token].status = 'elegido'; store.set('vcv_demo_requests', all); }
  return { ok: true };
}
