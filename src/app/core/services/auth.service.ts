// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Doctor, Rol } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser   = signal<User | null>(null);
  currentDoctor = signal<Doctor | null>(null);
  loading       = signal(true);

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuthState();
  }

  private async initAuthState() {
    const session = await this.supabase.getSession();
    this.currentUser.set(session?.user ?? null);

    if (session?.user) {
      await this.loadDoctorProfile(session.user.id);
    }
    this.loading.set(false);

    this.supabase.onAuthStateChange(async (event, session) => {
      this.currentUser.set(session?.user ?? null);
      if (session?.user) {
        await this.loadDoctorProfile(session.user.id);
      } else {
        this.currentDoctor.set(null);
      }
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Carga el perfil del doctor.
   * Si el usuario NO está en la tabla doctores como activo,
   * cierra la sesión automáticamente — esto bloquea pacientes
   * y cualquier otro usuario que no sea doctor registrado.
   */
  private async loadDoctorProfile(userId: string) {
    try {
      // maybeSingle() devuelve null sin error cuando no hay filas
      // single() devuelve error 406 cuando no hay filas — eso causaba
      // el cierre de sesión inmediato al entrar con Google
      const { data, error } = await this.supabase.client
        .from('doctores')
        .select('*')
        .eq('id', userId)
        .eq('activo', true)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error al cargar perfil:', error.message);
        this.currentDoctor.set(null);
        return;
      }

      this.currentDoctor.set(data ?? null);

      if (!data) {
        console.warn('[Auth] Usuario no es doctor activo — cerrando sesión.');
        await this.supabase.signOut();
        this.currentUser.set(null);
        this.router.navigate(['/login']);
      }
    } catch (err) {
      console.error('[Auth] Error inesperado:', err);
      this.currentDoctor.set(null);
    }
  }

  // ─── Login con email/password ────────────────────────────────

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.signIn(email, password);
    if (error) {
      return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    // Verificar que sea doctor activo
    const { data: doctor } = await this.supabase.client
      .from('doctores')
      .select('*')
      .eq('id', data.user?.id)
      .eq('activo', true)
      .maybeSingle();

    if (!doctor) {
      await this.supabase.signOut();
      return { error: 'Acceso denegado. Solo los doctores registrados pueden ingresar al sistema.' };
    }

    this.currentUser.set(data.user);
    this.currentDoctor.set(doctor);
    return { error: null };
  }

  // ─── Login con Google ────────────────────────────────────────

  /**
   * Inicia el flujo OAuth con Google.
   * La verificación de que sea doctor se hace en loadDoctorProfile()
   * cuando Supabase dispara el evento SIGNED_IN tras el redirect.
   */
  async loginWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await this.supabase.signInWithGoogle();
    if (error) {
      return { error: 'No se pudo iniciar sesión con Google.' };
    }
    return { error: null };
  }

  // ─── Logout ──────────────────────────────────────────────────

  async logout() {
    await this.supabase.signOut();
    this.currentUser.set(null);
    this.currentDoctor.set(null);
    this.router.navigate(['/login']);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  isAdmin(): boolean {
    return this.currentDoctor()?.rol === 'admin';
  }

  isDoctor(): boolean {
    return this.currentDoctor()?.rol === 'doctor';
  }

  get rol(): Rol | null {
    return this.currentDoctor()?.rol ?? null;
  }

  get userId(): string | undefined {
    return this.currentUser()?.id;
  }

  get doctorNombre(): string {
    return this.currentDoctor()?.nombre ?? '';
  }
}