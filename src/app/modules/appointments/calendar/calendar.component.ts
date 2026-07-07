// src/app/modules/appointments/calendar/calendar.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { GoogleCalendarService, GoogleStatus } from '../../../core/services/google-calendar.service';
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
  loading           = signal(true);
  loadingConfirmar  = signal<string | null>(null);
  successMsg        = signal('');
  errorMsg          = signal('');
  warningMsg        = signal('');  // Para avisos no críticos (Calendar sin token)

  currentYear   = signal(new Date().getFullYear());
  currentMonth  = signal(new Date().getMonth());
  calendarDays  = signal<CalendarDay[]>([]);
  selectedDay   = signal<CalendarDay | null>(null);

  googleStatus  = signal<GoogleStatus>({ conectado: false });

  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  constructor(
    private citasService: CitasService,
    private googleCalendarService: GoogleCalendarService
  ) {}

  async ngOnInit() {
    // Verificar estado de Google en paralelo con la carga del calendario
    const [status] = await Promise.all([
      this.googleCalendarService.getStatus(),
      this.loadMonth()
    ]);
    this.googleStatus.set(status);
  }

  // ─── Navegación ──────────────────────────────────────────────

  async prevMonth() {
    let m = this.currentMonth() - 1, y = this.currentYear();
    if (m < 0) { m = 11; y--; }
    this.currentMonth.set(m); this.currentYear.set(y);
    this.selectedDay.set(null);
    await this.loadMonth();
  }

  async nextMonth() {
    let m = this.currentMonth() + 1, y = this.currentYear();
    if (m > 11) { m = 0; y++; }
    this.currentMonth.set(m); this.currentYear.set(y);
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

  // ─── Carga ───────────────────────────────────────────────────

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

    const citasPorFecha = new Map<string, CitaConPaciente[]>();
    citas.forEach(c => {
      if (!citasPorFecha.has(c.fecha)) citasPorFecha.set(c.fecha, []);
      citasPorFecha.get(c.fecha)!.push(c);
    });

    const days: CalendarDay[] = [];
    const firstDay     = new Date(year, month, 1).getDay();
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const prevDays     = new Date(year, month, 0).getDate();

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

  // ─── Selección de día ────────────────────────────────────────

  selectDay(day: CalendarDay) {
    this.selectedDay.set(
      this.selectedDay()?.dateStr === day.dateStr ? null : day
    );
  }

  // ─── Confirmar cita ──────────────────────────────────────────

  async confirmarCita(cita: CitaConPaciente, event: Event) {
    event.stopPropagation();

    // Advertir si Google no está conectado antes de confirmar
    const status = this.googleStatus();
    let confirmMsg = `¿Confirmar la cita de ${cita.paciente.nombre}?`;
    if (!status.conectado) {
      confirmMsg += `\n\n⚠️ Nota: ${status.motivo}\nLa cita se confirmará pero NO aparecerá en Google Calendar.`;
    }
    if (!confirm(confirmMsg)) return;

    this.loadingConfirmar.set(cita.id!);
    this.clearMessages();

    try {
      const result = await this.citasService.confirmar(cita.id!);

      // Construir mensaje de éxito detallado
      let msg = `✅ Cita de ${cita.paciente.nombre} confirmada.`;
      const warnings: string[] = [];

      if (result.calendarOk) {
        msg += ' 📅 Evento creado en Google Calendar.';
      } else if (result.calendarError) {
        warnings.push(`📅 Google Calendar: ${result.calendarError}`);
      }

      if (result.correoOk) {
        msg += ' ✉️ Correo enviado al paciente.';
      } else if (result.correoError) {
        warnings.push(`✉️ Correo: ${result.correoError}`);
      }

      this.showSuccess(msg);
      if (warnings.length > 0) {
        setTimeout(() => this.showWarning(warnings.join(' | ')), 4500);
      }

      await this.loadMonth();
      // Actualizar el día seleccionado
      const updated = this.calendarDays().find(d => d.dateStr === this.selectedDay()?.dateStr);
      this.selectedDay.set(updated ?? null);

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
      const updated = this.calendarDays().find(d => d.dateStr === this.selectedDay()?.dateStr);
      this.selectedDay.set(updated ?? null);
    } catch (err: any) {
      this.showError(err.message || 'Error al cancelar.');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour   = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  estadoBadge(estado: string): string {
    return { programada: 'badge-programada', confirmada: 'badge-confirmada', cancelada: 'badge-cancelada' }[estado] ?? '';
  }

  get mesAnioLabel(): string {
    return `${this.MESES[this.currentMonth()]} ${this.currentYear()}`;
  }

  private clearMessages() {
    this.successMsg.set(''); this.errorMsg.set(''); this.warningMsg.set('');
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 5000);
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 6000);
  }

  private showWarning(msg: string) {
    this.warningMsg.set(msg);
    setTimeout(() => this.warningMsg.set(''), 7000);
  }
}