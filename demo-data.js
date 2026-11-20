// Datos DEMO para ver la web sin base de datos. No son coches reales.
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

export const DEMO_OFFERS = [
  { id: 'd1', slug: 'bmw-330e-touring-2022', make: 'BMW', model: 'Serie 3', version: '330e Touring M Sport', body_type: 'Familiar', year: 2022, first_registration: '2022-04-01', km: 41000, color: 'Gris', power_cv: 292, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 39, size_class: 'medio', price_de_eur: 38900, est_es_price_eur: 46500, location_de: 'Múnich', verified_at: daysAgo(1), equipment: ['Head-up display', 'Harman Kardon', 'Navegador Pro'] },
  { id: 'd2', slug: 'audi-q5-sportback-2021', make: 'Audi', model: 'Q5', version: 'Sportback 40 TDI quattro S line', body_type: 'SUV', year: 2021, first_registration: '2021-06-01', km: 58000, color: 'Negro', power_cv: 204, fuel: 'Diésel', gearbox: 'Automático', co2_wltp: 158, size_class: 'grande', price_de_eur: 41500, est_es_price_eur: 49900, location_de: 'Stuttgart', verified_at: daysAgo(2), equipment: ['Matrix LED', 'Virtual Cockpit', 'Techo panorámico'] },
  { id: 'd3', slug: 'mercedes-c300e-2023', make: 'Mercedes-Benz', model: 'Clase C', version: 'C 300 e AMG Line', body_type: 'Berlina', year: 2023, first_registration: '2023-02-01', km: 29000, color: 'Blanco', power_cv: 313, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 15, size_class: 'medio', price_de_eur: 46900, est_es_price_eur: 56500, location_de: 'Düsseldorf', verified_at: daysAgo(3), equipment: ['MBUX', 'Burmester', 'Cámara 360°'] },
  { id: 'd4', slug: 'bmw-x3-xdrive30e-2022', make: 'BMW', model: 'X3', version: 'xDrive30e M Sport', body_type: 'SUV', year: 2022, first_registration: '2022-09-01', km: 36000, color: 'Azul', power_cv: 292, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 49, size_class: 'grande', price_de_eur: 44900, est_es_price_eur: 53900, location_de: 'Hamburgo', verified_at: daysAgo(1), equipment: ['Laserlight', 'Asientos calefactados', 'Driving Assistant'] },
  { id: 'd5', slug: 'audi-a6-avant-2021', make: 'Audi', model: 'A6', version: 'Avant 50 TFSI e quattro', body_type: 'Familiar', year: 2021, first_registration: '2021-03-01', km: 64000, color: 'Gris', power_cv: 299, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 45, size_class: 'grande', price_de_eur: 39800, est_es_price_eur: 47500, location_de: 'Frankfurt', verified_at: daysAgo(4), equipment: ['Matrix LED', 'Bang & Olufsen', 'Suspensión adaptativa'] },
  { id: 'd6', slug: 'mercedes-glc-300de-2022', make: 'Mercedes-Benz', model: 'GLC', version: 'GLC 300 de 4MATIC AMG', body_type: 'SUV', year: 2022, first_registration: '2022-01-01', km: 47000, color: 'Plata', power_cv: 306, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 24, size_class: 'grande', price_de_eur: 52900, est_es_price_eur: 63500, location_de: 'Colonia', verified_at: daysAgo(2), equipment: ['Burmester', 'Head-up display', 'Airmatic'] },
  { id: 'd7', slug: 'bmw-i4-edrive40-2023', make: 'BMW', model: 'i4', version: 'eDrive40 M Sport', body_type: 'Coupé', year: 2023, first_registration: '2023-05-01', km: 22000, color: 'Blanco', power_cv: 340, fuel: 'Eléctrico', gearbox: 'Automático', co2_wltp: 0, size_class: 'medio', price_de_eur: 43900, est_es_price_eur: 52900, location_de: 'Berlín', verified_at: daysAgo(0), equipment: ['Curved Display', 'Harman Kardon', 'Bomba de calor'] },
  { id: 'd8', slug: 'audi-a3-sportback-2022', make: 'Audi', model: 'A3', version: 'Sportback 35 TFSI S line', body_type: 'Compacto', year: 2022, first_registration: '2022-07-01', km: 33000, color: 'Rojo', power_cv: 150, fuel: 'Gasolina', gearbox: 'Automático', co2_wltp: 131, size_class: 'compacto', price_de_eur: 27900, est_es_price_eur: 33900, location_de: 'Núremberg', verified_at: daysAgo(5), equipment: ['Virtual Cockpit Plus', 'LED', 'Asientos deportivos'] },
  { id: 'd9', slug: 'mercedes-e220d-2021', make: 'Mercedes-Benz', model: 'Clase E', version: 'E 220 d Avantgarde', body_type: 'Berlina', year: 2021, first_registration: '2021-10-01', km: 71000, color: 'Negro', power_cv: 194, fuel: 'Diésel', gearbox: 'Automático', co2_wltp: 129, size_class: 'grande', price_de_eur: 33900, est_es_price_eur: 41500, location_de: 'Hannover', verified_at: daysAgo(3), equipment: ['Widescreen', 'Multibeam LED', 'Distronic'] },
  { id: 'd10', slug: 'bmw-m340i-2021', make: 'BMW', model: 'Serie 3', version: 'M340i xDrive', body_type: 'Berlina', year: 2021, first_registration: '2021-05-01', km: 52000, color: 'Azul', power_cv: 374, fuel: 'Gasolina', gearbox: 'Automático', co2_wltp: 185, size_class: 'medio', price_de_eur: 47900, est_es_price_eur: 59900, location_de: 'Leipzig', verified_at: daysAgo(1), equipment: ['Diferencial M', 'Harman Kardon', 'Laserlight'] },
  { id: 'd11', slug: 'mercedes-cla-shooting-brake-2022', make: 'Mercedes-Benz', model: 'CLA', version: 'CLA 250 e Shooting Brake', body_type: 'Familiar', year: 2022, first_registration: '2022-11-01', km: 30000, color: 'Gris', power_cv: 218, fuel: 'Híbrido enchufable', gearbox: 'Automático', co2_wltp: 29, size_class: 'medio', price_de_eur: 33500, est_es_price_eur: 40500, location_de: 'Bremen', verified_at: daysAgo(2), equipment: ['MBUX', 'Night package', 'Cámara trasera'] },
  { id: 'd12', slug: 'audi-q4-etron-2023', make: 'Audi', model: 'Q4 e-tron', version: 'Q4 40 e-tron S line', body_type: 'SUV', year: 2023, first_registration: '2023-03-01', km: 26000, color: 'Plata', power_cv: 204, fuel: 'Eléctrico', gearbox: 'Automático', co2_wltp: 0, size_class: 'medio', price_de_eur: 37900, est_es_price_eur: 45900, location_de: 'Ingolstadt', verified_at: daysAgo(1), equipment: ['Head-up AR', 'Matrix LED', 'Bomba de calor'] },
].map((o) => ({ ...o, status: 'published', mode: 'intermediacion', is_demo: true, images: [] }));

