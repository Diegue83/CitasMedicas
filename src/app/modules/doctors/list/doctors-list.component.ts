// src/app/modules/doctors/list/doctors-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DoctoresService } from '../../../core/services/doctores.service';
import { Doctor } from '../../../core/models';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './doctors-list.component.html',
  styleUrl: './doctors-list.component.css'
})
export class DoctorsListComponent implements OnInit {
  doctores   = signal<Doctor[]>([]);
  loading    = signal(true);
  successMsg = signal('');
  errorMsg   = signal('');

  constructor(private doctoresService: DoctoresService) {}

  async ngOnInit() { await this.loadDoctores(); }

  async loadDoctores() {
    this.loading.set(true);
    try {
      this.doctores.set(await this.doctoresService.getAll());
    } catch {
      this.showError('Error al cargar doctores.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleActivo(doctor: Doctor) {
    const accion = doctor.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿${accion} al Dr. ${doctor.nombre}?`)) return;
    try {
      await this.doctoresService.toggleActivo(doctor.id!, !doctor.activo);
      this.showSuccess(`Doctor ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente.`);
      await this.loadDoctores();
    } catch (err: any) {
      this.showError(err.message || 'Error al actualizar.');
    }
  }

  rolLabel(rol: string): string {
    return rol === 'admin' ? '⭐ Admin' : '🩺 Doctor';
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