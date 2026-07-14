// src/app/core/services/admin.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CitaConPaciente, Doctor, Paciente } from '../models';
import { toLocalDateString } from '../utils/date.utils';

/**
 * Servicio exclusivo para el rol admin.
 * Permite consultar citas, pacientes y estadísticas
 * de CUALQUIER doctor sin importar el doctor_id.
 * El RLS ya permite esto gracias a get_my_rol() = 'admin'.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private supabase: SupabaseService) {}

  // ─── Citas de un doctor específico ──────────────────────────

  async getCitasDoctor(
    doctorId: string,
    fecha: string
  ): Promise<CitaConPaciente[]> {
    const { data, error } = await this.supabase.client
      .from('citas')
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', doctorId)
      .eq('fecha', fecha)
      .neq('estado', 'cancelada')
      .order('hora_inicio', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasDoctorMes(
    doctorId: string,
    year: number,
    month: number
  ): Promise<CitaConPaciente[]> {
    const inicio = toLocalDateString(new Date(year, month, 1));
    const fin    = toLocalDateString(new Date(year, month + 1, 0));

    const { data, error } = await this.supabase.client
      .from('citas')
      .select('*, paciente:pacientes(*)')
      .eq('doctor_id', doctorId)
      .neq('estado', 'cancelada')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('hora_inicio', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  // ─── Citas de TODOS los doctores (calendario global) ────────

  async getCitasTodosMes(
    year: number,
    month: number
  ): Promise<CitaConPaciente[]> {
    const inicio = toLocalDateString(new Date(year, month, 1));
    const fin    = toLocalDateString(new Date(year, month + 1, 0));

    // Quitamos el join con doctores — no hay FK explícita.
    // El componente ya tiene la lista de doctores cargada
    // y usa getDoctorNombre/getDoctorColor con el doctor_id.
    const { data, error } = await this.supabase.client
      .from('citas')
      .select('*, paciente:pacientes(*)')
      .neq('estado', 'cancelada')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha')
      .order('hora_inicio');

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  async getCitasTodosDelDia(fecha: string): Promise<CitaConPaciente[]> {
    const { data, error } = await this.supabase.client
      .from('citas')
      .select('*, paciente:pacientes(*)')
      .eq('fecha', fecha)
      .neq('estado', 'cancelada')
      .order('hora_inicio', { ascending: true });

    if (error) throw error;
    return (data ?? []) as CitaConPaciente[];
  }

  // ─── Pacientes de un doctor específico ──────────────────────

  async getPacientesDoctor(doctorId: string): Promise<Paciente[]> {
    const { data, error } = await this.supabase.client
      .from('pacientes')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  // ─── Stats de un doctor específico ──────────────────────────

  async getStatsDoctor(doctorId: string) {
    const hoy    = toLocalDateString(new Date());
    const inicio = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const fin    = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

    const [citasHoy, citasMes, pacientes] = await Promise.all([
      this.supabase.client.from('citas')
        .select('id, estado')
        .eq('doctor_id', doctorId)
        .eq('fecha', hoy)
        .neq('estado', 'cancelada'),
      this.supabase.client.from('citas')
        .select('id, estado')
        .eq('doctor_id', doctorId)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .neq('estado', 'cancelada'),
      this.supabase.client.from('pacientes')
        .select('id')
        .eq('doctor_id', doctorId)
    ]);

    const citasMesData = citasMes.data ?? [];
    return {
      totalHoy:       (citasHoy.data ?? []).length,
      totalMes:       citasMesData.length,
      confirmadas:    citasMesData.filter((c: any) => c.estado === 'confirmada').length,
      programadas:    citasMesData.filter((c: any) => c.estado === 'programada').length,
      totalPacientes: (pacientes.data ?? []).length
    };
  }

  // ─── Stats globales (todos los doctores) ────────────────────

  async getStatsGlobales() {
    const inicio = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const fin    = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
    const hoy    = toLocalDateString(new Date());

    const [citasHoy, citasMes, pacientes, doctores] = await Promise.all([
      this.supabase.client.from('citas').select('id').eq('fecha', hoy).neq('estado', 'cancelada'),
      this.supabase.client.from('citas').select('id, estado, doctor_id').gte('fecha', inicio).lte('fecha', fin).neq('estado', 'cancelada'),
      this.supabase.client.from('pacientes').select('id'),
      this.supabase.client.from('doctores').select('id').eq('activo', true)
    ]);

    const citasMesData = citasMes.data ?? [];
    return {
      totalCitasHoy:    (citasHoy.data ?? []).length,
      totalCitasMes:    citasMesData.length,
      confirmadas:      citasMesData.filter((c: any) => c.estado === 'confirmada').length,
      programadas:      citasMesData.filter((c: any) => c.estado === 'programada').length,
      totalPacientes:   (pacientes.data ?? []).length,
      totalDoctores:    (doctores.data ?? []).length
    };
  }
}