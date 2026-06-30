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
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/pacientes" class="back-link">← Volver a pacientes</a>
        <h1>{{ isEditing() ? 'Editar paciente' : 'Nuevo paciente' }}</h1>
      </div>

      <div class="form-card">
        @if (loadingPage()) {
          <div class="form-loading">Cargando...</div>
        } @else {
          <form #form="ngForm" (ngSubmit)="onSubmit(form)">
            <div class="form-group">
              <label for="nombre">Nombre completo *</label>
              <input
                id="nombre"
                type="text"
                [(ngModel)]="paciente.nombre"
                name="nombre"
                required
                minlength="2"
                placeholder="Ej: María García López"
                #nombreCtrl="ngModel"
                [class.input-error]="nombreCtrl.invalid && nombreCtrl.touched"
              />
              @if (nombreCtrl.invalid && nombreCtrl.touched) {
                <span class="error-msg">El nombre es requerido (mínimo 2 caracteres).</span>
              }
            </div>

            <div class="form-group">
              <label for="telefono">Teléfono *</label>
              <input
                id="telefono"
                type="tel"
                [(ngModel)]="paciente.telefono"
                name="telefono"
                required
                minlength="10"
                pattern="[0-9]{10,15}"
                placeholder="Ej: 4611234567"
                #telCtrl="ngModel"
                [class.input-error]="telCtrl.invalid && telCtrl.touched"
              />
              @if (telCtrl.invalid && telCtrl.touched) {
                <span class="error-msg">El teléfono debe tener al menos 10 dígitos.</span>
              }
            </div>

            <div class="form-group">
              <label for="correo">Correo electrónico (opcional)</label>
              <input
                id="correo"
                type="email"
                [(ngModel)]="paciente.correo"
                name="correo"
                placeholder="correo@ejemplo.com"
                #correoCtrl="ngModel"
                [class.input-error]="correoCtrl.invalid && correoCtrl.touched"
              />
              @if (correoCtrl.invalid && correoCtrl.touched) {
                <span class="error-msg">Ingresa un correo válido.</span>
              }
            </div>

            @if (errorMsg()) {
              <div class="alert alert-error">⚠️ {{ errorMsg() }}</div>
            }

            <div class="form-actions">
              <a routerLink="/pacientes" class="btn-cancel">Cancelar</a>
              <button type="submit" class="btn-submit"
                [disabled]="loading() || form.invalid">
                @if (loading()) {
                  <span class="spinner"></span> Guardando...
                } @else {
                  {{ isEditing() ? 'Guardar cambios' : 'Registrar paciente' }}
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 560px; margin: 0 auto; }

    .page-header { margin-bottom: 1.5rem; }

    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 0.875rem;
      display: block;
      margin-bottom: 0.75rem;
    }
    .back-link:hover { color: #3b82f6; }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
    }

    .form-loading {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }

    .form-group { margin-bottom: 1.25rem; }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.4rem;
    }

    input, select {
      width: 100%;
      padding: 0.65rem 0.9rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      color: #1e293b;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }

    .input-error { border-color: #ef4444 !important; }
    .error-msg { font-size: 0.8rem; color: #dc2626; margin-top: 0.3rem; display: block; }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      padding: 0.65rem 1.25rem;
      border: 1.5px solid #e2e8f0;
      color: #64748b;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.15s;
    }
    .btn-cancel:hover { background: #f8fafc; }

    .btn-submit {
      padding: 0.65rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-submit:hover:not(:disabled) { background: #2563eb; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PatientFormComponent implements OnInit {
  paciente = { nombre: '', telefono: '', correo: '' };
  isEditing = signal(false);
  loading = signal(false);
  loadingPage = signal(false);
  errorMsg = signal('');
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
    } catch (err) {
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
        nombre: this.paciente.nombre.trim(),
        telefono: this.paciente.telefono.trim(),
        correo: this.paciente.correo?.trim() || undefined
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