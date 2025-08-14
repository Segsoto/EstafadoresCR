-- Script para arreglar los warnings de search_path en funciones de Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Arreglar función update_comments_count
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 2. Arreglar función increment_vote (si existe)
CREATE OR REPLACE FUNCTION public.increment_vote(report_uuid UUID, vote_type TEXT, user_ip_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar si el usuario ya votó en este reporte
    IF EXISTS (
        SELECT 1 FROM votes 
        WHERE report_id = report_uuid AND ip_hash = user_ip_hash
    ) THEN
        RETURN FALSE; -- Ya votó
    END IF;
    
    -- Insertar el voto
    INSERT INTO votes (report_id, vote_type, ip_hash)
    VALUES (report_uuid, vote_type, user_ip_hash);
    
    -- Actualizar contadores en la tabla reports
    IF vote_type = 'up' THEN
        UPDATE reports 
        SET votes_up = votes_up + 1 
        WHERE id = report_uuid;
    ELSIF vote_type = 'down' THEN
        UPDATE reports 
        SET votes_down = votes_down + 1 
        WHERE id = report_uuid;
    END IF;
    
    RETURN TRUE; -- Voto exitoso
END;
$$;

-- 3. Arreglar función update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 4. Crear función para votos si no existe
CREATE OR REPLACE FUNCTION public.handle_vote(report_uuid UUID, vote_type TEXT, user_ip_hash TEXT)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_vote TEXT;
    result JSON;
BEGIN
    -- Verificar si el usuario ya votó en este reporte
    SELECT votes.vote_type INTO existing_vote
    FROM votes 
    WHERE report_id = report_uuid AND ip_hash = user_ip_hash;
    
    IF existing_vote IS NOT NULL THEN
        -- El usuario ya votó
        IF existing_vote = vote_type THEN
            -- Mismo voto, remover (toggle)
            DELETE FROM votes 
            WHERE report_id = report_uuid AND ip_hash = user_ip_hash;
            
            -- Decrementar contador
            IF vote_type = 'up' THEN
                UPDATE reports SET votes_up = GREATEST(votes_up - 1, 0) WHERE id = report_uuid;
            ELSE
                UPDATE reports SET votes_down = GREATEST(votes_down - 1, 0) WHERE id = report_uuid;
            END IF;
            
            result = json_build_object('action', 'removed', 'vote_type', vote_type);
        ELSE
            -- Voto diferente, cambiar
            UPDATE votes 
            SET vote_type = vote_type, created_at = NOW()
            WHERE report_id = report_uuid AND ip_hash = user_ip_hash;
            
            -- Actualizar contadores (decrementar el anterior, incrementar el nuevo)
            IF existing_vote = 'up' THEN
                UPDATE reports SET votes_up = GREATEST(votes_up - 1, 0) WHERE id = report_uuid;
            ELSE
                UPDATE reports SET votes_down = GREATEST(votes_down - 1, 0) WHERE id = report_uuid;
            END IF;
            
            IF vote_type = 'up' THEN
                UPDATE reports SET votes_up = votes_up + 1 WHERE id = report_uuid;
            ELSE
                UPDATE reports SET votes_down = votes_down + 1 WHERE id = report_uuid;
            END IF;
            
            result = json_build_object('action', 'changed', 'vote_type', vote_type, 'previous', existing_vote);
        END IF;
    ELSE
        -- Nuevo voto
        INSERT INTO votes (report_id, vote_type, ip_hash)
        VALUES (report_uuid, vote_type, user_ip_hash);
        
        -- Incrementar contador
        IF vote_type = 'up' THEN
            UPDATE reports SET votes_up = votes_up + 1 WHERE id = report_uuid;
        ELSE
            UPDATE reports SET votes_down = votes_down + 1 WHERE id = report_uuid;
        END IF;
        
        result = json_build_object('action', 'added', 'vote_type', vote_type);
    END IF;
    
    RETURN result;
END;
$$;

-- 5. Recrear triggers si es necesario
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_count();

-- 6. Trigger para updated_at en reports (si no existe)
DROP TRIGGER IF EXISTS trigger_update_reports_updated_at ON reports;
CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Trigger para updated_at en comments (si no existe)
DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios:
-- SET search_path = public: Define explícitamente el esquema a usar
-- SECURITY DEFINER: Las funciones corren con privilegios del creador
-- Esto elimina los warnings de "mutable search_path"
