// src/environments/environment.ts
// Reemplaza los valores con los de tu proyecto de Supabase
// Settings -> API -> Project URL y anon/public key

/*export const environment = {
  production: false,
  supabase: {
    url: 'https://afklfuovpizdfcctppgy.supabase.co',
    anonKey: 'sb_publishable_6EgHSjupuLLMU9w3mg3Czw_1ppUs4sR'
  }
};*/

// src/environments/environment.ts
export const environment = {
  production: false,
  supabase: {
    url:     'https://afklfuovpizdfcctppgy.supabase.co',
    anonKey: 'sb_publishable_6EgHSjupuLLMU9w3mg3Czw_1ppUs4sR'
  },
  // Resend — obtén tu API key en resend.com → API Keys
  resendApiKey: 're_6QMrzwiS_3ChCpMkVNhrai43qB3LsBwaH',  
  // Durante desarrollo usa el dominio sandbox de Resend.
  // Solo envía correos a la dirección de tu cuenta de Resend.
  // Para enviar a cualquier correo verifica tu dominio en resend.com
  resendFrom: 'CitasMed <onboarding@resend.dev>'
};