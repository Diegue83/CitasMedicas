// src/app/core/services/doctores.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Doctor } from '../models';

@Injectable({ providedIn: 'root' })
export class DoctoresService {
  private readonly TABLE  = 'doctores';
  private readonly BUCKET = 'doctor-photos';

  constructor(private supabase: SupabaseService) {}

  async getAll(): Promise<Doctor[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<Doctor | null> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Crea un nuevo doctor en dos pasos:
   * 1. Crea el usuario en Supabase Auth (con contraseña temporal)
   * 2. Inserta el perfil en la tabla doctores
   *
   * NOTA: Para crear usuarios desde el cliente necesitas usar
   * supabase.auth.admin — esto requiere la service_role key,
   * que NO se puede usar en el frontend.
   *
   * Por eso usamos la alternativa: invitar al doctor por email
   * con supabase.auth.signUp(), que envía un correo de confirmación.
   */
  async crear(
    doctor: Omit<Doctor, 'id' | 'created_at' | 'activo'>,
    password: string
  ): Promise<Doctor> {
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } =
      await this.supabase.client.auth.signUp({
        email:    doctor.correo,
        password: password,
        options:  { data: { nombre: doctor.nombre } }
      });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('Ya existe un usuario con ese correo.');
      }
      throw authError;
    }

    if (!authData.user) throw new Error('No se pudo crear el usuario.');

    // 2. Insertar perfil en tabla doctores
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .insert({
        id:          authData.user.id,
        nombre:      doctor.nombre,
        correo:      doctor.correo,
        especialidad: doctor.especialidad,
        telefono:    doctor.telefono ?? null,
        foto_url:    doctor.foto_url ?? null,
        rol:         doctor.rol,
        activo:      true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async actualizar(id: string, doctor: Partial<Doctor>): Promise<Doctor> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .update(doctor)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async toggleActivo(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase.client
      .from(this.TABLE)
      .update({ activo })
      .eq('id', id);
    if (error) throw error;
  }

  /** Sube la foto del doctor al bucket de Storage */
  async subirFoto(doctorId: string, file: File): Promise<string> {
    const ext      = file.name.split('.').pop();
    const path     = `${doctorId}/foto.${ext}`;

    const { error } = await this.supabase.client.storage
      .from(this.BUCKET)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = this.supabase.client.storage
      .from(this.BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}