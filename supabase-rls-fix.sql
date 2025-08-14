-- Script para arreglar las políticas RLS de Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Eliminar políticas existentes en la tabla reports
DROP POLICY IF EXISTS "Permitir lectura de reportes activos" ON reports;
DROP POLICY IF EXISTS "Permitir insertar reportes" ON reports;
DROP POLICY IF EXISTS "Permitir actualizar reportes" ON reports;

-- Crear políticas más permisivas para la tabla reports
-- Política para lectura (usuarios comunes solo ven activos)
CREATE POLICY "Permitir lectura de reportes activos" ON reports
    FOR SELECT USING (is_active = true);

-- Política para inserción (cualquiera puede reportar)
CREATE POLICY "Permitir insertar reportes" ON reports
    FOR INSERT WITH CHECK (true);

-- Política para actualización (cualquiera puede actualizar por ahora)
-- NOTA: En producción esto debería ser más restrictivo
CREATE POLICY "Permitir actualizar reportes" ON reports
    FOR UPDATE USING (true) WITH CHECK (true);

-- Política para eliminación (cualquiera puede eliminar por ahora) 
-- NOTA: En producción esto debería ser más restrictivo
CREATE POLICY "Permitir eliminar reportes" ON reports
    FOR DELETE USING (true);

-- Verificar que RLS esté habilitado
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Opcional: Deshabilitar RLS temporalmente para desarrollo
-- SOLO usar esto si sigues teniendo problemas y estás en desarrollo
-- ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- Para re-habilitarlo más tarde:
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
