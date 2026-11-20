// Filtros del buscador <-> URL (para compartir búsquedas y precargar el pedido).
export const DEFAULT_FILTERS = {
  body_types: [], makes: [], model: '', year_min: '', year_max: '', km_max: 200000,
  colors: [], cv_min: '', cv_max: '', fuels: [], gearboxes: [], price_min: 10000, price_max: 150000, sort: 'savings',
};
const LISTS = ['body_types', 'makes', 'colors', 'fuels', 'gearboxes'];
const NUMS = ['year_min', 'year_max', 'km_max', 'cv_min', 'cv_max', 'price_min', 'price_max'];

export function filtersToQuery(f) {
  const u = new URLSearchParams();
  for (const k of LISTS) if (f[k]?.length) u.set(k, f[k].join(','));
  for (const k of NUMS) if (f[k] !== '' && f[k] !== undefined && f[k] !== DEFAULT_FILTERS[k]) u.set(k, f[k]);
  if (f.model) u.set('model', f.model);
  if (f.sort && f.sort !== DEFAULT_FILTERS.sort) u.set('sort', f.sort);
  return u.toString();
}

export function queryToFilters(search) {
  const u = new URLSearchParams(search);
  const f = {};
  for (const k of LISTS) if (u.get(k)) f[k] = u.get(k).split(',').filter(Boolean);
  for (const k of NUMS) if (u.get(k) && !Number.isNaN(Number(u.get(k)))) f[k] = Number(u.get(k));
  if (u.get('model')) f.model = u.get('model');
  if (u.get('sort')) f.sort = u.get('sort');
  return f;
}
