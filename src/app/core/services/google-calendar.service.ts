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

    const provider = session.user?.app_metadata?.provider;
    if (provider !== 'google') {
      return {
        conectado: false,
        motivo: 'Iniciaste sesión con correo y contraseña. Para sincronizar con Google Calendar debes iniciar sesión con el botón de Google.'
      };
    }

    const token = session.provider_token;
    if (!token) {
      return {
        conectado: false,
        motivo: 'El token de Google expiró. Por favor cierra sesión y vuelve a entrar con Google.'
      };
    }

    // Verificar que el token funcione realmente
    try {
      const res = await fetch(`${CALENDAR_API}/calendars/${CALENDAR_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        return {
          conectado: false,
          motivo: res.status === 401
            ? 'El token de Google expiró. Cierra sesión y vuelve a entrar con Google.'
            : `Error al conectar con Google Calendar (${res.status}).`
        };
      }
    } catch {
      return { conectado: false, motivo: 'No se pudo conectar con Google Calendar. Verifica tu conexión.' };
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

    const startDateTime = `${cita.fecha}T${cita.hora_inicio}:00`;
    const [h, m]        = cita.hora_inicio.split(':').map(Number);
    const totalMin      = h * 60 + m + cita.duracion;
    const endH          = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const endM          = (totalMin % 60).toString().padStart(2, '0');
    const endDateTime   = `${cita.fecha}T${endH}:${endM}:00`;

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