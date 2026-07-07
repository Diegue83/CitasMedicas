// src/app/core/models/index.ts

export type Rol = 'admin' | 'doctor';

export interface Doctor {
  id?: string;
  nombre: string;
  correo: string;
  especialidad: string;
  telefono?: string;
  foto_url?: string;
  rol: Rol;
  activo?: boolean;
  created_at?: string;
}

export interface Paciente {
  id?: string;
  doctor_id?: string;
  nombre: string;
  telefono: string;
  correo?: string;
  created_at?: string;
}

export interface Cita {
  id?: string;
  doctor_id?: string;
  paciente_id: string;
  fecha: string;
  hora_inicio: string;
  duracion: 30 | 60;
  estado?: 'programada' | 'confirmada' | 'cancelada';
  notas?: string;
  calendar_event_id?: string;
  resend_email_id?: string;
  created_at?: string;
  paciente?: Paciente;
  doctor?: Doctor;
}

export interface CitaConPaciente extends Cita {
  paciente: Paciente;
}

export interface DashboardStats {
  totalCitasHoy: number;
  totalCitasSemana: number;
  totalCitasMes: number;
  totalPacientes: number;
  totalDoctores?: number;
  totalPendientes: number;
  citasPorDia: { dia: string; total: number }[];
  pacientesFrecuentes: { nombre: string; total: number }[];
}

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end:   { dateTime: string; timeZone: string };
  colorId?: string;
}

export interface GoogleCalendarEventResponse extends GoogleCalendarEvent {
  id: string;
  htmlLink: string;
  status: string;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  citas: CitaConPaciente[];
}