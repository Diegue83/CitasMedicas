// src/app/app.component.ts
import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CitasService } from './core/services/citas.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  sidebarCollapsed = false;
  citasPendientes  = signal(0);

  // Datos del doctor actual desde el perfil
  doctorNombre  = computed(() => this.auth.currentDoctor()?.nombre ?? '');
  doctorFoto    = computed(() => this.auth.currentDoctor()?.foto_url ?? null);
  doctorInicial = computed(() => this.auth.currentDoctor()?.nombre?.charAt(0).toUpperCase() ?? '?');
  isAdmin       = computed(() => this.auth.isAdmin());

  rolLabel = computed(() => {
    const rol = this.auth.currentDoctor()?.rol;
    return rol === 'admin' ? '⭐ Administrador' : '🩺 Doctor';
  });

  constructor(
    public auth: AuthService,
    private citasService: CitasService,
    private router: Router
  ) {}

  async ngOnInit() {
    if (this.auth.isAuthenticated()) {
      await this.loadPendientes();
    }
    // Recargar pendientes cuando el usuario se autentica
    this.auth.currentUser();
  }

  async loadPendientes() {
    try {
      const pendientes = await this.citasService.getCitasPendientes();
      this.citasPendientes.set(pendientes.length);
    } catch {
      this.citasPendientes.set(0);
    }
  }

  isLoginPage(): boolean {
    return this.router.url === '/login' || !this.auth.isAuthenticated();
  }

  logout() { this.auth.logout(); }
}