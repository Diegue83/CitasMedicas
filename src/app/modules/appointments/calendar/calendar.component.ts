// src/app/modules/appointments/calendar/calendar.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { CitaConPaciente, CalendarDay } from '../../../core/models';
import { todayLocalDateString, toLocalDateString } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  loading          = signal(true);
  loadingConfirmar = signal<string | null>(null); // ID de la cita siendo confirmada
  successMsg       = signal('');
  errorMsg         = signal('');

  currentDate   = new Date();
  currentYear   = signal(this.currentDate.getFullYear());
  currentMonth  = signal(this.currentDate.getMonth()); // 0-indexed
  calendarDays  = signal<CalendarDay[]>([]);
  selectedDay   = signal<CalendarDay | null>(null);
  googleConnected = signal(false);

  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  constructor(
    private citasService: CitasService,
    private googleCalendarService: GoogleCalendarService
  ) {}

  async ngOnInit() {
    this.googleConnected.set(await this.googleCalendarService.isGoogleConnected());
    await this.loadMonth();
  }

  // ─── Navegación de mes ───────────────────────────────────────

  async prevMonth() {
    let m = this.currentMonth() - 1;
    let y = this.currentYear();
    if (m < 0) { m = 11; y--; }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.selectedDay.set(null);
    await this.loadMonth();
  }

  async nextMonth() {
    let m = this.currentMonth() + 1;
    let y = this.currentYear();
    if (m > 11) { m = 0; y++; }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.selectedDay.set(null);
    await this.loadMonth();
  }

  async irAHoy() {
    const hoy = new Date();
    this.currentMonth.set(hoy.getMonth());
    this.currentYear.set(hoy.getFullYear());
    this.selectedDay.set(null);
    await this.loadMonth();
  }

  // ─── Carga del mes ───────────────────────────────────────────

  async loadMonth() {
    this.loading.set(true);
    try {
      const citas = await this.citasService.getCitasMesCalendario(
        this.currentYear(), this.currentMonth()
      );
      this.calendarDays.set(this.buildCalendarDays(citas));
    } catch (err) {
      this.showError('Error al cargar el calendario.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildCalendarDays(citas: CitaConPaciente[]): CalendarDay[] {
    const year  = this.currentYear();
    const month = this.currentMonth();
    const today = todayLocalDateString();

    // Agrupar citas por fecha
    const citasPorFecha = new Map<string, CitaConPaciente[]>();
    citas.forEach(c => {
      const key = c.fecha;
      if (!citasPorFecha.has(key)) citasPorFecha.set(key, []);
      citasPorFecha.get(key)!.push(c);
    });

    const days: CalendarDay[] = [];

    // Primer día del mes y cuántos días vacíos antes
    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Días del mes anterior (relleno)
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date    = new Date(year, month - 1, prevMonthDays - i);
      const dateStr = toLocalDateString(date);
      days.push({
        date, dateStr,
        isCurrentMonth: false,
        isToday: dateStr === today,
        citas: citasPorFecha.get(dateStr) ?? []
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(year, month, d);
      const dateStr = toLocalDateString(date);
      days.push({
        date, dateStr,
        isCurrentMonth: true,
        isToday: dateStr === today,
        citas: citasPorFecha.get(dateStr) ?? []
      });
    }

    // Días del mes siguiente (relleno hasta completar 6 semanas = 42 días)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date    = new Date(year, month + 1, d);
      const dateStr = toLocalDateString(date);
      days.push({
        date, dateStr,
        isCurrentMonth: false,
        isToday: dateStr === today,
        citas: citasPorFecha.get(dateStr) ?? []
      });
    }

    return days;
  }

  // ─── Selección de día ────────────────────────────────────────

  selectDay(day: CalendarDay) {
    if (this.selectedDay()?.dateStr === day.dateStr) {
      this.selectedDay.set(null); // toggle
    } else {
      this.selectedDay.set(day);
    }
  }

  // ─── Confirmar cita ──────────────────────────────────────────

  async confirmarCita(cita: CitaConPaciente, event: Event) {
    event.stopPropagation(); // No seleccionar el día al confirmar
    if (!confirm(`¿Confirmar la cita de ${cita.paciente.nombre}?\n\nSe creará un evento en Google Calendar y se notificará al paciente por correo.`)) return;

    this.loadingConfirmar.set(cita.id!);
    try {
      await this.citasService.confirmar(cita.id!);
      this.showSuccess(`✅ Cita de ${cita.paciente.nombre} confirmada. Evento creado en Calendar.`);
      await this.loadMonth();
      // Actualizar el día seleccionado si sigue visible
      if (this.selectedDay()) {
        const updated = this.calendarDays().find(d => d.dateStr === this.selectedDay()!.dateStr);
        this.selectedDay.set(updated ?? null);
      }
    } catch (err: any) {
      this.showError(err.message || 'Error al confirmar la cita.');
    } finally {
      this.loadingConfirmar.set(null);
    }
  }

  // ─── Cancelar cita ───────────────────────────────────────────

  async cancelarCita(cita: CitaConPaciente, event: Event) {
    event.stopPropagation();
    if (!confirm(`¿Cancelar la cita de ${cita.paciente.nombre}?`)) return;

    try {
      await this.citasService.cancelar(cita.id!);
      this.showSuccess('Cita cancelada.');
      await this.loadMonth();
      if (this.selectedDay()) {
        const updated = this.calendarDays().find(d => d.dateStr === this.selectedDay()!.dateStr);
        this.selectedDay.set(updated ?? null);
      }
    } catch (err: any) {
      this.showError(err.message || 'Error al cancelar.');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour   = parseInt(h);
    const ampm   = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }

  get mesAnioLabel(): string {
    return `${this.MESES[this.currentMonth()]} ${this.currentYear()}`;
  }

  estadoBadge(estado: string): string {
    const map: Record<string, string> = {
      programada: 'badge-programada',
      confirmada: 'badge-confirmada',
      cancelada:  'badge-cancelada'
    };
    return map[estado] ?? '';
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 4000);
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 5000);
  }
}