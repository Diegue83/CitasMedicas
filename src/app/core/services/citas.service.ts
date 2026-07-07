// src/app/core/services/citas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { GoogleCalendarService } from './google-calendar.service';
import { PacientesService } from './pacientes.service';
import { ResendService } from './resend.service';
import { Cita, CitaConPaciente } from '../models';
import { toLocalDateString, todayLocalDateString } from '../utils/date.utils';

export interface ConfirmarResult {
  success: boolean;
  calendarOk: boolean;
  calendarError: string | null;
  correoOk: boolean;
  correoError: string | null;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly TABLE = 'citas';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService,
    private googleCalendar: GoogleCalendarService,
    private pacientesService: PacientesService,
    private resend: ResendService
  ) {}

  // ─── Consultas ───────────────────────────────────────────────

  async getCitasDelDia(fecha: string): Promise<CitaConPaciente[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .eq('fecha', fecha)
      .neq('estado', 'cancelada')
      .order('hora_inicio', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasPendientes(): Promise<CitaConPaciente[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .eq('estado', 'programada')
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasMesCalendario(year: number, month: number): Promise<CitaConPaciente[]> {
    const inicio = toLocalDateString(new Date(year, month, 1));
    const fin    = toLocalDateString(new Date(year, month + 1, 0));
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .neq('estado', 'cancelada')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('hora_inicio', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasSemana(): Promise<CitaConPaciente[]> {
    const hoy    = new Date();
    const lunes  = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .neq('estado', 'cancelada')
      .gte('fecha', toLocalDateString(lunes))
      .lte('fecha', toLocalDateString(domingo))
      .order('fecha').order('hora_inicio');
    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasMes(): Promise<CitaConPaciente[]> {
    const hoy    = new Date();
    const inicio = toLocalDateString(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const fin    = toLocalDateString(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .neq('estado', 'cancelada')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha').order('hora_inicio');
    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  // ─── Validación de solapamiento ──────────────────────────────

  async checkOverlap(
    fecha: string, horaInicio: string,
    duracion: number, excludeId?: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('id, hora_inicio, duracion')
      .eq('doctor_id', this.auth.userId!)
      .eq('fecha', fecha)
      .neq('estado', 'cancelada');
    if (error) throw error;

    const [h1, m1] = horaInicio.split(':').map(Number);
    const inicioMin = h1 * 60 + m1;
    const finMin    = inicioMin + duracion;

    return (data ?? []).some((c: any) => {
      if (excludeId && c.id === excludeId) return false;
      const [hc, mc] = c.hora_inicio.split(':').map(Number);
      const cInicioMin = hc * 60 + mc;
      const cFinMin    = cInicioMin + c.duracion;
      return inicioMin < cFinMin && finMin > cInicioMin;
    });
  }

  // ─── CREAR cita (sin correo — solo guarda) ───────────────────

  async create(
    cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>
  ): Promise<Cita> {
    const overlap = await this.checkOverlap(cita.fecha, cita.hora_inicio, cita.duracion);
    if (overlap) throw new Error('Conflicto de horario: ya existe una cita en ese rango.');

    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .insert({ ...cita, doctor_id: this.auth.userId!, estado: 'programada' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ─── CONFIRMAR: Calendar + correo de confirmación ───────────

  /**
   * Flujo al confirmar:
   * 1. Cambiar estado a "confirmada" en Supabase
   * 2. Crear evento en Google Calendar (si hay token)
   * 3. Enviar UN correo al paciente (solo si tiene correo)
   *
   * Retorna resultado detallado para mostrar al doctor
   * qué salió bien y qué falló.
   */
  async confirmar(id: string): Promise<ConfirmarResult> {
    // 1. Obtener cita completa
    const { data: citaData, error: fetchErr } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!)
      .single();

    if (fetchErr) throw fetchErr;
    const cita = citaData as CitaConPaciente;

    // 2. Crear evento en Google Calendar
    let calendarEventId: string | null = null;
    let calendarOk  = false;
    let calendarError: string | null = null;

    const calResult = await this.googleCalendar.crearEvento(cita, cita.paciente);
    if (calResult.eventId) {
      calendarEventId = calResult.eventId;
      calendarOk      = true;
    } else {
      calendarError = calResult.error;
    }

    // 3. Actualizar estado en Supabase
    const { error: updateErr } = await this.supabase.client
      .from(this.TABLE)
      .update({ estado: 'confirmada', calendar_event_id: calendarEventId })
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!);

    if (updateErr) throw updateErr;

    // 4. Enviar correo de confirmación al paciente
    let correoOk  = false;
    let correoError: string | null = null;

    const correoResult = await this.resend.notificarCitaConfirmada(
      { ...cita, estado: 'confirmada' },
      cita.paciente
    );
    if (correoResult.id) {
      correoOk = true;
    } else {
      correoError = correoResult.error;
    }

    return { success: true, calendarOk, calendarError, correoOk, correoError };
  }

  // ─── CANCELAR: eliminar de Calendar + correo ─────────────────

  async cancelar(id: string): Promise<void> {
    const { data: citaData, error: fetchErr } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!)
      .single();

    if (fetchErr) throw fetchErr;
    const cita = citaData as CitaConPaciente;

    // Cancelar en BD
    const { error } = await this.supabase.client
      .from(this.TABLE)
      .update({ estado: 'cancelada' })
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!);

    if (error) throw error;

    // Eliminar de Calendar
    if (cita.calendar_event_id) {
      await this.googleCalendar.eliminarEvento(cita.calendar_event_id);
    }

    // Correo al paciente
    if (cita.paciente?.correo) {
      await this.resend.notificarCitaCancelada(cita, cita.paciente);
    }
  }

  // ─── Stats ───────────────────────────────────────────────────

  async getStatsForDashboard() {
    const hoy         = todayLocalDateString();
    const citasSemana = await this.getCitasSemana();
    const citasMes    = await this.getCitasMes();
    const citasHoy    = await this.getCitasDelDia(hoy);
    const pendientes  = await this.getCitasPendientes();

    const diasMap: Record<string, number> = {
      'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0
    };
    const diasNombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    citasSemana.forEach(c => {
      const d      = new Date(c.fecha + 'T12:00:00');
      const nombre = diasNombres[d.getDay()];
      diasMap[nombre] = (diasMap[nombre] || 0) + 1;
    });
    const citasPorDia = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
      .map(dia => ({ dia, total: diasMap[dia] }));

    const frecuencia: Record<string, { nombre: string; total: number }> = {};
    citasMes.forEach(c => {
      const pid = c.paciente_id;
      if (!frecuencia[pid]) {
        frecuencia[pid] = { nombre: c.paciente?.nombre ?? 'Desconocido', total: 0 };
      }
      frecuencia[pid].total++;
    });
    const pacientesFrecuentes = Object.values(frecuencia)
      .sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalCitasHoy:    citasHoy.length,
      totalCitasSemana: citasSemana.length,
      totalCitasMes:    citasMes.length,
      totalPendientes:  pendientes.length,
      citasPorDia,
      pacientesFrecuentes
    };
  }
}