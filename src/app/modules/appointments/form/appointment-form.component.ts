// src/app/modules/appointments/form/appointment-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../core/services/citas.service';
import { PacientesService } from '../../../core/services/pacientes.service';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { Paciente } from '../../../core/models';
import { todayLocalDateString } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './appointment-form.component.html',
  styleUrl: './appointment-form.component.css'
})
export class AppointmentFormComponent implements OnInit {
  cita = {
    paciente_id: '',
    fecha: todayLocalDateString(),
    hora_inicio: '',
    duracion: 30 as 30 | 60,
    notas: ''
  };

  isEditing         = signal(false);
  loading           = signal(false);
  errorMsg          = signal('');
  showPacienteError = signal(false);
  googleConnected   = signal(false);

  pacienteSeleccionado = signal<Paciente | null>(null);
  resultadosBusqueda   = signal<Paciente[]>([]);
  busquedaPaciente = '';

  private citaId: string | null = null;
  private searchTimeout: any;

  fechaMinima      = todayLocalDateString();
  horasDisponibles = this.generarHoras();

  constructor(
    private citasService: CitasService,
    private pacientesService: PacientesService,
    private googleCalendarService: GoogleCalendarService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.googleConnected.set(
      await this.googleCalendarService.isGoogleConnected()
    );
    this.citaId = this.route.snapshot.paramMap.get('id');
    if (this.citaId) this.isEditing.set(true);
  }

  generarHoras() {
    const horas = [];
    for (let h = 7; h <= 20; h++) {
      for (const m of [0, 30]) {
        if (h === 20 && m === 30) break;
        const hora     = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const ampm     = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        horas.push({ value: hora, label: `${displayH}:${m.toString().padStart(2, '0')} ${ampm}` });
      }
    }
    return horas;
  }

  onBuscarPaciente(query: string) {
    clearTimeout(this.searchTimeout);
    if (!query.trim()) { this.resultadosBusqueda.set([]); return; }
    this.searchTimeout = setTimeout(async () => {
      try {
        this.resultadosBusqueda.set(await this.pacientesService.search(query));
      } catch (err) { console.error(err); }
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
    if (!this.cita.paciente_id) { this.showPacienteError.set(true); return; }
    if (form.invalid) return;

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.citasService.create({
        paciente_id: this.cita.paciente_id,
        fecha:       this.cita.fecha,
        hora_inicio: this.cita.hora_inicio,
        duracion:    this.cita.duracion,
        notas:       this.cita.notas || undefined
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