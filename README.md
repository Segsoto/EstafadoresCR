# EstafadoresCR.com 🛡️

Red social anónima para reportar y consultar números telefónicos que intentan estafar en Costa Rica.

## 🚀 Características

- **Reportes Anónimos**: Publica reportes sin necesidad de registro
- **Búsqueda Rápida**: Busca números telefónicos específicos
- **Actualizaciones en Tiempo Real**: Socket.IO para feed dinámico
- **Sistema de Votos**: Valida reportes con votos comunitarios
- **Comentarios**: Añade información adicional a los reportes
- **Moderación Automática**: Filtro de contenido ofensivo
- **Responsive**: Optimizado para móviles
- **SEO Friendly**: Optimizado para motores de búsqueda

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite (sin configuración externa)
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Tiempo Real**: Socket.IO
- **Uploads**: Multer
- **Seguridad**: Helmet, Rate limiting

## 📦 Instalación y Uso

### Requisitos
- Node.js 14 o superior

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/Segsoto/EstafadoresCR.git
cd EstafadoresCR

# Instalar dependencias
npm install

# Ejecutar aplicación
npm start
```

### Acceso
Abre tu navegador en: `http://localhost:3000`

## 🔧 Configuración

La aplicación funciona sin configuración adicional. Usa SQLite como base de datos local que se crea automáticamente.

### Variables de Entorno (Opcional)
```
PORT=3000
```

## 📱 Uso de la Aplicación

### Reportar Estafa
1. Ve a la sección "Reportar Estafa"
2. Ingresa el número telefónico (8 dígitos)
3. Selecciona el tipo de estafa
4. Describe el intento de estafa
5. Opcionalmente, sube una imagen de evidencia
6. Envía el reporte

### Buscar Números
1. Ve a la sección "Buscar Número"
2. Ingresa el número o palabras clave
3. Revisa los resultados

### Feed de Reportes
- Ve todos los reportes recientes
- Vota si consideras útil el reporte
- Agrega comentarios con información adicional
- Actualización automática con nuevos reportes

## 🛡️ Seguridad y Privacidad

- **Anonimato Total**: No se requiere registro
- **Hash de IP**: Las IPs se almacenan hasheadas para prevenir spam
- **Rate Limiting**: Protección contra spam y ataques
- **Filtrado de Contenido**: Moderación automática
- **Validación de Datos**: Sanitización de entrada

## 📊 Funcionalidades

### Tipos de Estafa Soportados
- SIMPE Móvil
- Falso Familiar
- Phishing / Datos Bancarios
- Falso Premio
- Falsa Oferta de Trabajo
- Falsa Inversión
- Suplantación de Gobierno
- Falso Delivery
- Falso Préstamo
- Otros

### Características del Sistema
- **Paginación**: Carga eficiente de reportes
- **Búsqueda**: Por número, tipo o contenido
- **Votos**: Sistema de validación comunitaria
- **Comentarios**: Información adicional colaborativa
- **Estadísticas**: Métricas de tipos de estafa
- **Responsive**: Funciona en todos los dispositivos

## 🚀 Despliegue en Producción

### Para Servidor VPS/Cloud
```bash
# Usar PM2 para producción
npm install -g pm2
pm2 start server.js --name estafadores-cr
pm2 startup
pm2 save
```

### Para Plataformas Cloud (Heroku, Railway, etc.)
La aplicación está lista para desplegar directamente. Solo asegúrate de:
1. Configurar la variable `PORT` si es necesaria
2. Los archivos estáticos y uploads se sirven correctamente

## 📄 Consideraciones Legales

### Términos de Uso
- Los reportes deben ser veraces
- Prohibido contenido calumnioso o falso
- Moderación activa del contenido
- Derecho a réplica disponible

### Protección Legal
- **Hosting Seguro**: Usar proveedores con protección DDoS
- **WHOIS Privado**: Proteger datos del administrador
- **Cloudflare**: Para seguridad adicional
- **Términos y Condiciones**: Claros y específicos

## 🔧 Desarrollo

### Estructura del Proyecto
```
EstafadoresCR/
├── server.js          # Servidor principal
├── database.js        # Configuración de base de datos
├── package.json       # Dependencias
├── public/            # Archivos estáticos
│   ├── index.html     # Página principal
│   ├── styles.css     # Estilos
│   ├── app.js         # JavaScript frontend
│   └── uploads/       # Imágenes subidas
└── estafadores.db     # Base de datos SQLite (se crea automáticamente)
```

### API Endpoints
- `GET /api/reports` - Obtener reportes
- `POST /api/reports` - Crear reporte
- `GET /api/search` - Buscar reportes
- `POST /api/reports/:id/vote` - Votar reporte
- `GET /api/reports/:id/comments` - Obtener comentarios
- `POST /api/reports/:id/comments` - Agregar comentario
- `GET /api/stats` - Obtener estadísticas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

- **Email**: soporte@estafadorescr.com
- **Issues**: GitHub Issues
- **Documentación**: Este README

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🌟 Características Avanzadas Futuras

- [ ] Moderación con IA
- [ ] API para desarrolladores
- [ ] App móvil nativa
- [ ] Sistema de reputación
- [ ] Alertas por SMS/Email
- [ ] Integración con autoridades

---

**EstafadoresCR.com** - Protegiendo a Costa Rica de las estafas telefónicas 🇨🇷
