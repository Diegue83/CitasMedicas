// src/app/modules/appointments/list/appointments-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { CitaConPaciente } from '../../../core/models';
import { toLocalDateString, todayLocalDateString } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './appointments-list.component.html',
  styleUrl: './appointments-list.component.css'
})
export class AppointmentsListComponent implements OnInit {
  citas            = signal<CitaConPaciente[]>([]);
  loading          = signal(true);
  successMsg       = signal('');
  errorMsg         = signal('');
  fechaSeleccionada = todayLocalDateString();

  constructor(private citasService: CitasService) {}

  async ngOnInit() { await this.loadCitas(); }

  async loadCitas() {
    this.loading.set(true);
    try {
      const data = await this.citasService.getCitasDelDia(this.fechaSeleccionada);
      this.citas.set(data);
    } catch {
      this.showError('Error al cargar citas.');
    } finally {
      this.loading.set(false);
    }
  }

  async onFechaChange(fecha: string) {
    this.fechaSeleccionada = fecha;
    await this.loadCitas();
  }

  cambiarDia(delta: number) {
    const d = new Date(this.fechaSeleccionada + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    this.fechaSeleccionada = toLocalDateString(d);
    this.loadCitas();
  }

  irAHoy() {
    this.fechaSeleccionada = todayLocalDateString();
    this.loadCitas();
  }

  async cancelarCita(cita: CitaConPaciente) {
    if (!confirm(`¿Está seguro de cancelar la cita de ${cita.paciente?.nombre}?`)) return;
    try {
      await this.citasService.cancelar(cita.id!);
      this.showSuccess('Cita cancelada exitosamente.');
      await this.loadCitas();
    } catch (err: any) {
      this.showError(err.message || 'Error al cancelar.');
    }
  }

  formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  }

  horaFin(inicio: string, duracion: number): string {
    const [h, m] = inicio.split(':').map(Number);
    const totalMin = h * 60 + m + duracion;
    const hFin = Math.floor(totalMin / 60);
    const mFin = totalMin % 60;
    const ampm = hFin >= 12 ? 'PM' : 'AM';
    const displayHour = hFin % 12 || 12;
    return `${displayHour}:${mFin.toString().padStart(2, '0')} ${ampm}`;
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 4000);
  }
}