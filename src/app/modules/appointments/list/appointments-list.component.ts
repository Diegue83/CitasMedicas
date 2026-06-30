// src/app/modules/appointments/list/appointments-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { CitaConPaciente } from '../../../core/models';
import { toLocalDateString, todayLocalDateString } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Citas</h1>
          <p class="subtitle">Agenda y gestión de citas</p>
        </div>
        <a routerLink="/citas/nueva" class="btn-primary">+ Agendar cita</a>
      </div>

      <!-- Filtro de fecha -->
      <div class="filters">
        <div class="date-filter">
          <button (click)="cambiarDia(-1)" class="nav-btn">‹</button>
          <input
            type="date"
            [(ngModel)]="fechaSeleccionada"
            (ngModelChange)="onFechaChange($event)"
            class="date-input"
          />
          <button (click)="cambiarDia(1)" class="nav-btn">›</button>
          <button (click)="irAHoy()" class="btn-hoy">Hoy</button>
        </div>

        <div class="vista-badges">
          <span class="badge-info">{{ citas().length }} cita{{ citas().length !== 1 ? 's' : '' }} este día</span>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-list">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (citas().length === 0) {
        <div class="empty-state">
          <span>📅</span>
          <p>No hay citas programadas para este día.</p>
          <a routerLink="/citas/nueva" class="btn-outline">Agendar cita</a>
        </div>
      } @else {
        <div class="citas-grid">
          @for (cita of citas(); track cita.id) {
            <div class="cita-card">
              <div class="cita-card-time">
                <span class="hora-grande">{{ formatHora(cita.hora_inicio) }}</span>
                <span class="duracion-badge">{{ cita.duracion }} min</span>
                <span class="hora-fin">hasta {{ horaFin(cita.hora_inicio, cita.duracion) }}</span>
              </div>

              <div class="cita-card-body">
                <div class="paciente-header">
                  <div class="avatar">{{ cita.paciente!.nombre.charAt(0).toUpperCase() }}</div>
                  <div>
                    <p class="paciente-nombre">{{ cita.paciente!.nombre }}</p>
                    <p class="paciente-tel">📞 {{ cita.paciente!.telefono }}</p>
                  </div>
                </div>
                @if (cita.notas) {
                  <p class="notas">📝 {{ cita.notas }}</p>
                }
              </div>

              <div class="cita-card-actions">
                <a [routerLink]="['/citas', cita.id, 'editar']" class="btn-edit">
                  ✏️ Editar
                </a>
                <button (click)="cancelarCita(cita)" class="btn-cancel">
                  🚫 Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (successMsg()) {
        <div class="toast toast-success">✅ {{ successMsg() }}</div>
      }
      @if (errorMsg()) {
        <div class="toast toast-error">⚠️ {{ errorMsg() }}</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.25rem;
    }
    .subtitle { color: #64748b; margin: 0; font-size: 0.9rem; }

    .btn-primary {
      background: #3b82f6;
      color: white;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .btn-primary:hover { background: #2563eb; }

    .filters {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .date-filter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-btn:hover { background: #f8fafc; }

    .date-input {
      padding: 0.5rem 0.75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #1e293b;
    }
    .date-input:focus { outline: none; border-color: #3b82f6; }

    .btn-hoy {
      padding: 0.5rem 0.85rem;
      background: #f1f5f9;
      border: 1.5px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      color: #374151;
    }
    .btn-hoy:hover { background: #e2e8f0; }

    .badge-info {
      background: #dbeafe;
      color: #1d4ed8;
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .loading-list { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-card {
      height: 100px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
    }
    .empty-state span { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
    .empty-state p { margin: 0 0 1rem; }

    .btn-outline {
      display: inline-block;
      padding: 0.5rem 1.25rem;
      border: 1.5px solid #3b82f6;
      color: #3b82f6;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.875rem;
    }
    .btn-outline:hover { background: #3b82f6; color: white; }

    .citas-grid { display: flex; flex-direction: column; gap: 1rem; }

    .cita-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
      border-left: 4px solid #3b82f6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      display: grid;
      grid-template-columns: 120px 1fr auto;
      overflow: hidden;
    }

    .cita-card-time {
      background: #eff6ff;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    .hora-grande { font-size: 1.1rem; font-weight: 700; color: #1d4ed8; }
    .duracion-badge {
      background: #3b82f6;
      color: white;
      padding: 0.15rem 0.5rem;
      border-radius: 20px;
      font-size: 0.75rem;
    }
    .hora-fin { font-size: 0.75rem; color: #64748b; }

    .cita-card-body {
      padding: 1rem;
    }

    .paciente-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 36px;
      height: 36px;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .paciente-nombre { font-weight: 600; color: #1e293b; margin: 0; font-size: 0.95rem; }
    .paciente-tel { color: #64748b; margin: 0.15rem 0 0; font-size: 0.8rem; }
    .notas { font-size: 0.85rem; color: #64748b; margin: 0.5rem 0 0; font-style: italic; }

    .cita-card-actions {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.75rem;
      justify-content: center;
    }

    .btn-edit {
      padding: 0.35rem 0.75rem;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.8rem;
      white-space: nowrap;
    }
    .btn-edit:hover { background: #dbeafe; }

    .btn-cancel {
      padding: 0.35rem 0.75rem;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 6px;
      background: none;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-cancel:hover { background: #fef2f2; }

    .toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      z-index: 1000;
    }
    .toast-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .toast-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  `]
})
export class AppointmentsListComponent implements OnInit {
  citas = signal<CitaConPaciente[]>([]);
  loading = signal(true);
  successMsg = signal('');
  errorMsg = signal('');
  fechaSeleccionada = todayLocalDateString();

  constructor(private citasService: CitasService) {}

  async ngOnInit() {
    await this.loadCitas();
  }

  async loadCitas() {
    this.loading.set(true);
    try {
      const data = await this.citasService.getCitasDelDia(this.fechaSeleccionada);
      this.citas.set(data);
    } catch (err) {
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