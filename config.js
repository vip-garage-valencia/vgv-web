// Configuración pública de la web. Rellenar al conectar Supabase.
// Si supabaseUrl está vacío, la web funciona en MODO DEMO con coches de prueba.
export const CONFIG = {
  supabaseUrl: 'https://yxhfydvjpugylsbqptph.supabase.co',
  supabaseAnonKey: 'sb_publishable_SGxe5-5dKpk8ExtvvuZUtQ_iuH6jKic', // clave pública. Nunca la secret/service_role.
  whatsapp: '34614611480',             // número con prefijo, sin + ni espacios: '34600111222'
  email: '',                // email de contacto visible
  turnstileSiteKey: '',     // opcional: Cloudflare Turnstile anti-spam
};
