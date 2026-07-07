// src/app/modules/doctors/form/doctor-form.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DoctoresService } from '../../../core/services/doctores.service';
import { Rol } from '../../../core/models';

@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './doctor-form.component.html',
  styleUrl: './doctor-form.component.css'
})
export class DoctorFormComponent implements OnInit {
  doctor = {
    nombre: '', correo: '', especialidad: '',
    telefono: '', rol: 'doctor' as Rol, foto_url: ''
  };
  password    = '';
  isEditing   = signal(false);
  loading     = signal(false);
  loadingPage = signal(false);
  errorMsg    = signal('');
  fotoPreview = signal<string | null>(null);
  fotoFile: File | null = null;
  private doctorId: string | null = null;

  readonly ESPECIALIDADES = [
    'Medicina General', 'Pediatría', 'Ginecología', 'Cardiología',
    'Dermatología', 'Neurología', 'Ortopedia', 'Oftalmología',
    'Odontología', 'Psiquiatría', 'Otra'
  ];

  constructor(
    private doctoresService: DoctoresService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.doctorId = this.route.snapshot.paramMap.get('id');
    if (this.doctorId) {
      this.isEditing.set(true);
      await this.loadDoctor(this.doctorId);
    }
  }

  async loadDoctor(id: string) {
    this.loadingPage.set(true);
    try {
      const d = await this.doctoresService.getById(id);
      if (d) {
        this.doctor = {
          nombre: d.nombre, correo: d.correo,
          especialidad: d.especialidad, telefono: d.telefono ?? '',
          rol: d.rol, foto_url: d.foto_url ?? ''
        };
        if (d.foto_url) this.fotoPreview.set(d.foto_url);
      }
    } catch {
      this.errorMsg.set('No se pudo cargar el doctor.');
    } finally {
      this.loadingPage.set(false);
    }
  }

  onFotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 2MB) y tipo
    if (file.size > 2 * 1024 * 1024) {
      this.errorMsg.set('La foto no debe superar 2MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.errorMsg.set('Selecciona un archivo de imagen válido.');
      return;
    }

    this.fotoFile = file;
    const reader  = new FileReader();
    reader.onload = () => this.fotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async onSubmit(form: NgForm) {
    if (form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      let fotoUrl = this.doctor.foto_url;

      if (this.isEditing() && this.doctorId) {
        // Subir foto si se cambió
        if (this.fotoFile) {
          fotoUrl = await this.doctoresService.subirFoto(this.doctorId, this.fotoFile);
        }
        await this.doctoresService.actualizar(this.doctorId, {
          nombre:       this.doctor.nombre,
          especialidad: this.doctor.especialidad,
          telefono:     this.doctor.telefono || undefined,
          rol:          this.doctor.rol,
          foto_url:     fotoUrl || undefined
        });
      } else {
        // Crear nuevo doctor
        const nuevo = await this.doctoresService.crear({
          nombre:       this.doctor.nombre,
          correo:       this.doctor.correo,
          especialidad: this.doctor.especialidad,
          telefono:     this.doctor.telefono || undefined,
          rol:          this.doctor.rol
        }, this.password);

        // Subir foto si se seleccionó
        if (this.fotoFile && nuevo.id) {
          fotoUrl = await this.doctoresService.subirFoto(nuevo.id, this.fotoFile);
          await this.doctoresService.actualizar(nuevo.id, { foto_url: fotoUrl });
        }
      }

      this.router.navigate(['/doctores']);
    } catch (err: any) {
      this.errorMsg.set(err.message || 'Error al guardar. Intenta nuevamente.');
      this.loading.set(false);
    }
  }
}