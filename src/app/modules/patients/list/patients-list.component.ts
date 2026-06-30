// src/app/modules/patients/list/patients-list.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PacientesService } from '../../../core/services/pacientes.service';
import { Paciente } from '../../../core/models';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Pacientes</h1>
          <p class="subtitle">{{ pacientes().length }} pacientes registrados</p>
        </div>
        <a routerLink="/pacientes/nuevo" class="btn-primary">+ Nuevo paciente</a>
      </div>

      <!-- Búsqueda -->
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch($event)"
          placeholder="Buscar por nombre..."
          class="search-input"
        />
        @if (searchQuery) {
          <button (click)="clearSearch()" class="clear-btn">✕</button>
        }
      </div>

      @if (loading()) {
        <div class="loading-list">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton-row"></div>
          }
        </div>
      } @else if (pacientesFiltrados().length === 0) {
        <div class="empty-state">
          <span>👤</span>
          @if (searchQuery) {
            <p>No se encontraron pacientes con "{{ searchQuery }}".</p>
            <button (click)="clearSearch()" class="btn-outline">Limpiar búsqueda</button>
          } @else {
            <p>Aún no tienes pacientes registrados.</p>
            <a routerLink="/pacientes/nuevo" class="btn-outline">Registrar primer paciente</a>
          }
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Fecha registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of pacientesFiltrados(); track p.id) {
                <tr>
                  <td>
                    <div class="patient-name">
                      <div class="avatar">{{ p.nombre.charAt(0).toUpperCase() }}</div>
                      {{ p.nombre }}
                    </div>
                  </td>
                  <td>{{ p.telefono }}</td>
                  <td>{{ p.correo || '—' }}</td>
                  <td>{{ p.created_at | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <div class="action-btns">
                      <a [routerLink]="['/pacientes', p.id, 'editar']" class="btn-edit">
                        ✏️ Editar
                      </a>
                      <button (click)="deletePaciente(p)" class="btn-delete">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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
    .page { max-width: 1000px; margin: 0 auto; }

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

    .search-bar {
      position: relative;
      margin-bottom: 1.25rem;
    }

    .search-icon {
      position: absolute;
      left: 0.9rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 2.5rem 0.65rem 2.5rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .clear-btn {
      position: absolute;
      right: 0.9rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
    }

    .loading-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-row {
      height: 52px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
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
      cursor: pointer;
      background: none;
    }
    .btn-outline:hover { background: #3b82f6; color: white; }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead { background: #f8fafc; }
    .data-table th {
      text-align: left;
      padding: 0.85rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-table td {
      padding: 0.9rem 1rem;
      font-size: 0.9rem;
      color: #374151;
      border-top: 1px solid #f1f5f9;
    }

    .data-table tr:hover td { background: #f8fafc; }

    .patient-name {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }

    .avatar {
      width: 32px;
      height: 32px;
      background: #dbeafe;
      color: #1d4ed8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .action-btns { display: flex; gap: 0.5rem; }

    .btn-edit {
      padding: 0.3rem 0.65rem;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.8rem;
      transition: all 0.15s;
    }
    .btn-edit:hover { background: #dbeafe; }

    .btn-delete {
      padding: 0.3rem 0.65rem;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 6px;
      background: none;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-delete:hover { background: #fef2f2; }

    .toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }
    .toast-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .toast-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } }
  `]
})
export class PatientsListComponent implements OnInit {
  pacientes = signal<Paciente[]>([]);
  pacientesFiltrados = signal<Paciente[]>([]);
  loading = signal(true);
  successMsg = signal('');
  errorMsg = signal('');
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
    } catch (err) {
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
          p.nombre.toLowerCase().includes(q) ||
          p.telefono.includes(q)
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