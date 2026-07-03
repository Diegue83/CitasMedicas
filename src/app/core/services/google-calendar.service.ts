// src/app/core/services/google-calendar.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  GoogleCalendarEvent,
  GoogleCalendarEventResponse,
  Cita,
  Paciente
} from '../models';

/**
 * Servicio para integrar Google Calendar API v3.
 *
 * Cómo funciona la autenticación:
 * Cuando el doctor inicia sesión con Google vía Supabase OAuth,
 * Supabase almacena el `provider_token` (access token de Google)
 * en la sesión activa. Este token es el que usamos para llamar
 * directamente a la API REST de Google Calendar sin necesidad
 * de ninguna biblioteca adicional.
 *
 * Limitación importante:
 * El `provider_token` expira en ~1 hora. Para sesiones largas,
 * Supabase renueva el token de Supabase automáticamente, pero
 * el provider_token de Google no se renueva igual. Si el doctor
 * usa la app por más de 1 hora sin recargar, puede necesitar
 * volver a iniciar sesión con Google para que Calendar funcione.
 * Esto es una limitación del OAuth de Google con Supabase.
 */

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_ID  = 'primary'; // El calendario principal del doctor

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {

  constructor(private supabase: SupabaseService) {}

  // ─── Token ──────────────────────────────────────────────────

  /**
   * Obtiene el access token de Google desde la sesión de Supabase.
   * Solo existe si el doctor inició sesión con el botón de Google.
   * Si inició sesión con email/password, este token es null.
   */
  private async getGoogleToken(): Promise<string | null> {
    const { data } = await this.supabase.client.auth.getSession();
    const token = data?.session?.provider_token ?? null;
    return token;
  }

  /**
   * Verifica si el doctor tiene un token de Google disponible.
   * Usar esto antes de mostrar funcionalidades de Calendar en la UI.
   */
  async isGoogleConnected(): Promise<boolean> {
    const token = await this.getGoogleToken();
    return token !== null;
  }

  // ─── Operaciones CRUD en Calendar ───────────────────────────

  /**
   * Crea un evento en Google Calendar para una cita médica.
   * Retorna el ID del evento creado, o null si falla.
   */
  async crearEvento(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>,
    paciente: Paciente
  ): Promise<string | null> {
    const token = await this.getGoogleToken();
    if (!token) {
      console.warn('[GoogleCalendar] Sin token de Google. El doctor inició sesión con email/password.');
      return null;
    }

    try {
      const evento = this.buildCalendarEvent(cita, paciente);
      const response = await fetch(
        `${CALENDAR_API}/calendars/${CALENDAR_ID}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(evento)
        }
      );

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('[GoogleCalendar] Error al crear evento:', errorBody);
        // No lanzamos error para no bloquear el guardado de la cita
        return null;
      }

      const data: GoogleCalendarEventResponse = await response.json();
      console.log('[GoogleCalendar] Evento creado:', data.htmlLink);
      return data.id;

    } catch (err) {
      console.error('[GoogleCalendar] Error de red al crear evento:', err);
      return null;
    }
  }

  /**
   * Elimina un evento de Google Calendar cuando se cancela una cita.
   * Si el evento no existe o ya fue eliminado, lo ignora silenciosamente.
   */
  async eliminarEvento(calendarEventId: string): Promise<void> {
    const token = await this.getGoogleToken();
    if (!token) {
      console.warn('[GoogleCalendar] Sin token de Google para eliminar evento.');
      return;
    }

    try {
      const response = await fetch(
        `${CALENDAR_API}/calendars/${CALENDAR_ID}/events/${calendarEventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // 204 = eliminado, 404 = ya no existía. Ambos son aceptables.
      if (!response.ok && response.status !== 404) {
        const errorBody = await response.text();
        console.error('[GoogleCalendar] Error al eliminar evento:', errorBody);
      } else {
        console.log('[GoogleCalendar] Evento eliminado:', calendarEventId);
      }
    } catch (err) {
      console.error('[GoogleCalendar] Error de red al eliminar evento:', err);
    }
  }

  /**
   * Actualiza un evento existente en Google Calendar.
   * Útil si en el futuro se permite editar fecha/hora de una cita.
   */
  async actualizarEvento(
    calendarEventId: string,
    cita: Partial<Cita>,
    paciente: Paciente
  ): Promise<boolean> {
    const token = await this.getGoogleToken();
    if (!token) return false;

    try {
      const evento = this.buildCalendarEvent(cita as any, paciente);
      const response = await fetch(
        `${CALENDAR_API}/calendars/${CALENDAR_ID}/events/${calendarEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(evento)
        }
      );

      if (!response.ok) {
        console.error('[GoogleCalendar] Error al actualizar evento:', await response.json());
        return false;
      }

      return true;
    } catch (err) {
      console.error('[GoogleCalendar] Error de red al actualizar evento:', err);
      return false;
    }
  }

  // ─── Builder ─────────────────────────────────────────────────

  /**
   * Construye el objeto de evento para la API de Google Calendar.
   * Usa la zona horaria local del navegador para que la hora
   * aparezca correcta en el calendario del doctor.
   */
  private buildCalendarEvent(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>,
    paciente: Paciente
  ): GoogleCalendarEvent {
    // Zona horaria local del navegador (ej: 'America/Mexico_City')
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Construir DateTime de inicio: 'YYYY-MM-DDTHH:MM:00'
    const startDateTime = `${cita.fecha}T${cita.hora_inicio}:00`;

    // Calcular hora de fin sumando la duración en minutos
    const [h, m] = cita.hora_inicio.split(':').map(Number);
    const totalMin = h * 60 + m + cita.duracion;
    const endH = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const endM = (totalMin % 60).toString().padStart(2, '0');
    const endDateTime = `${cita.fecha}T${endH}:${endM}:00`;

    // Descripción del evento
    const descripcion = [
      `📋 Cita médica`,
      `👤 Paciente: ${paciente.nombre}`,
      `📞 Teléfono: ${paciente.telefono}`,
      paciente.correo ? `✉️ Correo: ${paciente.correo}` : '',
      cita.notas ? `📝 Notas: ${cita.notas}` : ''
    ].filter(Boolean).join('\n');

    return {
      summary: `🏥 Cita — ${paciente.nombre}`,
      description: descripcion,
      start: { dateTime: startDateTime, timeZone },
      end:   { dateTime: endDateTime,   timeZone },
      colorId: '11'  // Tomate (rojo), color estándar para citas médicas en Google Calendar
    };
  }
}