// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  loading = signal(true);

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initAuthState();
  }

  private async initAuthState() {
    const session = await this.supabase.getSession();
    this.currentUser.set(session?.user ?? null);
    this.loading.set(false);

    this.supabase.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.signIn(email, password);
    if (error) {
      return { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
    }
    this.currentUser.set(data.user);
    return { error: null };
  }

  /**
   * Inicia sesión con Google vía OAuth de Supabase.
   * Redirige al usuario a Google y de regreso a /dashboard tras autenticarse.
   * Requiere habilitar el proveedor Google en Supabase
   * (Authentication -> Providers -> Google).
   */
  async loginWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await this.supabase.signInWithGoogle();
    if (error) {
      return { error: 'No se pudo iniciar sesión con Google. Intenta de nuevo.' };
    }
    // Supabase redirige automáticamente a Google; no hay nada más que hacer aquí.
    return { error: null };
  }

  async logout() {
    await this.supabase.signOut();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  get userId(): string | undefined {
    return this.currentUser()?.id;
  }
}