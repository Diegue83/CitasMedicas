// src/app/modules/auth/login/login.component.ts
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">🏥</div>
          <h1>CitasMed</h1>
          <p>Sistema de gestión de citas médicas</p>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="doctor@clinica.com"
              required
              [disabled]="loading()"
            />
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="password-wrapper">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
                [disabled]="loading()"
              />
              <button type="button" class="toggle-pass"
                (click)="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          @if (errorMsg()) {
            <div class="alert alert-error">
              ⚠️ {{ errorMsg() }}
            </div>
          }

          <button type="submit" class="btn-primary"
            [disabled]="loading() || !email || !password">
            @if (loading()) {
              <span class="spinner"></span> Iniciando sesión...
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        <div class="divider">
          <span>o</span>
        </div>

        <button type="button" class="btn-google"
          [disabled]="loadingGoogle()"
          (click)="onGoogleLogin()">
          @if (loadingGoogle()) {
            <span class="spinner-dark"></span> Conectando...
          } @else {
            <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-logo {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .login-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.25rem;
    }

    .login-header p {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.4rem;
    }

    input {
      width: 100%;
      padding: 0.65rem 0.9rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      color: #1e293b;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    }

    input:disabled { background: #f8fafc; opacity: 0.7; }

    .password-wrapper {
      position: relative;
    }

    .password-wrapper input {
      padding-right: 2.5rem;
    }

    .toggle-pass {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .btn-primary {
      width: 100%;
      padding: 0.75rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 1.25rem 0;
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e2e8f0;
    }

    .divider span {
      padding: 0 0.75rem;
    }

    .btn-google {
      width: 100%;
      padding: 0.7rem;
      background: white;
      color: #374151;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }

    .btn-google:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

    .google-icon { flex-shrink: 0; }

    .spinner-dark {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0,0,0,0.15);
      border-top-color: #374151;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = signal(false);
  loadingGoogle = signal(false);
  errorMsg = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const { error } = await this.auth.login(this.email, this.password);

    if (error) {
      this.errorMsg.set(error);
      this.loading.set(false);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async onGoogleLogin() {
    this.loadingGoogle.set(true);
    this.errorMsg.set('');

    const { error } = await this.auth.loginWithGoogle();

    if (error) {
      this.errorMsg.set(error);
      this.loadingGoogle.set(false);
    }
    // Si no hay error, Supabase ya redirigió a Google;
    // no hace falta navegar manualmente.
  }
}