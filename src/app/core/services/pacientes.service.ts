// src/app/core/services/pacientes.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Paciente } from '../models';

@Injectable({ providedIn: 'root' })
export class PacientesService {
  private readonly TABLE = 'pacientes';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  async getAll(): Promise<Paciente[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .eq('doctor_id', this.auth.userId!)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<Paciente | null> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!)
      .single();

    if (error) throw error;
    return data;
  }

  async search(query: string): Promise<Paciente[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .eq('doctor_id', this.auth.userId!)
      .ilike('nombre', `%${query}%`)
      .order('nombre')
      .limit(10);

    if (error) throw error;
    return data ?? [];
  }

  async create(paciente: Omit<Paciente, 'id' | 'doctor_id' | 'created_at'>): Promise<Paciente> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .insert({ ...paciente, doctor_id: this.auth.userId! })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un paciente con ese número de teléfono.');
      }
      throw error;
    }
    return data;
  }

  async update(id: string, paciente: Partial<Paciente>): Promise<Paciente> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .update(paciente)
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un paciente con ese número de teléfono.');
      }
      throw error;
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from(this.TABLE)
      .delete()
      .eq('id', id)
      .eq('doctor_id', this.auth.userId!);

    if (error) throw error;
  }
}