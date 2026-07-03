// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pacientes',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/patients/list/patients-list.component').then(m => m.PatientsListComponent)
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./modules/patients/form/patient-form.component').then(m => m.PatientFormComponent)
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./modules/patients/form/patient-form.component').then(m => m.PatientFormComponent)
      }
    ]
  },
  {
    path: 'citas',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/appointments/list/appointments-list.component').then(m => m.AppointmentsListComponent)
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./modules/appointments/form/appointment-form.component').then(m => m.AppointmentFormComponent)
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./modules/appointments/form/appointment-form.component').then(m => m.AppointmentFormComponent)
      }
    ]
  },
  {
    // ← Nueva ruta del calendario mensual
    path: 'calendario',
    loadComponent: () =>
      import('./modules/appointments/calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];