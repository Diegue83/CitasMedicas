// src/app/core/models/index.ts

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
  fecha: string;           // 'YYYY-MM-DD'
  hora_inicio: string;     // 'HH:MM'
  duracion: 30 | 60;
  estado?: 'programada' | 'confirmada' | 'cancelada';
  notas?: string;
  calendar_event_id?: string;
  resend_email_id?: string;
  created_at?: string;
  paciente?: Paciente;
}

export interface CitaConPaciente extends Cita {
  paciente: Paciente;
}

export interface DashboardStats {
  totalCitasHoy: number;
  totalCitasSemana: number;
  totalCitasMes: number;
  totalPacientes: number;
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

// Para el calendario mensual
export interface CalendarDay {
  date: Date;
  dateStr: string;       // 'YYYY-MM-DD'
  isCurrentMonth: boolean;
  isToday: boolean;
  citas: CitaConPaciente[];
}