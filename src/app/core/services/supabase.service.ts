// src/app/core/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // ─── Auth email/password ────────────────────────────────────

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // ─── Auth Google OAuth ──────────────────────────────────────

  /**
   * Inicia el flujo OAuth con Google pidiendo TAMBIÉN el permiso
   * de Google Calendar (calendar.events) para poder crear y eliminar
   * eventos cuando el doctor agende o cancele citas.
   *
   * El scope 'email' y 'profile' los agrega Supabase automáticamente.
   * Solo necesitamos agregar el scope extra de Calendar.
   *
   * IMPORTANTE: El doctor verá una pantalla de permisos de Google
   * donde debe aceptar que la app pueda gestionar sus eventos
   * de calendario. Esto es normal y requerido.
   */
  async signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          // Forzar pantalla de selección de cuenta (útil si el doctor
          // tiene varias cuentas de Google)
          prompt: 'select_account'
        }
      }
    });
  }
}