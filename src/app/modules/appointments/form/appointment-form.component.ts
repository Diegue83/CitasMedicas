// src/app/modules/appointments/form/appointment-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { PacientesService } from '../../../core/services/pacientes.service';
import { Paciente } from '../../../core/models';
import { todayLocalDateString } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/citas" class="back-link">← Volver a citas</a>
        <h1>{{ isEditing() ? 'Editar cita' : 'Agendar nueva cita' }}</h1>
      </div>

      <div class="form-card">
        <form #form="ngForm" (ngSubmit)="onSubmit(form)">

          <!-- Selección de paciente -->
          <div class="form-group">
            <label>Paciente *</label>
            <div class="patient-search">
              <input
                type="text"
                [(ngModel)]="busquedaPaciente"
                (ngModelChange)="onBuscarPaciente($event)"
                name="busqueda"
                placeholder="Buscar paciente por nombre..."
                autocomplete="off"
                [disabled]="!!cita.paciente_id"
              />
              @if (cita.paciente_id) {
                <div class="selected-patient">
                  <div class="avatar-sm">{{ pacienteSeleccionado()?.nombre?.charAt(0) }}</div>
                  <span>{{ pacienteSeleccionado()?.nombre }}</span>
                  <button type="button" (click)="deseleccionarPaciente()" class="clear-patient">✕</button>
                </div>
              }
              @if (resultadosBusqueda().length > 0 && !cita.paciente_id) {
                <div class="search-results">
                  @for (p of resultadosBusqueda(); track p.id) {
                    <div class="search-result-item" (click)="seleccionarPaciente(p)">
                      <div class="avatar-sm">{{ p.nombre.charAt(0) }}</div>
                      <div>
                        <p class="result-nombre">{{ p.nombre }}</p>
                        <p class="result-tel">{{ p.telefono }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
            @if (showPacienteError()) {
              <span class="error-msg">Selecciona un paciente de la lista.</span>
            }
            <div class="new-patient-hint">
              ¿Paciente nuevo?
              <a routerLink="/pacientes/nuevo" class="link">Registrar aquí →</a>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="fecha">Fecha *</label>
              <input
                id="fecha"
                type="date"
                [(ngModel)]="cita.fecha"
                name="fecha"
                required
                [min]="fechaMinima"
                #fechaCtrl="ngModel"
                [class.input-error]="fechaCtrl.invalid && fechaCtrl.touched"
              />
              @if (fechaCtrl.invalid && fechaCtrl.touched) {
                <span class="error-msg">La fecha es requerida.</span>
              }
            </div>

            <div class="form-group">
              <label for="hora">Hora de inicio *</label>
              <select
                id="hora"
                [(ngModel)]="cita.hora_inicio"
                name="hora_inicio"
                required
                #horaCtrl="ngModel"
                [class.input-error]="horaCtrl.invalid && horaCtrl.touched"
              >
                <option value="">Seleccionar hora</option>
                @for (hora of horasDisponibles; track hora.value) {
                  <option [value]="hora.value">{{ hora.label }}</option>
                }
              </select>
              @if (horaCtrl.invalid && horaCtrl.touched) {
                <span class="error-msg">Selecciona una hora.</span>
              }
            </div>
          </div>

          <div class="form-group">
            <label>Duración *</label>
            <div class="duracion-btns">
              <button type="button"
                [class.selected]="cita.duracion === 30"
                (click)="cita.duracion = 30"
                class="duracion-btn">
                30 minutos
              </button>
              <button type="button"
                [class.selected]="cita.duracion === 60"
                (click)="cita.duracion = 60"
                class="duracion-btn">
                60 minutos
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="notas">Notas (opcional)</label>
            <textarea
              id="notas"
              [(ngModel)]="cita.notas"
              name="notas"
              placeholder="Motivo de consulta, observaciones..."
              rows="3"
            ></textarea>
          </div>

          @if (errorMsg()) {
            <div class="alert alert-error">⚠️ {{ errorMsg() }}</div>
          }

          <div class="form-actions">
            <a routerLink="/citas" class="btn-cancel">Cancelar</a>
            <button type="submit" class="btn-submit"
              [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Guardando...
              } @else {
                {{ isEditing() ? 'Guardar cambios' : 'Agendar cita' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 0 auto; }

    .page-header { margin-bottom: 1.5rem; }
    .back-link {
      color: #64748b;
      text-decoration: none;
      font-size: 0.875rem;
      display: block;
      margin-bottom: 0.75rem;
    }
    .back-link:hover { color: #3b82f6; }

    h1 { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin: 0; }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
    }

    .form-group { margin-bottom: 1.25rem; }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.4rem;
    }

    input[type="text"],
    input[type="date"],
    select,
    textarea {
      width: 100%;
      padding: 0.65rem 0.9rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      color: #1e293b;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }

    textarea { resize: vertical; min-height: 80px; }
    .input-error { border-color: #ef4444 !important; }
    .error-msg { font-size: 0.8rem; color: #dc2626; margin-top: 0.3rem; display: block; }

    .patient-search { position: relative; }

    .selected-patient {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 8px;
      margin-top: 0.4rem;
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .clear-patient {
      margin-left: auto;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .search-results {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
    }

    .search-result-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      cursor: pointer;
      transition: background 0.1s;
    }
    .search-result-item:hover { background: #f8fafc; }

    .result-nombre { font-weight: 500; font-size: 0.9rem; color: #1e293b; margin: 0; }
    .result-tel { font-size: 0.8rem; color: #64748b; margin: 0.1rem 0 0; }

    .new-patient-hint {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.5rem;
    }

    .link { color: #3b82f6; text-decoration: none; }
    .link:hover { text-decoration: underline; }

    .duracion-btns { display: flex; gap: 0.75rem; }

    .duracion-btn {
      flex: 1;
      padding: 0.65rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      color: #374151;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .duracion-btn.selected {
      border-color: #3b82f6;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 500;
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

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
export class AppointmentFormComponent implements OnInit {
  cita = {
    paciente_id: '',
    fecha: todayLocalDateString(),
    hora_inicio: '',
    duracion: 30 as 30 | 60,
    notas: ''
  };

  isEditing = signal(false);
  loading = signal(false);
  errorMsg = signal('');
  showPacienteError = signal(false);

  pacienteSeleccionado = signal<Paciente | null>(null);
  resultadosBusqueda = signal<Paciente[]>([]);
  busquedaPaciente = '';
  private citaId: string | null = null;
  private searchTimeout: any;

  fechaMinima = todayLocalDateString();

  horasDisponibles = this.generarHoras();

  constructor(
    private citasService: CitasService,
    private pacientesService: PacientesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.citaId = this.route.snapshot.paramMap.get('id');
    if (this.citaId) {
      this.isEditing.set(true);
      // Cargar cita existente si fuera necesario
    }
  }

  generarHoras() {
    const horas = [];
    for (let h = 7; h <= 20; h++) {
      for (const m of [0, 30]) {
        if (h === 20 && m === 30) break;
        const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const label = `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
        horas.push({ value: hora, label });
      }
    }
    return horas;
  }

  onBuscarPaciente(query: string) {
    clearTimeout(this.searchTimeout);
    if (!query.trim()) {
      this.resultadosBusqueda.set([]);
      return;
    }
    this.searchTimeout = setTimeout(async () => {
      try {
        const resultados = await this.pacientesService.search(query);
        this.resultadosBusqueda.set(resultados);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  }

  seleccionarPaciente(paciente: Paciente) {
    this.pacienteSeleccionado.set(paciente);
    this.cita.paciente_id = paciente.id!;
    this.busquedaPaciente = paciente.nombre;
    this.resultadosBusqueda.set([]);
    this.showPacienteError.set(false);
  }

  deseleccionarPaciente() {
    this.pacienteSeleccionado.set(null);
    this.cita.paciente_id = '';
    this.busquedaPaciente = '';
  }

  async onSubmit(form: NgForm) {
    if (!this.cita.paciente_id) {
      this.showPacienteError.set(true);
      return;
    }
    if (form.invalid) return;

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.citasService.create({
        paciente_id: this.cita.paciente_id,
        fecha: this.cita.fecha,
        hora_inicio: this.cita.hora_inicio,
        duracion: this.cita.duracion,
        notas: this.cita.notas || undefined
      });

      this.router.navigate(['/citas'], {
        queryParams: { fecha: this.cita.fecha, success: 'created' }
      });
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Error al agendar. Intenta nuevamente.');
      this.loading.set(false);
    }
  }
}