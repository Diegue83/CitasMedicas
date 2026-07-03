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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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
    // Si no hay error, Supabase redirige a Google automáticamente
  }
}