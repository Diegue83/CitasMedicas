// src/app/app.component.ts
import { Component, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    @if (isLoginPage()) {
      <router-outlet />
    } @else {
      <div class="app-shell">
        <!-- Sidebar -->
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
          <div class="sidebar-header">
            <div class="brand">
              <span class="brand-icon">🏥</span>
              @if (!sidebarCollapsed) {
                <span class="brand-name">CitasMed</span>
              }
            </div>
            <button class="collapse-btn" (click)="sidebarCollapsed = !sidebarCollapsed">
              <span>{{ sidebarCollapsed ? '›' : '‹' }}</span>
            </button>
          </div>

          <nav class="sidebar-nav">
            <a routerLink="/dashboard" routerLinkActive="active"
               class="nav-item" title="Dashboard">
              <span class="nav-icon">📊</span>
              @if (!sidebarCollapsed) { <span>Dashboard</span> }
            </a>
            <a routerLink="/citas" routerLinkActive="active"
               class="nav-item" title="Citas">
              <span class="nav-icon">📅</span>
              @if (!sidebarCollapsed) { <span>Citas</span> }
            </a>
            <a routerLink="/pacientes" routerLinkActive="active"
               class="nav-item" title="Pacientes">
              <span class="nav-icon">👤</span>
              @if (!sidebarCollapsed) { <span>Pacientes</span> }
            </a>
          </nav>

          <div class="sidebar-footer">
            @if (!sidebarCollapsed) {
              <div class="user-info">
                <span class="user-email">{{ userEmail() }}</span>
              </div>
            }
            <button class="logout-btn" (click)="logout()" title="Cerrar sesión">
              <span>🚪</span>
              @if (!sidebarCollapsed) { <span>Salir</span> }
            </button>
          </div>
        </aside>

        <!-- Main content -->
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    }
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #f8fafc;
    }

    .sidebar {
      width: 220px;
      min-width: 220px;
      background: #1e293b;
      color: white;
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, min-width 0.2s ease;
      overflow: hidden;
    }

    .sidebar.collapsed {
      width: 64px;
      min-width: 64px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 1.1rem;
      white-space: nowrap;
    }

    .brand-icon { font-size: 1.4rem; }

    .collapse-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.75rem 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      border-radius: 6px;
      margin: 0 0.5rem;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      font-size: 0.9rem;
    }

    .nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
    .nav-item.active { background: #3b82f6; color: white; }
    .nav-icon { font-size: 1.1rem; flex-shrink: 0; }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .user-email {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.5);
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255,255,255,0.08);
      border: none;
      color: rgba(255,255,255,0.7);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .logout-btn:hover { background: rgba(239, 68, 68, 0.3); color: white; }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
    }

    @media (max-width: 640px) {
      .sidebar { width: 64px; min-width: 64px; }
      .main-content { padding: 1rem; }
    }
  `]
})
export class AppComponent {
  sidebarCollapsed = false;

  userEmail = computed(() => this.auth.currentUser()?.email ?? '');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  isLoginPage(): boolean {
    return this.router.url === '/login' || !this.auth.isAuthenticated();
  }

  logout() {
    this.auth.logout();
  }
}