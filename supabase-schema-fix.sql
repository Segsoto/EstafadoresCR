-- Script simplificado para crear solo lo que falta en Supabase
-- Ejecutar este archivo si el schema completo da errores

-- Solo crear la tabla de comentarios si no existe
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) >= 3 AND char_length(content) <= 500),
    ip_hash VARCHAR(32) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices solo si no existen
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_active ON comments(is_active);

-- Agregar columnas a reports solo si no existen
DO $$ 
BEGIN 
    -- Verificar y agregar votes_up
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='reports' AND column_name='votes_up'
    ) THEN
        ALTER TABLE reports ADD COLUMN votes_up INTEGER DEFAULT 0;
    END IF;
    
    -- Verificar y agregar votes_down
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='reports' AND column_name='votes_down'
    ) THEN
        ALTER TABLE reports ADD COLUMN votes_down INTEGER DEFAULT 0;
    END IF;
    
    -- Verificar y agregar comments_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='reports' AND column_name='comments_count'
    ) THEN
        ALTER TABLE reports ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Función para actualizar contadores (reemplazar si existe)
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

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_count();

-- Habilitar RLS en comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes y recrearlas
DROP POLICY IF EXISTS "Permitir lectura de comentarios activos" ON comments;
DROP POLICY IF EXISTS "Permitir insertar comentarios" ON comments;

-- Crear nuevas políticas
CREATE POLICY "Permitir lectura de comentarios activos" ON comments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Permitir insertar comentarios" ON comments
    FOR INSERT WITH CHECK (true);
