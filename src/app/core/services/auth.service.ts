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

  /** Carga el perfil del doctor desde la tabla doctores */
  private async loadDoctorProfile(userId: string) {
    try {
      const { data } = await this.supabase.client
        .from('doctores')
        .select('*')
        .eq('id', userId)
        .single();
      this.currentDoctor.set(data ?? null);
    } catch {
      this.currentDoctor.set(null);
    }
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.signIn(email, password);
    if (error) {
      return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }

    // Verificar que el usuario sea un doctor registrado
    const { data: doctor } = await this.supabase.client
      .from('doctores')
      .select('*')
      .eq('id', data.user?.id)
      .eq('activo', true)
      .single();

    if (!doctor) {
      await this.supabase.signOut();
      return { error: 'No tienes acceso al sistema. Contacta al administrador.' };
    }

    this.currentUser.set(data.user);
    this.currentDoctor.set(doctor);
    return { error: null };
  }

  async loginWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await this.supabase.signInWithGoogle();
    if (error) {
      return { error: 'No se pudo iniciar sesión con Google.' };
    }
    return { error: null };
  }

  async logout() {
    await this.supabase.signOut();
    this.currentUser.set(null);
    this.currentDoctor.set(null);
    this.router.navigate(['/login']);
  }

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