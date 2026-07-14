// src/app/modules/diagnostico/diagnostico.component.ts
// Componente temporal para diagnosticar los problemas de Calendar y Resend
// ELIMINAR después de solucionar los problemas

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-diagnostico',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diag-page">
      <h1>🔍 Diagnóstico del Sistema</h1>

      <button class="btn-run" (click)="runAll()" [disabled]="loading()">
        {{ loading() ? '⏳ Analizando...' : '▶ Ejecutar diagnóstico completo' }}
      </button>

      @if (results().length > 0) {
        <div class="results">
          @for (r of results(); track r.titulo) {
            <div class="result-card" [class.ok]="r.ok" [class.fail]="!r.ok">
              <div class="result-header">
                <span class="result-icon">{{ r.ok ? '✅' : '❌' }}</span>
                <strong>{{ r.titulo }}</strong>
              </div>
              <pre class="result-detail">{{ r.detalle }}</pre>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .diag-page { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: monospace; }
    h1 { color: #1e293b; margin-bottom: 1.5rem; font-family: sans-serif; }
    .btn-run {
      padding: 0.75rem 2rem; background: #3b82f6; color: white;
      border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-bottom: 2rem;
    }
    .btn-run:disabled { opacity: 0.6; cursor: not-allowed; }
    .results { display: flex; flex-direction: column; gap: 1rem; }
    .result-card {
      border-radius: 8px; padding: 1rem; border: 2px solid;
    }
    .result-card.ok   { background: #f0fdf4; border-color: #86efac; }
    .result-card.fail { background: #fef2f2; border-color: #fca5a5; }
    .result-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-family: sans-serif; }
    .result-icon { font-size: 1.2rem; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 0.8rem; color: #374151; }
  `]
})
export class DiagnosticoComponent implements OnInit {
  loading = signal(false);
  results = signal<{ titulo: string; ok: boolean; detalle: string }[]>([]);

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {}

  async runAll() {
    this.loading.set(true);
    this.results.set([]);
    const res = [];

    // ── 1. Sesión de Supabase ──────────────────────────────────
    try {
      const { data } = await this.supabase.client.auth.getSession();
      const session = data?.session;
      if (session) {
        res.push({
          titulo: 'Sesión de Supabase',
          ok: true,
          detalle: `Usuario: ${session.user.email}
UUID: ${session.user.id}
Provider: ${session.user.app_metadata?.provider ?? 'desconocido'}
Identities: ${session.user.identities?.map((i: any) => i.provider).join(', ') ?? 'ninguna'}`
        });

        // ── 2. Provider Token (Google) ─────────────────────────
        const token = session.provider_token;
        res.push({
          titulo: 'Google provider_token',
          ok: !!token,
          detalle: token
            ? `✅ Token presente\nPrimeros 40 chars: ${token.substring(0, 40)}...`
            : `❌ Token AUSENTE\n\nCausa más probable: iniciaste sesión con email/password\no el prompt no fue 'consent'.\n\nProvider actual: ${session.user.app_metadata?.provider}`
        });

        // ── 3. Verificar token con Google Calendar API ─────────
        if (token) {
          try {
            const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const calData = await calRes.json();
            res.push({
              titulo: 'Google Calendar API',
              ok: calRes.ok,
              detalle: calRes.ok
                ? `✅ Conexión exitosa\nCalendario: ${calData.summary}\nZona horaria: ${calData.timeZone}`
                : `❌ Error ${calRes.status}: ${calData.error?.message ?? JSON.stringify(calData)}\n\nSi es 403: el scope calendar.events no fue autorizado.\nRevoca el acceso en myaccount.google.com/permissions y vuelve a iniciar sesión con Google.`
            });

            // ── 4. Intentar crear evento de prueba ─────────────
            if (calRes.ok) {
              const now    = new Date();
              const start  = new Date(now.getTime() + 60 * 60 * 1000); // en 1 hora
              const end    = new Date(start.getTime() + 30 * 60 * 1000);
              const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;

              const eventRes = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    summary: '🧪 CitasMed - Evento de prueba (puedes eliminarlo)',
                    description: 'Evento creado por el diagnóstico de CitasMed. Puedes eliminarlo.',
                    start: { dateTime: start.toISOString(), timeZone: tz },
                    end:   { dateTime: end.toISOString(),   timeZone: tz }
                  })
                }
              );
              const eventData = await eventRes.json();
              res.push({
                titulo: 'Crear evento de prueba en Calendar',
                ok: eventRes.ok,
                detalle: eventRes.ok
                  ? `✅ Evento creado exitosamente!\nID: ${eventData.id}\nLink: ${eventData.htmlLink}\n\n🎉 Google Calendar está funcionando correctamente.`
                  : `❌ Error ${eventRes.status}: ${eventData.error?.message ?? JSON.stringify(eventData)}`
              });

              // Limpiar — eliminar el evento de prueba
              if (eventRes.ok && eventData.id) {
                await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventData.id}`,
                  { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
                );
              }
            }
          } catch (err: any) {
            res.push({ titulo: 'Google Calendar API', ok: false, detalle: `Error de red: ${err.message}` });
          }
        }
      } else {
        res.push({ titulo: 'Sesión de Supabase', ok: false, detalle: '❌ No hay sesión activa. Inicia sesión primero.' });
      }
    } catch (err: any) {
      res.push({ titulo: 'Sesión de Supabase', ok: false, detalle: `Error: ${err.message}` });
    }

    // ── 5. Edge Function de Resend ─────────────────────────────
    try {
      const edgeUrl = `${environment.supabase.url}/functions/v1/send-appointment-email`;
      const res5 = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.supabase.anonKey}`
        },
        body: JSON.stringify({
          to:      'test@test.com',
          subject: 'Test',
          html:    '<p>Test</p>'
        })
      });
      const data5 = await res5.json();
      res.push({
        titulo: 'Edge Function Resend',
        ok: res5.status !== 403 && res5.status !== 404,
        detalle: res5.status === 404
          ? `❌ Edge Function NO desplegada (404)\n\nEjecuta en la terminal:\nsupabase functions deploy send-appointment-email --no-verify-jwt`
          : res5.status === 403
          ? `❌ Error de autorización (403)\n\nLa función existe pero rechaza la anonKey.\nVerifica que se desplegó con --no-verify-jwt`
          : `Status: ${res5.status}\nRespuesta: ${JSON.stringify(data5, null, 2)}`
      });
    } catch (err: any) {
      res.push({ titulo: 'Edge Function Resend', ok: false, detalle: `Error de red: ${err.message}` });
    }

    // ── 6. Variables de entorno ────────────────────────────────
    res.push({
      titulo: 'Variables de entorno',
      ok: !!environment.supabase.url && !!environment.supabase.anonKey,
      detalle: `Supabase URL: ${environment.supabase.url ? '✅ ' + environment.supabase.url : '❌ vacía'}
Anon Key: ${environment.supabase.anonKey ? '✅ presente (' + environment.supabase.anonKey.substring(0, 20) + '...)' : '❌ vacía'}`
    });

    this.results.set(res);
    this.loading.set(false);
  }
}