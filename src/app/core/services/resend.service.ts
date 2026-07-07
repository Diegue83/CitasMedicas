// src/app/core/services/resend.service.ts
// Llama a la Edge Function de Supabase (proxy seguro).
// NUNCA llama a api.resend.com directamente — los navegadores
// bloquean esa llamada por CORS.

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Cita, Paciente } from '../models';

@Injectable({ providedIn: 'root' })
export class ResendService {

  private get edgeFunctionUrl(): string {
    return `${environment.supabase.url}/functions/v1/send-appointment-email`;
  }

  private get anonKey(): string {
    return environment.supabase.anonKey;
  }

  // ─── Envío central ───────────────────────────────────────────

  private async send(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ id: string | null; error: string | null }> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.anonKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Resend] Error desde Edge Function:', data);
        return { id: null, error: data?.error ?? `Error ${response.status}` };
      }

      console.log('[Resend] ✅ Correo enviado a', payload.to, '— ID:', data.id);
      return { id: data.id ?? null, error: null };

    } catch (err: any) {
      console.error('[Resend] Error de red:', err.message);
      return { id: null, error: `Error de red: ${err.message}` };
    }
  }

  // ─── Correos de citas ────────────────────────────────────────

  async notificarCitaConfirmada(
    cita: Cita,
    paciente: Paciente
  ): Promise<{ id: string | null; error: string | null }> {
    if (!paciente.correo) {
      return { id: null, error: 'El paciente no tiene correo registrado.' };
    }
    return this.send({
      to:      paciente.correo,
      subject: `✅ Tu cita médica ha sido confirmada — ${this.formatFecha(cita.fecha!)}`,
      html:    this.templateConfirmada(cita, paciente)
    });
  }

  async notificarCitaCancelada(
    cita: Cita,
    paciente: Paciente
  ): Promise<{ id: string | null; error: string | null }> {
    if (!paciente.correo) {
      return { id: null, error: 'El paciente no tiene correo registrado.' };
    }
    return this.send({
      to:      paciente.correo,
      subject: `❌ Tu cita médica ha sido cancelada — ${this.formatFecha(cita.fecha!)}`,
      html:    this.templateCancelada(cita, paciente)
    });
  }

  // ─── Templates ───────────────────────────────────────────────

  private templateConfirmada(cita: Cita, paciente: Paciente): string {
    return this.base(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px">✅</div>
        <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px">¡Tu cita ha sido confirmada!</h2>
        <p style="color:#64748b;margin:0;font-size:15px">Hola <strong>${paciente.nombre}</strong>, tu cita médica está confirmada. Te esperamos.</p>
      </div>
      ${this.citaBox(cita)}
      <div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-top:20px">
        <p style="margin:0;color:#15803d;font-size:14px">✅ Por favor llega 5 minutos antes. Si necesitas cancelar, contacta al consultorio.</p>
      </div>
    `);
  }

  private templateCancelada(cita: Cita, paciente: Paciente): string {
    return this.base(`
      <div style="text-align:center;margin-bottom:28px">
        <div style="width:64px;height:64px;background:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px">❌</div>
        <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px">Tu cita ha sido cancelada</h2>
        <p style="color:#64748b;margin:0;font-size:15px">Hola <strong>${paciente.nombre}</strong>, lamentamos informarte que tu cita ha sido cancelada.</p>
      </div>
      ${this.citaBox(cita)}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-top:20px">
        <p style="margin:0;color:#dc2626;font-size:14px">Para reagendar contacta al consultorio directamente.</p>
      </div>
    `);
  }

  private citaBox(cita: Cita): string {
    return `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:16px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:14px;width:110px">📅 Fecha</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:14px">${this.formatFecha(cita.fecha!)}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:14px">🕐 Hora</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:14px">${this.formatHora(cita.hora_inicio!)}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:14px">⏱️ Duración</td>
            <td style="padding:7px 0;color:#1e293b;font-weight:600;font-size:14px">${cita.duracion} minutos</td>
          </tr>
          ${cita.notas ? `
          <tr>
            <td style="padding:7px 0;color:#64748b;font-size:14px">📝 Notas</td>
            <td style="padding:7px 0;color:#1e293b;font-size:14px">${cita.notas}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }

  private base(content: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#1e293b;padding:20px 28px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">🏥</span>
      <span style="color:white;font-size:17px;font-weight:600">CitasMed</span>
    </div>
    <div style="padding:28px">${content}</div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
        Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private formatFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-');
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
  }

  private formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour   = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }
}