export const DEMO_ZONES = [
  { city: 'Barcelona', zone: 1, km: 1350 }, { city: 'Girona', zone: 1, km: 1250 }, { city: 'Zaragoza', zone: 1, km: 1600 },
  { city: 'Bilbao', zone: 1, km: 1550 }, { city: 'Valencia', zone: 2, km: 1750 }, { city: 'Castellón', zone: 2, km: 1680 },
  { city: 'Madrid', zone: 2, km: 1850 }, { city: 'Alicante', zone: 2, km: 1900 }, { city: 'Murcia', zone: 3, km: 2000 },
  { city: 'Sevilla', zone: 3, km: 2350 }, { city: 'Málaga', zone: 3, km: 2300 }, { city: 'A Coruña', zone: 3, km: 2150 },
];

export const DEMO_PROPOSALS = [
  { id: 'p1', make: 'BMW', model: 'Serie 3', version: '320d Touring Luxury', year: 2021, km: 54000, fuel: 'Diésel', power_cv: 190, color: 'Gris', price_de_eur: 29900, source_url: '#', notes: 'Un dueño, libro de servicio BMW completo.', size_class: 'medio' },
  { id: 'p2', make: 'BMW', model: 'Serie 3', version: '330e Berlina Sport', year: 2021, km: 61000, fuel: 'Híbrido enchufable', power_cv: 292, color: 'Negro', price_de_eur: 31500, source_url: '#', notes: 'Concesionario oficial, garantía hasta 2027.', size_class: 'medio' },
  { id: 'p3', make: 'BMW', model: 'Serie 3', version: '320i M Sport', year: 2022, km: 39000, fuel: 'Gasolina', power_cv: 184, color: 'Blanco', price_de_eur: 32900, source_url: '#', notes: 'Paquete M, techo solar.', size_class: 'medio' },
  { id: 'p4', make: 'BMW', model: 'Serie 3', version: '318d Touring Advantage', year: 2020, km: 78000, fuel: 'Diésel', power_cv: 150, color: 'Azul', price_de_eur: 22900, source_url: '#', notes: 'La más económica; revisar embrague.', size_class: 'medio' },
  { id: 'p5', make: 'BMW', model: 'Serie 3', version: '330i xDrive M Sport', year: 2021, km: 47000, fuel: 'Gasolina', power_cv: 245, color: 'Gris', price_de_eur: 34500, source_url: '#', notes: 'Tracción total, Harman Kardon.', size_class: 'medio' },
];

export const CATALOG = {
  'Mercedes-Benz': ['Clase A', 'Clase C', 'Clase E', 'CLA', 'GLA', 'GLC', 'GLE', 'EQA', 'EQE'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'Q4 e-tron', 'e-tron GT'],
  BMW: ['Serie 1', 'Serie 3', 'Serie 4', 'Serie 5', 'X1', 'X3', 'X5', 'i4', 'iX'],
};
export const BODY_TYPES = ['Berlina', 'SUV', 'Familiar', 'Coupé', 'Compacto', 'Cabrio'];
export const FUELS = ['Gasolina', 'Diésel', 'Híbrido', 'Híbrido enchufable', 'Eléctrico'];
export const COLORS = [
  { name: 'Negro', hex: '#121315' }, { name: 'Blanco', hex: '#E9E7E2' }, { name: 'Gris', hex: '#6B7076' },
  { name: 'Plata', hex: '#B5B9BE' }, { name: 'Azul', hex: '#2D4E7A' }, { name: 'Rojo', hex: '#8E2A22' },
  { name: 'Verde', hex: '#3D5A45' }, { name: 'Otro', hex: '#9A7B5F' },
];
