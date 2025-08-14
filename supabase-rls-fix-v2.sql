-- Script para arreglar el problema específico con rechazar reportes
-- El problema es que las políticas RLS bloquean cambiar is_active a false

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Permitir lectura de reportes activos" ON reports;
DROP POLICY IF EXISTS "Permitir insertar reportes" ON reports;
DROP POLICY IF EXISTS "Permitir actualizar reportes" ON reports;
DROP POLICY IF EXISTS "Permitir eliminar reportes" ON reports;

-- Política para lectura (solo reportes activos para usuarios comunes)
CREATE POLICY "Permitir lectura de reportes activos" ON reports
    FOR SELECT USING (is_active = true);

-- Política para inserción (cualquiera puede reportar)
CREATE POLICY "Permitir insertar reportes" ON reports
    FOR INSERT WITH CHECK (true);

-- Política para actualización MÁS PERMISIVA
-- Esta es la clave: permitir actualizar sin restricciones en WITH CHECK
CREATE POLICY "Permitir actualizar reportes" ON reports
    FOR UPDATE USING (true);

-- Política para eliminación
CREATE POLICY "Permitir eliminar reportes" ON reports
    FOR DELETE USING (true);

-- Verificar que RLS esté habilitado
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ALTERNATIVA: Si aún falla, deshabilitar RLS temporalmente para desarrollo
-- DESCOMENTA estas líneas solo si sigues teniendo problemas:
-- ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
-- NOTA: Recuerda habilitarlo después para producción con: ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
