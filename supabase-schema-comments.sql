-- Tabla de comentarios para EstafadoresCR
-- Este archivo contiene el SQL para crear la tabla de comentarios en Supabase

-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) >= 3 AND char_length(content) <= 500),
    ip_hash VARCHAR(32) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_active ON comments(is_active);

-- Actualizar la tabla de reportes para incluir contadores de votos y comentarios
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS votes_up INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS votes_down INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Función para actualizar el contador de comentarios automáticamente
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reports 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.report_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reports 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.report_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contador automáticamente
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_count();

-- RLS (Row Level Security) para comentarios
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura de comentarios activos
CREATE POLICY "Permitir lectura de comentarios activos" ON comments
    FOR SELECT USING (is_active = true);

-- Política para permitir inserción de comentarios
CREATE POLICY "Permitir insertar comentarios" ON comments
    FOR INSERT WITH CHECK (true);

-- Actualizar las políticas de la tabla reports si es necesario
-- (asumiendo que ya tienes RLS habilitado en reports)

-- Comentarios sobre el esquema:
-- 1. Los comentarios están vinculados a reportes mediante report_id
-- 2. Se mantiene el anonimato usando ip_hash
-- 3. Los comentarios tienen límites de caracteres (3-500)
-- 4. Se incluye soft delete con is_active
-- 5. Los contadores se actualizan automáticamente con triggers
-- 6. RLS está habilitado para seguridad
