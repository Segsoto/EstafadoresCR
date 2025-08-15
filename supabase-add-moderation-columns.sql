-- Script para agregar columnas de moderación a la tabla reports si no existen

-- Agregar columna moderation_status si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'moderation_status') THEN
        ALTER TABLE reports ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'approved';
    END IF;
END $$;

-- Agregar columna ai_confidence_score si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'ai_confidence_score') THEN
        ALTER TABLE reports ADD COLUMN ai_confidence_score DECIMAL(5,4);
    END IF;
END $$;

-- Agregar columna ai_moderation_reason si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reports' AND column_name = 'ai_moderation_reason') THEN
        ALTER TABLE reports ADD COLUMN ai_moderation_reason TEXT;
    END IF;
END $$;

-- Crear índice para optimizar consultas por estado de moderación
CREATE INDEX IF NOT EXISTS idx_reports_moderation_status ON reports(moderation_status);

-- Crear índice compuesto para consultas de admin
CREATE INDEX IF NOT EXISTS idx_reports_admin_view ON reports(moderation_status, reported_at DESC);

-- Actualizar reportes existentes para que tengan estado 'approved' si están activos
UPDATE reports 
SET moderation_status = 'approved' 
WHERE moderation_status IS NULL AND is_active = true;

-- Comentarios para documentar las columnas
COMMENT ON COLUMN reports.moderation_status IS 'Estado de moderación: approved, flagged, rejected';
COMMENT ON COLUMN reports.ai_confidence_score IS 'Puntuación de confianza de la IA (0.0 a 1.0)';
COMMENT ON COLUMN reports.ai_moderation_reason IS 'Razón detallada de la decisión de moderación de la IA';

-- Confirmar que las columnas fueron agregadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reports' 
AND column_name IN ('moderation_status', 'ai_confidence_score', 'ai_moderation_reason')
ORDER BY column_name;
