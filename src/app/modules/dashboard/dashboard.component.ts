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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('weekChart') weekChartRef!: ElementRef;

  loading        = signal(true);
  citasHoy       = signal<CitaConPaciente[]>([]);
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
    if (this.chartInstance) this.chartInstance.destroy();

    const ctx  = this.weekChartRef.nativeElement.getContext('2d');
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
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
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
    const hour   = parseInt(h);
    const ampm   = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  }
}