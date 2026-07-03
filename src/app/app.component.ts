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
  citasPendientes  = signal(0);  // Badge de citas sin confirmar
  userEmail        = computed(() => this.auth.currentUser()?.email ?? '');

  constructor(
    private auth: AuthService,
    private citasService: CitasService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Cargar badge de pendientes cuando el usuario esté autenticado
    this.auth.currentUser();  // trigger signal
    if (this.auth.isAuthenticated()) {
      await this.loadPendientes();
    }
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

  logout() {
    this.auth.logout();
  }
}