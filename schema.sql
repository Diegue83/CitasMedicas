-- ============================================================
-- CITASMED - Schema de Base de Datos para Supabase
-- Ejecutar en el SQL Editor de Supabase en este orden
-- ============================================================

-- 1. TABLA: pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  telefono    TEXT NOT NULL,
  correo      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_telefono_doctor UNIQUE (doctor_id, telefono)
);

-- 2. TABLA: citas
CREATE TABLE IF NOT EXISTS public.citas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id   UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  hora_inicio   TIME NOT NULL,
  duracion      INT NOT NULL CHECK (duracion IN (30, 60)),  -- minutos
  estado        TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','cancelada')),
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint de no-solapamiento (validado también en la app)
  CONSTRAINT no_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    fecha WITH =,
    tsrange(
      (fecha || ' ' || hora_inicio)::TIMESTAMP,
      (fecha || ' ' || hora_inicio)::TIMESTAMP + (duracion || ' minutes')::INTERVAL
    ) WITH &&
  ) WHERE (estado = 'programada')
);

-- Necesario para el EXCLUDE constraint con tsrange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Políticas para pacientes
CREATE POLICY "Doctor ve sus pacientes"
  ON public.pacientes FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor crea sus pacientes"
  ON public.pacientes FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctor actualiza sus pacientes"
  ON public.pacientes FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor elimina sus pacientes"
  ON public.pacientes FOR DELETE
  USING (auth.uid() = doctor_id);

-- Políticas para citas
CREATE POLICY "Doctor ve sus citas"
  ON public.citas FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor crea sus citas"
  ON public.citas FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctor actualiza sus citas"
  ON public.citas FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctor elimina sus citas"
  ON public.citas FOR DELETE
  USING (auth.uid() = doctor_id);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX idx_citas_doctor_fecha ON public.citas (doctor_id, fecha);
CREATE INDEX idx_pacientes_doctor   ON public.pacientes (doctor_id);
CREATE INDEX idx_citas_paciente     ON public.citas (paciente_id);

-- ============================================================
-- FUNCIÓN: Detectar solapamiento de citas (fallback desde app)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_cita_overlap(
  p_doctor_id   UUID,
  p_fecha       DATE,
  p_hora_inicio TIME,
  p_duracion    INT,
  p_exclude_id  UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_hora_fin TIME := p_hora_inicio + (p_duracion || ' minutes')::INTERVAL;
  v_count    INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.citas
  WHERE doctor_id = p_doctor_id
    AND fecha = p_fecha
    AND estado = 'programada'
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND hora_inicio < v_hora_fin
    AND (hora_inicio + (duracion || ' minutes')::INTERVAL) > p_hora_inicio;

  RETURN v_count > 0;
END;
$$;
