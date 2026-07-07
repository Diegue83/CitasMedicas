// src/app/modules/profile/profile.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DoctoresService } from '../../core/services/doctores.service';
import { CitasService } from '../../core/services/citas.service';
import { PacientesService } from '../../core/services/pacientes.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Doctor, Rol } from '../../core/models';

type Tab = 'info' | 'doctores' | 'seguridad';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  activeTab = signal<Tab>('info');
  isAdmin   = signal(false);

  // ── Info personal ──────────────────────────────────────────
  perfil = {
    nombre: '', especialidad: '', telefono: '', foto_url: ''
  };
  fotoPreview  = signal<string | null>(null);
  fotoFile: File | null = null;
  loadingInfo  = signal(false);
  successInfo  = signal('');
  errorInfo    = signal('');

  // ── Estadísticas ───────────────────────────────────────────
  stats = signal({ totalCitas: 0, totalPacientes: 0, citasMes: 0, confirmadas: 0 });
  loadingStats = signal(true);

  // ── Gestión de doctores (admin) ────────────────────────────
  doctores       = signal<Doctor[]>([]);
  loadingDoctores = signal(false);
  showDoctorForm  = signal(false);
  editingDoctor   = signal<Doctor | null>(null);
  doctorForm = {
    nombre: '', correo: '', especialidad: '',
    telefono: '', rol: 'doctor' as Rol, password: ''
  };
  loadingDoctorSave = signal(false);
  errorDoctores     = signal('');
  successDoctores   = signal('');

  // ── Seguridad ──────────────────────────────────────────────
  passwordForm = { nueva: '', confirmar: '' };
  loadingPass  = signal(false);
  successPass  = signal('');
  errorPass    = signal('');
  showNueva    = false;
  showConfirm  = false;

  readonly ESPECIALIDADES = [
    'Medicina General','Pediatría','Ginecología','Cardiología',
    'Dermatología','Neurología','Ortopedia','Oftalmología',
    'Odontología','Psiquiatría','Otra'
  ];

  constructor(
    public auth: AuthService,
    private doctoresService: DoctoresService,
    private citasService: CitasService,
    private pacientesService: PacientesService,
    private supabase: SupabaseService
  ) {}

  async ngOnInit() {
    this.isAdmin.set(this.auth.isAdmin());
    this.loadPerfilActual();
    await this.loadStats();
    if (this.isAdmin()) await this.loadDoctores();
  }

  // ── Tab navigation ──────────────────────────────────────────

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  private clearMessages() {
    this.successInfo.set(''); this.errorInfo.set('');
    this.successDoctores.set(''); this.errorDoctores.set('');
    this.successPass.set(''); this.errorPass.set('');
  }

  // ── Info personal ───────────────────────────────────────────

  loadPerfilActual() {
    const d = this.auth.currentDoctor();
    if (!d) return;
    this.perfil = {
      nombre:       d.nombre,
      especialidad: d.especialidad,
      telefono:     d.telefono ?? '',
      foto_url:     d.foto_url ?? ''
    };
    if (d.foto_url) this.fotoPreview.set(d.foto_url);
  }

  onFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.errorInfo.set('La foto no debe superar 2MB.'); return; }
    if (!file.type.startsWith('image/')) { this.errorInfo.set('Selecciona una imagen válida.'); return; }
    this.fotoFile = file;
    const reader  = new FileReader();
    reader.onload = () => this.fotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async guardarInfo(form: NgForm) {
    if (form.invalid) return;
    this.loadingInfo.set(true);
    this.errorInfo.set('');
    try {
      const id = this.auth.userId!;
      let fotoUrl = this.perfil.foto_url;

      if (this.fotoFile) {
        fotoUrl = await this.doctoresService.subirFoto(id, this.fotoFile);
      }

      await this.doctoresService.actualizar(id, {
        nombre:       this.perfil.nombre,
        especialidad: this.perfil.especialidad,
        telefono:     this.perfil.telefono || undefined,
        foto_url:     fotoUrl || undefined
      });

      // Recargar perfil en AuthService
      await (this.auth as any).loadDoctorProfile(id);

      this.showSuccess(this.successInfo, 'Perfil actualizado correctamente.');
    } catch (err: any) {
      this.errorInfo.set(err.message || 'Error al guardar.');
    } finally {
      this.loadingInfo.set(false);
    }
  }

  // ── Estadísticas ────────────────────────────────────────────

  async loadStats() {
    this.loadingStats.set(true);
    try {
      const [citesMes, citasSemana, pacientes] = await Promise.all([
        this.citasService.getCitasMes(),
        this.citasService.getCitasSemana(),
        this.pacientesService.getAll()
      ]);
      const confirmadas = citesMes.filter(c => c.estado === 'confirmada').length;
      this.stats.set({
        totalCitas:      citesMes.length,
        totalPacientes:  pacientes.length,
        citasMes:        citesMes.length,
        confirmadas
      });
    } catch {
      // silencioso
    } finally {
      this.loadingStats.set(false);
    }
  }

  // ── Gestión de doctores ─────────────────────────────────────

  async loadDoctores() {
    this.loadingDoctores.set(true);
    try {
      this.doctores.set(await this.doctoresService.getAll());
    } catch (err: any) {
      this.errorDoctores.set('Error al cargar doctores.');
    } finally {
      this.loadingDoctores.set(false);
    }
  }

  abrirFormNuevo() {
    this.editingDoctor.set(null);
    this.doctorForm = { nombre: '', correo: '', especialidad: '', telefono: '', rol: 'doctor', password: '' };
    this.showDoctorForm.set(true);
  }

  abrirFormEditar(doctor: Doctor) {
    this.editingDoctor.set(doctor);
    this.doctorForm = {
      nombre:       doctor.nombre,
      correo:       doctor.correo,
      especialidad: doctor.especialidad,
      telefono:     doctor.telefono ?? '',
      rol:          doctor.rol,
      password:     ''
    };
    this.showDoctorForm.set(true);
  }

  cerrarForm() {
    this.showDoctorForm.set(false);
    this.editingDoctor.set(null);
    this.errorDoctores.set('');
  }

  async guardarDoctor(form: NgForm) {
    if (form.invalid) return;
    this.loadingDoctorSave.set(true);
    this.errorDoctores.set('');
    try {
      const editing = this.editingDoctor();
      if (editing) {
        await this.doctoresService.actualizar(editing.id!, {
          nombre:       this.doctorForm.nombre,
          especialidad: this.doctorForm.especialidad,
          telefono:     this.doctorForm.telefono || undefined,
          rol:          this.doctorForm.rol
        });
        this.showSuccess(this.successDoctores, `Dr. ${this.doctorForm.nombre} actualizado.`);
      } else {
        await this.doctoresService.crear({
          nombre:       this.doctorForm.nombre,
          correo:       this.doctorForm.correo,
          especialidad: this.doctorForm.especialidad,
          telefono:     this.doctorForm.telefono || undefined,
          rol:          this.doctorForm.rol
        }, this.doctorForm.password);
        this.showSuccess(this.successDoctores, `Dr. ${this.doctorForm.nombre} registrado. Se envió correo de confirmación.`);
      }
      this.cerrarForm();
      await this.loadDoctores();
    } catch (err: any) {
      this.errorDoctores.set(err.message || 'Error al guardar doctor.');
    } finally {
      this.loadingDoctorSave.set(false);
    }
  }

  async toggleActivo(doctor: Doctor) {
    const accion = doctor.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿${accion} al Dr. ${doctor.nombre}?`)) return;
    try {
      await this.doctoresService.toggleActivo(doctor.id!, !doctor.activo);
      this.showSuccess(this.successDoctores, `Doctor ${accion === 'activar' ? 'activado' : 'desactivado'}.`);
      await this.loadDoctores();
    } catch (err: any) {
      this.errorDoctores.set(err.message || 'Error al actualizar.');
    }
  }

  // ── Seguridad ────────────────────────────────────────────────

  async cambiarPassword(form: NgForm) {
    if (form.invalid) return;
    if (this.passwordForm.nueva !== this.passwordForm.confirmar) {
      this.errorPass.set('Las contraseñas no coinciden.');
      return;
    }
    if (this.passwordForm.nueva.length < 8) {
      this.errorPass.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    this.loadingPass.set(true);
    this.errorPass.set('');
    try {
      const { error } = await this.supabase.client.auth.updateUser({
        password: this.passwordForm.nueva
      });
      if (error) throw error;
      this.passwordForm = { nueva: '', confirmar: '' };
      form.resetForm();
      this.showSuccess(this.successPass, 'Contraseña actualizada correctamente.');
    } catch (err: any) {
      this.errorPass.set(err.message || 'Error al cambiar contraseña.');
    } finally {
      this.loadingPass.set(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  rolLabel(rol: string): string {
    return rol === 'admin' ? '⭐ Admin' : '🩺 Doctor';
  }

  get doctorInicial(): string {
    return this.auth.currentDoctor()?.nombre?.charAt(0).toUpperCase() ?? '?';
  }

  get doctorEmail(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  private showSuccess(sig: ReturnType<typeof signal<string>>, msg: string) {
    sig.set(msg);
    setTimeout(() => sig.set(''), 4000);
  }
}