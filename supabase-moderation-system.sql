-- Script para agregar sistema de moderación automática
-- Ejecutar en Supabase SQL Editor

-- Agregar columna de estado de moderación
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';

-- Agregar columna para puntaje de IA
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS ai_confidence_score FLOAT DEFAULT 0.0;

-- Agregar columna para razón de la decisión de IA
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS ai_moderation_reason TEXT;

-- Crear índice para consultas rápidas por estado
CREATE INDEX IF NOT EXISTS idx_reports_moderation_status ON reports(moderation_status);

-- Actualizar reportes existentes como aprobados
UPDATE reports 
SET moderation_status = 'approved' 
WHERE is_active = true AND moderation_status = 'pending';

-- Los estados posibles serán:
-- 'pending' - Esperando moderación automática
-- 'approved' - Aprobado (manual o automático)
-- 'rejected' - Rechazado (manual o automático)
-- 'flagged' - Marcado para revisión manual

-- Actualizar la política RLS para incluir solo reportes aprobados en la vista pública
DROP POLICY IF EXISTS "Permitir lectura de reportes activos" ON reports;
CREATE POLICY "Permitir lectura de reportes aprobados" ON reports
    FOR SELECT USING (is_active = true AND moderation_status = 'approved');

COMMENT ON COLUMN reports.moderation_status IS 'Estado de moderación: pending, approved, rejected, flagged';
COMMENT ON COLUMN reports.ai_confidence_score IS 'Puntaje de confianza de la IA (0.0 a 1.0)';
COMMENT ON COLUMN reports.ai_moderation_reason IS 'Razón de la decisión automática de la IA';
