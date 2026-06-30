// src/app/modules/dashboard/dashboard.component.ts
import { Component, OnInit, signal, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { CitasService } from '../../core/services/citas.service';
import { PacientesService } from '../../core/services/pacientes.service';
import { CitaConPaciente } from '../../core/models';
import { todayLocalDateString } from '../../core/utils/date.utils';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, DatePipe],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p class="subtitle">{{ hoyFormateado }}</p>
        </div>
        <a routerLink="/citas/nueva" class="btn-primary">
          + Nueva cita
        </a>
      </div>

      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="stat-card skeleton"></div>
          }
        </div>
      } @else {
        <!-- Stats cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">📅</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats().totalCitasHoy }}</span>
              <span class="stat-label">Citas hoy</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📆</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats().totalCitasSemana }}</span>
              <span class="stat-label">Esta semana</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🗓️</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats().totalCitasMes }}</span>
              <span class="stat-label">Este mes</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">👥</span>
            <div class="stat-info">
              <span class="stat-value">{{ totalPacientes() }}</span>
              <span class="stat-label">Pacientes registrados</span>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <!-- Citas de hoy -->
          <div class="card">
            <div class="card-header">
              <h2>Agenda de hoy</h2>
              <a routerLink="/citas" class="card-link">Ver todas →</a>
            </div>
            @if (citasHoy().length === 0) {
              <div class="empty-state">
                <span>🗓️</span>
                <p>No hay citas programadas para hoy.</p>
                <a routerLink="/citas/nueva" class="btn-outline">Agendar cita</a>
              </div>
            } @else {
              <div class="citas-list">
                @for (cita of citasHoy(); track cita.id) {
                  <div class="cita-item">
                    <div class="cita-time">
                      <span class="hora">{{ formatHora(cita.hora_inicio) }}</span>
                      <span class="duracion">{{ cita.duracion }} min</span>
                    </div>
                    <div class="cita-info">
                      <span class="paciente-nombre">{{ cita.paciente!.nombre }}</span>
                      <span class="paciente-tel">📞 {{ cita.paciente!.telefono }}</span>
                    </div>
                    <button class="btn-cancel-sm" (click)="cancelarCita(cita.id!)">
                      Cancelar
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Gráfico semanal -->
          <div class="card">
            <div class="card-header">
              <h2>Citas por día (semana actual)</h2>
            </div>
            <div class="chart-container">
              <canvas #weekChart></canvas>
            </div>
          </div>

          <!-- Pacientes frecuentes -->
          <div class="card">
            <div class="card-header">
              <h2>Pacientes frecuentes (este mes)</h2>
            </div>
            @if (stats().pacientesFrecuentes.length === 0) {
              <div class="empty-state">
                <span>👤</span>
                <p>Sin datos suficientes este mes.</p>
              </div>
            } @else {
              <div class="frecuentes-list">
                @for (p of stats().pacientesFrecuentes; track p.nombre; let i = $index) {
                  <div class="frecuente-item">
                    <div class="frecuente-rank">{{ i + 1 }}</div>
                    <span class="frecuente-nombre">{{ p.nombre }}</span>
                    <span class="frecuente-count">{{ p.total }} cita{{ p.total !== 1 ? 's' : '' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; margin: 0 auto; }

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
      transition: background 0.15s;
    }
    .btn-primary:hover { background: #2563eb; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
    }

    .stat-icon { font-size: 2rem; }

    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #1e293b; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: #64748b; margin-top: 0.2rem; }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .skeleton {
      height: 80px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }

    @keyframes shimmer { to { background-position: -200% 0; } }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 768px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #f1f5f9;
    }

    .card:first-child { grid-column: 1 / -1; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-header h2 {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .card-link {
      font-size: 0.8rem;
      color: #3b82f6;
      text-decoration: none;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }

    .empty-state span { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
    .empty-state p { margin: 0 0 1rem; font-size: 0.9rem; }

    .btn-outline {
      display: inline-block;
      padding: 0.5rem 1rem;
      border: 1.5px solid #3b82f6;
      color: #3b82f6;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.85rem;
      transition: all 0.15s;
    }
    .btn-outline:hover { background: #3b82f6; color: white; }

    .citas-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .cita-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
    }

    .cita-time {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }

    .hora { font-weight: 700; font-size: 1rem; color: #1e293b; }
    .duracion { font-size: 0.75rem; color: #64748b; }

    .cita-info { flex: 1; display: flex; flex-direction: column; }
    .paciente-nombre { font-weight: 600; color: #1e293b; font-size: 0.9rem; }
    .paciente-tel { font-size: 0.8rem; color: #64748b; }

    .btn-cancel-sm {
      background: none;
      border: 1px solid #fca5a5;
      color: #dc2626;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel-sm:hover { background: #fef2f2; }

    .chart-container { height: 200px; position: relative; }

    .frecuentes-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .frecuente-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .frecuente-rank {
      width: 24px;
      height: 24px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .frecuente-nombre { flex: 1; font-size: 0.9rem; color: #1e293b; }
    .frecuente-count { font-size: 0.8rem; color: #64748b; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('weekChart') weekChartRef!: ElementRef;

  loading = signal(true);
  citasHoy = signal<CitaConPaciente[]>([]);
  totalPacientes = signal(0);
  stats = signal({
    totalCitasHoy: 0,
    totalCitasSemana: 0,
    totalCitasMes: 0,
    citasPorDia: [] as { dia: string; total: number }[],
    pacientesFrecuentes: [] as { nombre: string; total: number }[]
  });

  hoyFormateado = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  private chartInstance: any = null;

  constructor(
    private citasService: CitasService,
    private pacientesService: PacientesService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  ngAfterViewInit() {
    if (!this.loading()) {
      this.renderChart();
    }
  }

  async loadData() {
    this.loading.set(true);
    try {
      const hoy = todayLocalDateString();
      const [citas, statsData, pacientes] = await Promise.all([
        this.citasService.getCitasDelDia(hoy),
        this.citasService.getStatsForDashboard(),
        this.pacientesService.getAll()
      ]);

      this.citasHoy.set(citas);
      this.stats.set(statsData);
      this.totalPacientes.set(pacientes.length);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      this.loading.set(false);
      setTimeout(() => this.renderChart(), 100);
    }
  }

  renderChart() {
    if (!this.weekChartRef?.nativeElement) return;
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const ctx = this.weekChartRef.nativeElement.getContext('2d');
    const data = this.stats().citasPorDia;

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.dia),
        datasets: [{
          label: 'Citas',
          data: data.map(d => d.total),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: '#f1f5f9' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  async cancelarCita(id: string) {
    if (!confirm('¿Está seguro de cancelar esta cita?')) return;
    try {
      await this.citasService.cancelar(id);
      await this.loadData();
    } catch (err) {
      alert('Error al cancelar la cita. Intenta nuevamente.');
    }
  }

  formatHora(hora: string): string {
    const [h, m] = hora.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  }
}