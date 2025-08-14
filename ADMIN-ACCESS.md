# 🔒 Acceso al Panel de Administrador

## Seguridad Implementada

El panel de administrador de EstafadoresCR **SOLO funciona localmente** por seguridad. En producción (Vercel) está completamente bloqueado.

## Cómo acceder al panel admin

### 1. Ejecutar el servidor localmente
```bash
cd "c:\Users\brand\OneDrive - Universidad Fidélitas\Documentos\GitHub\EstafadoresCR"
node server.js
```

### 2. Acceder desde tu navegador
- **URL de login:** http://localhost:3000/admin/login
- **URL del panel:** http://localhost:3000/admin

### 3. Credenciales de acceso
- **Usuario:** `admin`
- **Contraseña:** `EstafadoresCR2025!`

## Funcionalidades del panel admin

- ✅ Ver todos los reportes (incluyendo inactivos)
- ✅ Activar/desactivar reportes
- ✅ Verificar reportes como legítimos
- ✅ Eliminar reportes spam
- ✅ Ver estadísticas detalladas

## Seguridad

### ✅ Protecciones implementadas:
- **Solo localhost:** Panel bloqueado completamente en producción
- **IP filtering:** Solo IPs locales (127.0.0.1, ::1)
- **Host validation:** Verifica que no sea Vercel/producción
- **404 en producción:** Muestra error 404 si intentan acceder desde internet

### 🚫 En producción:
- Todas las rutas `/admin*` devuelven 404
- No hay forma de acceder al panel desde internet
- Logs de intentos de acceso bloqueados

## Notas importantes

1. **Siempre ejecuta localmente:** El panel solo funciona con `node server.js` en tu máquina
2. **No subas credenciales:** Las credenciales están hardcodeadas solo para desarrollo
3. **Logs de seguridad:** Todos los intentos de acceso se registran en consola

## Comandos útiles

```bash
# Ejecutar servidor local
npm start
# o
node server.js

# Ver logs en tiempo real
# Los logs aparecen automáticamente en la consola

# Verificar que el server esté corriendo
# Debería mostrar: "🚀 EstafadoresCR.com ejecutándose en http://localhost:3000"
```

## Solución de problemas

### Si no puedes acceder:
1. Verifica que el servidor esté ejecutándose localmente
2. Usa exactamente `localhost:3000` (no 127.0.0.1)
3. Verifica que no haya otros servicios en el puerto 3000
4. Revisa la consola por errores

### Si ves 404:
- Estás intentando acceder desde una URL de producción
- El middleware de seguridad está funcionando correctamente
- Solo funciona en localhost
