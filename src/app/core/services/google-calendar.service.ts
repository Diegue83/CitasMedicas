// src/app/core/services/google-calendar.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { GoogleCalendarEvent, GoogleCalendarEventResponse, Cita, Paciente } from '../models';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_ID  = 'primary';

export interface GoogleStatus {
  conectado: boolean;
  motivo?: string;  // Por qué no está conectado
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {

  constructor(private supabase: SupabaseService) {}

  // ─── Diagnóstico detallado ───────────────────────────────────

  /**
   * Devuelve el estado detallado de la conexión con Google.
   * Úsalo para mostrar mensajes claros al doctor.
   */
  async getStatus(): Promise<GoogleStatus> {
    const { data } = await this.supabase.client.auth.getSession();
    const session  = data?.session;

    if (!session) {
      return { conectado: false, motivo: 'No hay sesión activa.' };
    }

    // Supabase guarda el provider en distintos lugares según la versión del SDK.
    // Revisamos todos para mayor compatibilidad.
    const user            = session.user;
    const appProvider     = user?.app_metadata?.provider as string | undefined;
    const identities      = user?.identities ?? [];
    const hasGoogleId     = identities.some((i: any) => i.provider === 'google');
    const isGoogle        = appProvider === 'google' || hasGoogleId;

    // Debug — imprime en consola para ayudar a diagnosticar
    console.log('[GoogleCalendar] provider:', appProvider);
    console.log('[GoogleCalendar] identities:', identities.map((i: any) => i.provider));
    console.log('[GoogleCalendar] provider_token:', session.provider_token ? '✅ presente' : '❌ ausente');

    if (!isGoogle) {
      return {
        conectado: false,
        motivo: 'Iniciaste sesión con correo y contraseña. Para sincronizar con Google Calendar debes iniciar sesión con el botón de Google.'
      };
    }

    const token = session.provider_token;
    if (!token) {
      // Entró con Google pero no hay token — esto pasa cuando:
      // 1. El token expiró (~1 hora después del login)
      // 2. Supabase no incluyó el scope de Calendar en el redirect
      return {
        conectado: false,
        motivo: 'Token de Google no disponible. Cierra sesión y vuelve a entrar con el botón de Google para renovarlo.'
      };
    }

    // Verificar que el token funcione haciendo una llamada real
    try {
      const res = await fetch(`${CALENDAR_API}/calendars/${CALENDAR_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.warn('[GoogleCalendar] Token inválido, status:', res.status);
        return {
          conectado: false,
          motivo: res.status === 401
            ? 'Token de Google expirado. Cierra sesión y vuelve a entrar con Google.'
            : `Error al conectar con Google Calendar (${res.status}).`
        };
      }
    } catch {
      return {
        conectado: false,
        motivo: 'No se pudo verificar la conexión con Google Calendar. Revisa tu conexión a internet.'
      };
    }

    return { conectado: true };
  }

  async isGoogleConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status.conectado;
  }

  private async getToken(): Promise<string | null> {
    const { data } = await this.supabase.client.auth.getSession();
    return data?.session?.provider_token ?? null;
  }

  // ─── Crear evento ────────────────────────────────────────────

  async crearEvento(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>,
    paciente: Paciente
  ): Promise<{ eventId: string | null; error: string | null }> {
    const status = await this.getStatus();
    if (!status.conectado) {
      return { eventId: null, error: status.motivo! };
    }

    const token = await this.getToken();
    if (!token) return { eventId: null, error: 'Sin token de Google.' };

    try {
      const evento   = this.buildCalendarEvent(cita, paciente);
      const response = await fetch(
        `${CALENDAR_API}/calendars/${CALENDAR_ID}/events`,
        {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json'
          },
          body: JSON.stringify(evento)
        }
      );

      if (!response.ok) {
        const err = await response.json();
        console.error('[GoogleCalendar] Error crear evento:', err);
        return { eventId: null, error: `Error Google Calendar: ${err?.error?.message ?? response.status}` };
      }

      const data: GoogleCalendarEventResponse = await response.json();
      console.log('[GoogleCalendar] ✅ Evento creado:', data.htmlLink);
      return { eventId: data.id, error: null };

    } catch (err: any) {
      return { eventId: null, error: `Error de red: ${err.message}` };
    }
  }

  // ─── Eliminar evento ─────────────────────────────────────────

  async eliminarEvento(calendarEventId: string): Promise<void> {
    const token = await this.getToken();
    if (!token) return;

    try {
      await fetch(
        `${CALENDAR_API}/calendars/${CALENDAR_ID}/events/${calendarEventId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn('[GoogleCalendar] No se pudo eliminar evento:', err);
    }
  }

  // ─── Builder ─────────────────────────────────────────────────

  private buildCalendarEvent(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>,
    paciente: Paciente
  ): GoogleCalendarEvent {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Construir fecha+hora como objeto Date local para obtener
    // el offset correcto de zona horaria
    const [year, month, day] = cita.fecha.split('-').map(Number);
    const [h, m]             = cita.hora_inicio.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, h, m, 0);
    const endDate   = new Date(startDate.getTime() + cita.duracion * 60 * 1000);

    // toISOString() con ajuste de zona horaria local
    const toLocalISO = (date: Date): string => {
      const offset  = -date.getTimezoneOffset();
      const sign    = offset >= 0 ? '+' : '-';
      const absOff  = Math.abs(offset);
      const offH    = Math.floor(absOff / 60).toString().padStart(2, '0');
      const offM    = (absOff % 60).toString().padStart(2, '0');
      const y       = date.getFullYear();
      const mo      = (date.getMonth() + 1).toString().padStart(2, '0');
      const d       = date.getDate().toString().padStart(2, '0');
      const hr      = date.getHours().toString().padStart(2, '0');
      const min     = date.getMinutes().toString().padStart(2, '0');
      const sec     = date.getSeconds().toString().padStart(2, '0');
      return `${y}-${mo}-${d}T${hr}:${min}:${sec}${sign}${offH}:${offM}`;
    };

    const startDateTime = toLocalISO(startDate);
    const endDateTime   = toLocalISO(endDate);

    console.log('[GoogleCalendar] Evento:', { startDateTime, endDateTime, timeZone });

    const descripcion = [
      '📋 Cita médica confirmada',
      `👤 Paciente: ${paciente.nombre}`,
      `📞 Teléfono: ${paciente.telefono}`,
      paciente.correo ? `✉️ Correo: ${paciente.correo}` : '',
      cita.notas      ? `📝 Notas: ${cita.notas}`       : ''
    ].filter(Boolean).join('\n');

    return {
      summary:     `🏥 Cita — ${paciente.nombre}`,
      description: descripcion,
      start:       { dateTime: startDateTime, timeZone },
      end:         { dateTime: endDateTime,   timeZone },
      colorId:     '11'
    };
  }
}