// src/app/modules/patients/form/patient-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PacientesService } from '../../../core/services/pacientes.service';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.css'
})
export class PatientFormComponent implements OnInit {
  paciente = { nombre: '', telefono: '', correo: '' };
  isEditing   = signal(false);
  loading     = signal(false);
  loadingPage = signal(false);
  errorMsg    = signal('');
  private patientId: string | null = null;

  constructor(
    private pacientesService: PacientesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('id');
    if (this.patientId) {
      this.isEditing.set(true);
      await this.loadPaciente(this.patientId);
    }
  }

  async loadPaciente(id: string) {
    this.loadingPage.set(true);
    try {
      const p = await this.pacientesService.getById(id);
      if (p) {
        this.paciente = { nombre: p.nombre, telefono: p.telefono, correo: p.correo || '' };
      }
    } catch {
      this.errorMsg.set('No se pudo cargar el paciente.');
    } finally {
      this.loadingPage.set(false);
    }
  }

  async onSubmit(form: NgForm) {
    if (form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      const data = {
        nombre:   this.paciente.nombre.trim(),
        telefono: this.paciente.telefono.trim(),
        correo:   this.paciente.correo?.trim() || undefined
      };

      if (this.isEditing() && this.patientId) {
        await this.pacientesService.update(this.patientId, data);
      } else {
        await this.pacientesService.create(data);
      }

      this.router.navigate(['/pacientes'], {
        queryParams: { success: this.isEditing() ? 'updated' : 'created' }
      });
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Error al guardar. Intenta nuevamente.');
      this.loading.set(false);
    }
  }
}