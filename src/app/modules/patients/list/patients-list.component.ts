// src/app/modules/patients/list/patients-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { PacientesService } from '../../../core/services/pacientes.service';
import { Paciente } from '../../../core/models';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, DatePipe],
  templateUrl: './patients-list.component.html',
  styleUrl: './patients-list.component.css'
})
export class PatientsListComponent implements OnInit {
  pacientes          = signal<Paciente[]>([]);
  pacientesFiltrados = signal<Paciente[]>([]);
  loading            = signal(true);
  successMsg         = signal('');
  errorMsg           = signal('');
  searchQuery = '';

  constructor(private pacientesService: PacientesService) {}

  async ngOnInit() {
    await this.loadPacientes();
  }

  async loadPacientes() {
    this.loading.set(true);
    try {
      const data = await this.pacientesService.getAll();
      this.pacientes.set(data);
      this.pacientesFiltrados.set(data);
    } catch {
      this.showError('Error al cargar pacientes.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.pacientesFiltrados.set(this.pacientes());
    } else {
      this.pacientesFiltrados.set(
        this.pacientes().filter(p =>
          p.nombre.toLowerCase().includes(q) || p.telefono.includes(q)
        )
      );
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.pacientesFiltrados.set(this.pacientes());
  }

  async deletePaciente(paciente: Paciente) {
    if (!confirm(`¿Eliminar a ${paciente.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await this.pacientesService.delete(paciente.id!);
      this.showSuccess('Paciente eliminado.');
      await this.loadPacientes();
    } catch (err: any) {
      this.showError(err.message || 'Error al eliminar.');
    }
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