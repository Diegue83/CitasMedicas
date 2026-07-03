// src/app/core/services/resend.service.ts
import { Injectable } from '@angular/core';
import { Cita, Paciente } from '../models';

/**
 * Servicio para enviar correos transaccionales usando Resend API.
 *
 * IMPORTANTE: La API key de Resend NUNCA debe ir en el frontend —
 * cualquier usuario podría inspeccionarla en el navegador.
 *
 * Arquitectura utilizada:
 * Angular → Supabase Edge Function → Resend API
 *
 * La Edge Function actúa como proxy seguro: recibe la solicitud
 * de tu app, agrega la API key del servidor (guardada como secret
 * en Supabase) y llama a Resend.
 *
 * Setup de la Edge Function (hacer UNA SOLA VEZ):
 * 1. Instalar Supabase CLI: npm install -g supabase
 * 2. supabase login
 * 3. supabase functions new send-appointment-email
 * 4. Copiar el código de la función (archivo edge-function.ts adjunto)
 * 5. supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
 * 6. supabase functions deploy send-appointment-email
 */

const EDGE_FUNCTION_URL = 'send-appointment-email'; // nombre de la función

@Injectable({ providedIn: 'root' })
export class ResendService {

  private supabaseUrl = '';
  private supabaseAnonKey = '';

  constructor() {
    // Se inicializa desde environment en el primer uso
  }

  private initConfig() {
    if (!this.supabaseUrl) {
      // Importación dinámica para evitar dependencia circular
      const env = (window as any).__env ||
        { url: '', anonKey: '' };
      this.supabaseUrl    = env.supabaseUrl    || '';
      this.supabaseAnonKey = env.supabaseAnonKey || '';
    }
  }

  /**
   * Envía un correo de notificación al paciente cuando se agenda su cita.
   * El correo incluye los detalles de la cita y el estado "programada".
   * Retorna el ID del email de Resend, o null si falla o el paciente
   * no tiene correo registrado.
   */
  async notificarCitaProgramada(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at'>,
    paciente: Paciente
  ): Promise<string | null> {
    if (!paciente.correo) {
      console.info('[Resend] Paciente sin correo, omitiendo notificación.');
      return null;
    }

    return this.sendEmail({
      to:      paciente.correo,
      subject: `📅 Tu cita médica ha sido agendada — ${this.formatFecha(cita.fecha)}`,
      html:    this.templateCitaProgramada(cita, paciente)
    });
  }

  /**
   * Envía un correo de confirmación al paciente cuando el doctor confirma la cita.
   */
  async notificarCitaConfirmada(
    cita: Cita,
    paciente: Paciente
  ): Promise<string | null> {
    if (!paciente.correo) return null;

    return this.sendEmail({
      to:      paciente.correo,
      subject: `✅ Tu cita médica ha sido confirmada — ${this.formatFecha(cita.fecha!)}`,
      html:    this.templateCitaConfirmada(cita, paciente)
    });
  }

  /**
   * Envía un correo de cancelación al paciente.
   */
  async notificarCitaCancelada(
    cita: Cita,
    paciente: Paciente
  ): Promise<string | null> {
    if (!paciente.correo) return null;

    return this.sendEmail({
      to:      paciente.correo,
      subject: `❌ Tu cita médica ha sido cancelada — ${this.formatFecha(cita.fecha!)}`,
      html:    this.templateCitaCancelada(cita, paciente)
    });
  }

  // ─── HTTP ────────────────────────────────────────────────────

  private async sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<string | null> {
    try {
      const { environment } = await import('../../../environments/environment');
      const url = `${environment.supabase.url}/functions/v1/${EDGE_FUNCTION_URL}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${environment.supabase.anonKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[Resend] Error enviando correo:', err);
        return null;
      }

      const data = await response.json();
      console.log('[Resend] Correo enviado, ID:', data.id);
      return data.id ?? null;

    } catch (err) {
      console.error('[Resend] Error de red:', err);
      return null;
    }
  }

  // ─── Templates HTML ──────────────────────────────────────────

  private templateCitaProgramada(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at'>,
    paciente: Paciente
  ): string {
    return `
      ${this.emailBase(`
        <h2 style="color:#1e293b;margin:0 0 8px">Tu cita ha sido agendada 📅</h2>
        <p style="color:#64748b;margin:0 0 24px">Hola <strong>${paciente.nombre}</strong>, tu cita médica ha sido registrada y está <strong style="color:#f59e0b">pendiente de confirmación</strong>.</p>
        ${this.citaBox(cita, paciente)}
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-top:20px">
          <p style="margin:0;color:#854d0e;font-size:14px">⏳ Tu cita será confirmada próximamente por el doctor. Recibirás otro correo cuando sea confirmada.</p>
        </div>
      `)}
    `;
  }

  private templateCitaConfirmada(cita: Cita, paciente: Paciente): string {
    return `
      ${this.emailBase(`
        <h2 style="color:#1e293b;margin:0 0 8px">¡Tu cita ha sido confirmada! ✅</h2>
        <p style="color:#64748b;margin:0 0 24px">Hola <strong>${paciente.nombre}</strong>, tu cita médica ha sido <strong style="color:#16a34a">confirmada</strong>. Te esperamos.</p>
        ${this.citaBox(cita, paciente)}
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-top:20px">
          <p style="margin:0;color:#15803d;font-size:14px">✅ Por favor llega 5 minutos antes de tu cita. Si necesitas cancelar, contacta al consultorio.</p>
        </div>
      `)}
    `;
  }

  private templateCitaCancelada(cita: Cita, paciente: Paciente): string {
    return `
      ${this.emailBase(`
        <h2 style="color:#1e293b;margin:0 0 8px">Tu cita ha sido cancelada ❌</h2>
        <p style="color:#64748b;margin:0 0 24px">Hola <strong>${paciente.nombre}</strong>, lamentamos informarte que tu cita médica ha sido <strong style="color:#dc2626">cancelada</strong>.</p>
        ${this.citaBox(cita, paciente)}
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-top:20px">
          <p style="margin:0;color:#dc2626;font-size:14px">Para reagendar tu cita, por favor contacta al consultorio directamente.</p>
        </div>
      `)}
    `;
  }

  private citaBox(cita: Partial<Cita>, paciente: Paciente): string {
    return `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;width:120px">📅 Fecha</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:14px">${this.formatFecha(cita.fecha!)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px">🕐 Hora</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:14px">${this.formatHora(cita.hora_inicio!)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px">⏱️ Duración</td>
            <td style="padding:6px 0;color:#1e293b;font-weight:600;font-size:14px">${cita.duracion} minutos</td>
          </tr>
          ${cita.notas ? `
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px">📝 Notas</td>
            <td style="padding:6px 0;color:#1e293b;font-size:14px">${cita.notas}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }

  private emailBase(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <div style="max-width:520px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="background:#1e293b;padding:20px 28px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🏥</span>
            <span style="color:white;font-size:18px;font-weight:600">CitasMed</span>
          </div>
          <div style="padding:28px">${content}</div>
          <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">Este correo fue enviado automáticamente por CitasMed. Por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ─── Helpers de formato ──────────────────────────────────────

  private formatFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-');
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${d} de ${meses[parseInt(m) - 1]} de ${y}`;
  }

  private formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayH = hour % 12 || 12;
    return `${displayH}:${m} ${ampm}`;
  }
}