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
  fecha: string;          // 'YYYY-MM-DD'
  hora_inicio: string;    // 'HH:MM'
  duracion: 30 | 60;
  estado?: 'programada' | 'cancelada';
  notas?: string;
  created_at?: string;
  // Join con paciente (para vistas)
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