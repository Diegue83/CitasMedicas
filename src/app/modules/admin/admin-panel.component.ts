// src/app/modules/admin/admin-panel.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { DoctoresService } from '../../core/services/doctores.service';
import { Doctor, CitaConPaciente, CalendarDay } from '../../core/models';
import { todayLocalDateString, toLocalDateString } from '../../core/utils/date.utils';

type Vista = 'global' | 'doctor';
type SeccionDoctor = 'resumen' | 'calendario' | 'citas' | 'pacientes';

// Colores asignados a cada doctor en el calendario global
const DOCTOR_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'
];

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {

  vista           = signal<Vista>('global');
  seccionDoctor   = signal<SeccionDoctor>('resumen');
  loading         = signal(true);
  loadingDetalle  = signal(false);

  // ── Global ──────────────────────────────────────────────────
  doctores        = signal<Doctor[]>([]);
  statsGlobales   = signal<any>(null);
  colorMap        = new Map<string, string>(); // doctorId → color

  // Calendario global
  currentYear     = signal(new Date().getFullYear());
  currentMonth    = signal(new Date().getMonth());
  calendarDays    = signal<CalendarDay[]>([]);
  selectedDay     = signal<CalendarDay | null>(null);
  citasDia        = signal<CitaConPaciente[]>([]);
  loadingCalGlobal = signal(false);

  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  // ── Por doctor ───────────────────────────────────────────────
  doctorSeleccionado = signal<Doctor | null>(null);
  statsDoctor        = signal<any>(null);
  citasDoctor        = signal<CitaConPaciente[]>([]);
  pacientesDoctor    = signal<any[]>([]);
  calDoctorDays      = signal<CalendarDay[]>([]);
  calDoctorYear      = signal(new Date().getFullYear());
  calDoctorMonth     = signal(new Date().getMonth());
  selectedDayDoctor  = signal<CalendarDay | null>(null);
  fechaListaCitas    = todayLocalDateString();

  constructor(
    private adminService: AdminService,
    private doctoresService: DoctoresService
  ) {}

  async ngOnInit() {
    await this.loadGlobal();
  }

  // ─── Vista Global ────────────────────────────────────────────

  async loadGlobal() {
    this.loading.set(true);
    try {
      const [doctores, stats] = await Promise.all([
        this.doctoresService.getAll(),
        this.adminService.getStatsGlobales()
      ]);
      this.doctores.set(doctores);
      this.statsGlobales.set(stats);

      // Asignar colores a cada doctor
      doctores.forEach((d, i) => {
        this.colorMap.set(d.id!, DOCTOR_COLORS[i % DOCTOR_COLORS.length]);
      });

      await this.loadCalendarioGlobal();
    } catch (err) {
      console.error('Error cargando panel admin:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCalendarioGlobal() {
    this.loadingCalGlobal.set(true);
    try {
      const citas = await this.adminService.getCitasTodosMes(
        this.currentYear(), this.currentMonth()
      );
      this.calendarDays.set(this.buildCalendarDays(citas, false));
    } finally {
      this.loadingCalGlobal.set(false);
    }
  }

  async prevMonthGlobal() {
    let m = this.currentMonth() - 1, y = this.currentYear();
    if (m < 0) { m = 11; y--; }
    this.currentMonth.set(m); this.currentYear.set(y);
    this.selectedDay.set(null);
    await this.loadCalendarioGlobal();
  }

  async nextMonthGlobal() {
    let m = this.currentMonth() + 1, y = this.currentYear();
    if (m > 11) { m = 0; y++; }
    this.currentMonth.set(m); this.currentYear.set(y);
    this.selectedDay.set(null);
    await this.loadCalendarioGlobal();
  }

  async selectDayGlobal(day: CalendarDay) {
    if (this.selectedDay()?.dateStr === day.dateStr) {
      this.selectedDay.set(null); this.citasDia.set([]); return;
    }
    this.selectedDay.set(day);
    const citas = await this.adminService.getCitasTodosDelDia(day.dateStr);
    this.citasDia.set(citas);
  }

  getDoctorColor(doctorId: string): string {
    return this.colorMap.get(doctorId) ?? '#94a3b8';
  }

  getDoctorNombre(doctorId: string): string {
    return this.doctores().find(d => d.id === doctorId)?.nombre ?? 'Doctor';
  }

  // ─── Vista por doctor ────────────────────────────────────────

  async seleccionarDoctor(doctor: Doctor) {
    this.doctorSeleccionado.set(doctor);
    this.vista.set('doctor');
    this.seccionDoctor.set('resumen');
    await this.loadDoctorData(doctor.id!);
  }

  async loadDoctorData(doctorId: string) {
    this.loadingDetalle.set(true);
    try {
      const [stats, citas, pacientes] = await Promise.all([
        this.adminService.getStatsDoctor(doctorId),
        this.adminService.getCitasDoctor(doctorId, this.fechaListaCitas),
        this.adminService.getPacientesDoctor(doctorId)
      ]);
      this.statsDoctor.set(stats);
      this.citasDoctor.set(citas);
      this.pacientesDoctor.set(pacientes);
      await this.loadCalDoctor(doctorId);
    } catch (err) {
      console.error('Error cargando datos del doctor:', err);
    } finally {
      this.loadingDetalle.set(false);
    }
  }

  async loadCalDoctor(doctorId: string) {
    const citas = await this.adminService.getCitasDoctorMes(
      doctorId, this.calDoctorYear(), this.calDoctorMonth()
    );
    this.calDoctorDays.set(this.buildCalendarDays(citas, true));
  }

  async prevMonthDoctor() {
    let m = this.calDoctorMonth() - 1, y = this.calDoctorYear();
    if (m < 0) { m = 11; y--; }
    this.calDoctorMonth.set(m); this.calDoctorYear.set(y);
    this.selectedDayDoctor.set(null);
    await this.loadCalDoctor(this.doctorSeleccionado()!.id!);
  }

  async nextMonthDoctor() {
    let m = this.calDoctorMonth() + 1, y = this.calDoctorYear();
    if (m > 11) { m = 0; y++; }
    this.calDoctorMonth.set(m); this.calDoctorYear.set(y);
    this.selectedDayDoctor.set(null);
    await this.loadCalDoctor(this.doctorSeleccionado()!.id!);
  }

  async selectDayDoctor(day: CalendarDay) {
    if (this.selectedDayDoctor()?.dateStr === day.dateStr) {
      this.selectedDayDoctor.set(null); return;
    }
    this.selectedDayDoctor.set(day);
    const citas = await this.adminService.getCitasDoctor(
      this.doctorSeleccionado()!.id!, day.dateStr
    );
    this.citasDoctor.set(citas);
  }

  async onFechaListaCitas(fecha: string) {
    this.fechaListaCitas = fecha;
    const citas = await this.adminService.getCitasDoctor(
      this.doctorSeleccionado()!.id!, fecha
    );
    this.citasDoctor.set(citas);
  }

  volverGlobal() {
    this.vista.set('global');
    this.doctorSeleccionado.set(null);
    this.selectedDayDoctor.set(null);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private buildCalendarDays(citas: CitaConPaciente[], singleDoctor: boolean): CalendarDay[] {
    const year  = singleDoctor ? this.calDoctorYear()  : this.currentYear();
    const month = singleDoctor ? this.calDoctorMonth() : this.currentMonth();
    const today = todayLocalDateString();

    const citasPorFecha = new Map<string, CitaConPaciente[]>();
    citas.forEach(c => {
      if (!citasPorFecha.has(c.fecha)) citasPorFecha.set(c.fecha, []);
      citasPorFecha.get(c.fecha)!.push(c);
    });

    const days: CalendarDay[] = [];
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays    = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevDays - i);
      const dateStr = toLocalDateString(date);
      days.push({ date, dateStr, isCurrentMonth: false, isToday: dateStr === today, citas: citasPorFecha.get(dateStr) ?? [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = toLocalDateString(date);
      days.push({ date, dateStr, isCurrentMonth: true, isToday: dateStr === today, citas: citasPorFecha.get(dateStr) ?? [] });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      const dateStr = toLocalDateString(date);
      days.push({ date, dateStr, isCurrentMonth: false, isToday: dateStr === today, citas: citasPorFecha.get(dateStr) ?? [] });
    }
    return days;
  }

  formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  estadoBadgeClass(estado: string): string {
    return { programada: 'badge-prog', confirmada: 'badge-conf', cancelada: 'badge-canc' }[estado] ?? '';
  }

  get mesGlobalLabel()  { return `${this.MESES[this.currentMonth()]} ${this.currentYear()}`; }
  get mesDoctorLabel()  { return `${this.MESES[this.calDoctorMonth()]} ${this.calDoctorYear()}`; }
}