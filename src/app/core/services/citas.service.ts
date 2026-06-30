// src/app/core/services/citas.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Cita, CitaConPaciente } from '../models';
import { toLocalDateString, todayLocalDateString } from '../utils/date.utils';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly TABLE = 'citas';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  /** Todas las citas del día, con datos del paciente */
  async getCitasDelDia(fecha: string): Promise<CitaConPaciente[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .eq('fecha', fecha)
      .eq('estado', 'programada')
      .order('hora_inicio', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  /** Citas de la semana actual (lunes a domingo) */
  async getCitasSemana(): Promise<CitaConPaciente[]> {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .eq('estado', 'programada')
      .gte('fecha', toLocalDateString(lunes))
      .lte('fecha', toLocalDateString(domingo))
      .order('fecha')
      .order('hora_inicio');

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  /** Citas del mes actual */
  async getCitasMes(): Promise<CitaConPaciente[]> {
    const hoy = new Date();
    const inicio = toLocalDateString(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const fin = toLocalDateString(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));

    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', this.auth.userId!)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha')
      .order('hora_inicio');

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  /** Verificar solapamiento localmente antes de insertar */
  async checkOverlap(
    fecha: string,
    horaInicio: string,
    duracion: number,
    excludeId?: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('id, hora_inicio, duracion')
      .eq('doctor_id', this.auth.userId!)
      .eq('fecha', fecha)
      .eq('estado', 'programada');

    if (error) throw error;

    const [h1, m1] = horaInicio.split(':').map(Number);
    const inicioMin = h1 * 60 + m1;
    const finMin = inicioMin + duracion;

    return (data ?? []).some((c: any) => {
      if (excludeId && c.id === excludeId) return false;
      const [hc, mc] = c.hora_inicio.split(':').map(Number);
      const cInicioMin = hc * 60 + mc;
      const cFinMin = cInicioMin + c.duracion;
      return inicioMin < cFinMin && finMin > cInicioMin;
    });
  }

  async create(cita: Omit<Cita, 'id' | 'doctor_id' | 'created_at' | 'estado'>): Promise<Cita> {
    const overlap = await this.checkOverlap(
      cita.fecha, cita.hora_inicio, cita.duracion
    );
    if (overlap) {
      throw new Error('Conflicto de horario: ya existe una cita en ese rango.');
    }

    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .insert({ ...cita, doctor_id: this.auth.userId!, estado: 'programada' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancelar(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from(this.TABLE)
      .update({ estado: 'cancelada' })
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!);

    if (error) throw error;
  }

  async update(id: string, cita: Partial<Cita>): Promise<Cita> {
    if (cita.fecha && cita.hora_inicio && cita.duracion) {
      const overlap = await this.checkOverlap(
        cita.fecha, cita.hora_inicio, cita.duracion, id
      );
      if (overlap) {
        throw new Error('Conflicto de horario: ya existe una cita en ese rango.');
      }
    }

    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .update(cita)
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /** Datos para dashboard */
  async getStatsForDashboard() {
    const hoy = todayLocalDateString();
    const citasSemana = await this.getCitasSemana();
    const citasMes = await this.getCitasMes();
    const citasHoy = await this.getCitasDelDia(hoy);

    // Citas por día de la semana
    const diasMap: Record<string, number> = {
      'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0
    };
    const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    citasSemana.forEach(c => {
      const d = new Date(c.fecha + 'T12:00:00');
      const nombre = diasNombres[d.getDay()];
      diasMap[nombre] = (diasMap[nombre] || 0) + 1;
    });
    const citasPorDia = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      .map(dia => ({ dia, total: diasMap[dia] }));

    // Pacientes más frecuentes del mes
    const frecuencia: Record<string, { nombre: string; total: number }> = {};
    citasMes.forEach(c => {
      const pid = c.paciente_id;
      if (!frecuencia[pid]) {
        frecuencia[pid] = { nombre: c.paciente?.nombre ?? 'Desconocido', total: 0 };
      }
      frecuencia[pid].total++;
    });
    const pacientesFrecuentes = Object.values(frecuencia)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalCitasHoy: citasHoy.length,
      totalCitasSemana: citasSemana.length,
      totalCitasMes: citasMes.length,
      citasPorDia,
      pacientesFrecuentes
    };
  }
}