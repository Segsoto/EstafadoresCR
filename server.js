const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');
const crypto = require('crypto');
const { uploadToCloudinary } = require('./cloudinary-config');
const AutoModerationService = require('./auto-moderation');
const { createClient } = require('@supabase/supabase-js');

// Configurar cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqhlyyaxoikeioofrxcr.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGx5eWF4b2lrZWlvb2ZyeGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDA3MzAsImV4cCI6MjA3MDE3NjczMH0.DkDO9_Dxhbb92TRHWVDzJkgVp_-jDZNkppOolSdwJv4';
const supabase = createClient(supabaseUrl, supabaseKey);

const { 
  initDatabase, 
  addReport,
  addReportWithModeration,
  getReports, 
  searchReports, 
  voteReport, 
  getReportComments,
  addReportComment,
  getStats,
  getAllReportsForAdmin,
  updateReportStatus,
  deleteReport,
  verifyReport,
  generateIpHash
} = require('./database-supabase');

const app = express();
const server = http.createServer(app);

// Inicializar servicio de moderación automática
const moderationService = new AutoModerationService();
console.log('🤖 Servicio de moderación automática inicializado');

// Configuración especial de Socket.IO para Vercel
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling'], // Solo polling para Vercel
  allowEIO3: true
});

const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado temporalmente
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos DESPUÉS de las rutas específicas (comentado temporalmente)
// app.use(express.static('public', {
//   setHeaders: (res, path) => {
//     if (path.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     }
//     if (path.endsWith('.js')) {
//       res.setHeader('Content-Type', 'application/javascript');
//     }
//   }
// }));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP
  message: 'Demasiadas solicitudes, intenta más tarde'
});
app.use(limiter);

// Rate limiting específico para reportes
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 reportes por hora
  message: 'Límite de reportes por hora alcanzado'
});

// Configuración de multer para memoria (Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Log para debug de archivos estáticos
app.use((req, res, next) => {
  console.log(`📁 Solicitando: ${req.path}`);
  next();
});

// Función para obtener hash de IP (anonimizar)
function getIpHash(req) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  return generateIpHash(ip || 'unknown');
}

// Filtro básico de contenido ofensivo
function filterOffensiveContent(text) {
  const offensiveWords = [
    'idiota', 'estúpido', 'pendejo', 'cabrón', 'hijueputa', 'maldito',
    // Agregar más palabras según sea necesario
  ];
  
  let filteredText = text;
  offensiveWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  
  return filteredText;
}

// Inicializar base de datos
initDatabase();

// RUTAS ESPECÍFICAS PARA ARCHIVOS ESTÁTICOS - DEBEN IR PRIMERO
app.get('/styles.css', (req, res) => {
  console.log('📄 Sirviendo styles.css');
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

app.get('/app.js', (req, res) => {
  console.log('📄 Sirviendo app.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'app.js'));
});

// Socket.IO para actualizaciones en tiempo real
io.on('connection', (socket) => {
  console.log('Usuario conectado');
  
  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

// RUTAS API

// Obtener reportes
app.get('/api/reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    const reports = await getReports(limit, offset);
    res.json({ reports, page, hasMore: reports.length === limit });
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Buscar reportes
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'La búsqueda debe tener al menos 3 caracteres' });
    }
    
    const reports = await searchReports(q.trim());
    res.json({ reports });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear reporte con moderación automática
app.post('/api/reports', reportLimiter, upload.single('image'), async (req, res) => {
  try {
    const { phoneNumber, scamType, description } = req.body;
    
    // Validaciones básicas
    if (!phoneNumber || !scamType || !description) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    // Validar formato de teléfono (Costa Rica)
    const phoneRegex = /^[0-9]{8}$/;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Formato de teléfono inválido. Use 8 dígitos.' });
    }
    
    console.log('📝 Nuevo reporte recibido para moderación:', { phoneNumber: cleanPhone, scamType });

    // Moderación automática con IA antes de filtrar contenido ofensivo
    const moderationResult = await moderationService.moderateReport({
      name: '', // No aplica en este contexto
      phone: cleanPhone,
      company: scamType, // Usamos scamType como "company"
      description,
      amount: null
    });

    console.log('🤖 Resultado de moderación:', moderationResult);

    // Solo aplicar filtro básico si la IA lo aprueba
    const filteredDescription = moderationResult.action === 'approved' ? 
      filterOffensiveContent(description) : description;
    
    const ipHash = getIpHash(req);
    const userAgent = req.get('User-Agent');
    let imageUrl = null;
    
    // Subir imagen a Cloudinary si existe y el reporte fue aprobado
    if (req.file && moderationResult.action === 'approved') {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Error al subir imagen' });
      }
    }
    
    // Guardar reporte con estado de moderación
    const result = await addReportWithModeration(
      cleanPhone, 
      scamType, 
      filteredDescription, 
      imageUrl, 
      ipHash, 
      userAgent,
      moderationResult
    );
    
    // Solo emitir reportes aprobados automáticamente
    if (moderationResult.action === 'approved') {
      io.emit('newReport', {
        id: result.id,
        phone_number: cleanPhone,
        scam_type: scamType,
        description: filteredDescription,
        image_url: imageUrl,
        reported_at: new Date().toISOString(),
        votes_confirmed: 0,
        votes_disputed: 0
      });
    }

    // Respuesta basada en moderación
    let message = '';
    if (moderationResult.action === 'approved') {
      message = 'Reporte enviado y publicado exitosamente. ¡Gracias por ayudar a la comunidad!';
    } else if (moderationResult.action === 'flagged') {
      message = 'Reporte recibido y enviado a revisión manual. Será publicado una vez verificado por nuestro equipo.';
    } else {
      message = 'Tu reporte fue recibido pero no cumple con nuestras políticas de contenido. Por favor revisa la información.';
    }
    
    res.json({ 
      success: true, 
      id: result.id,
      message,
      moderation: {
        status: moderationResult.action,
        reason: moderationResult.reason
      }
    });
  } catch (error) {
    console.error('Error al crear reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Votar en reporte
app.post('/api/reports/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    
    if (!['up', 'down'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de voto inválido. Usa "up" o "down"' 
      });
    }
    
    const ipHash = getIpHash(req);
    const result = await voteReport(id, type, ipHash);
    
    if (result.success) {
      // Emitir actualización de votos
      io.emit('voteUpdate', { reportId: id, type, votes: result.votes });
      
      res.json({
        success: true,
        message: 'Voto registrado exitosamente',
        votes: result.votes
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error al votar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Obtener comentarios de un reporte
app.get('/api/reports/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await getReportComments(id);
    
    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('❌ Error al obtener comentarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Agregar comentario a un reporte
app.post('/api/reports/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'El comentario debe tener al menos 3 caracteres'
      });
    }
    
    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede exceder 500 caracteres'
      });
    }
    
    const ipHash = getIpHash(req);
    const result = await addReportComment(id, content.trim(), ipHash);
    
    if (result.success) {
      // Emitir nuevo comentario
      io.emit('newComment', { reportId: id, comment: result.comment });
      
      res.json({
        success: true,
        message: 'Comentario agregado exitosamente',
        comment: result.comment
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error al agregar comentario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// APIs de Administración
app.get('/admin/api/reports', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Admin solicitando reportes...');
    const reports = await getAllReportsForAdmin();
    console.log(`✅ Enviando ${reports.length} reportes al admin`);
    res.json({ reports });
  } catch (error) {
    console.error('❌ Error al obtener reportes para admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/admin/api/reports/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`📝 Admin actualizando status del reporte ${id} a ${status}`);
    
    // Mapear estados del frontend a base de datos
    let isActive;
    if (status === 'approved' || status === 'active') {
      isActive = true;
    } else if (status === 'rejected' || status === 'inactive') {
      isActive = false;
    } else {
      return res.status(400).json({ 
        error: 'Status inválido. Use: approved, rejected, active, o inactive' 
      });
    }
    
    const result = await updateReportStatus(id, isActive);
    
    if (result.changes > 0) {
      console.log(`✅ Status actualizado para reporte ${id}: ${status} -> active: ${isActive}`);
      
      // Emitir evento para actualizar tiempo real si está conectado
      if (io) {
        io.emit('reportStatusChanged', { reportId: id, status, isActive });
      }
      
      res.json({ 
        success: true, 
        message: `Reporte ${status === 'approved' || status === 'active' ? 'aprobado' : 'rechazado'} correctamente`,
        newStatus: status,
        isActive: isActive
      });
    } else {
      res.status(404).json({ error: 'Reporte no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al actualizar status:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message,
      code: error.code
    });
  }
});

app.put('/admin/api/reports/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`✅ Admin verificando reporte ${id}`);
    
    const result = await verifyReport(id);
    
    if (result.changes > 0) {
      console.log(`✅ Reporte ${id} verificado`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Reporte no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al verificar reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/admin/api/reports/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando reporte ${id}...`);
    
    const result = await deleteReport(id);
    console.log(`✅ Reporte ${id} eliminado. Cambios: ${result.changes}`);
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('❌ Error al eliminar reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener reportes pendientes de moderación (solo admin)
app.get('/admin/api/moderation/pending', requireAdmin, async (req, res) => {
  try {
    console.log('📋 Admin solicitando reportes pendientes de moderación');
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('moderation_status', 'flagged')
      .order('reported_at', { ascending: false });

    if (error) throw error;

    const reportesConDetalles = data.map(reporte => ({
      ...reporte,
      confidence_percentage: reporte.ai_confidence_score ? 
        (reporte.ai_confidence_score * 100).toFixed(1) + '%' : 'N/A'
    }));

    console.log(`📊 Encontrados ${reportesConDetalles.length} reportes pendientes`);
    res.json({ reports: reportesConDetalles });
    
  } catch (error) {
    console.error('❌ Error obteniendo reportes pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para aprobar manualmente un reporte flaggeado
app.put('/admin/api/moderation/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Admin aprobando manualmente reporte ${id}`);
    
    const { data, error } = await supabase
      .from('reports')
      .update({ 
        moderation_status: 'approved',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (data && data[0]) {
      // Emitir el reporte aprobado a todos los usuarios
      io.emit('newReport', {
        id: data[0].id,
        phone_number: data[0].phone_number,
        scam_type: data[0].scam_type,
        description: data[0].description,
        image_url: data[0].image_url,
        reported_at: data[0].reported_at,
        votes_confirmed: data[0].votes_up || 0,
        votes_disputed: data[0].votes_down || 0
      });
      
      console.log(`✅ Reporte ${id} aprobado manualmente y publicado`);
      res.json({ success: true, message: 'Reporte aprobado y publicado' });
    } else {
      res.status(404).json({ error: 'Reporte no encontrado' });
    }
    
  } catch (error) {
    console.error('❌ Error aprobando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir otros archivos estáticos (imágenes, uploads, etc.) DESPUÉS de las rutas específicas
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para bloquear rutas admin en producción
function blockAdminInProduction(req, res, next) {
  const isLocalhost = req.hostname === 'localhost' || 
                     req.hostname === '127.0.0.1' || 
                     req.hostname === '::1' ||
                     req.ip === '127.0.0.1' ||
                     req.ip === '::1';
  
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL === '1' ||
                      req.headers.host?.includes('vercel.app') ||
                      req.headers.host?.includes('estafadores');
  
  if (isProduction || !isLocalhost) {
    console.log(`🚫 Acceso admin bloqueado desde: ${req.ip} - Host: ${req.headers.host}`);
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>404 - Página no encontrada</title></head>
      <body>
        <h1>404 - Página no encontrada</h1>
        <p>La página que buscas no existe.</p>
        <a href="/">Volver al inicio</a>
      </body>
      </html>
    `);
  }
  next();
}

// Rutas de administración - SOLO DISPONIBLES EN LOCALHOST
app.get('/admin', blockAdminInProduction, (req, res) => {
  console.log('🔧 Acceso a panel admin desde localhost');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', blockAdminInProduction, (req, res) => {
  console.log('🔧 Acceso a login admin desde localhost');
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// API de autenticación de admin - SOLO EN LOCALHOST
app.post('/admin/login', blockAdminInProduction, (req, res) => {
  const { username, password } = req.body;
  
  // Credenciales básicas (en producción usar hash y BD)
  if (username === 'admin' && password === 'EstafadoresCR2025!') {
    // Crear token simple (en producción usar JWT)
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

// Middleware para verificar admin - SOLO FUNCIONA EN DESARROLLO LOCAL
function requireAdmin(req, res, next) {
  // 🔒 SEGURIDAD: Solo permitir acceso al panel admin en desarrollo local
  const isLocalhost = req.hostname === 'localhost' || 
                     req.hostname === '127.0.0.1' || 
                     req.hostname === '::1' ||
                     req.ip === '127.0.0.1' ||
                     req.ip === '::1';
  
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL === '1' ||
                      req.headers.host?.includes('vercel.app') ||
                      req.headers.host?.includes('estafadores');
  
  // Bloquear completamente el acceso en producción
  if (isProduction || !isLocalhost) {
    console.log(`🚫 Intento de acceso admin bloqueado desde: ${req.ip} - Host: ${req.headers.host}`);
    return res.status(404).json({ 
      error: 'Página no encontrada' 
    });
  }
  
  // En desarrollo local, verificar token básico
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token requerido para acceso admin local' 
    });
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (decoded.startsWith('admin:')) {
      console.log(`✅ Acceso admin permitido desde localhost: ${req.ip}`);
      next();
    } else {
      res.status(401).json({ error: 'Token admin inválido' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token admin malformado' });
  }
}

// Manejar errores de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
  }
  
  if (error.message === 'Solo se permiten imágenes') {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 EstafadoresCR.com ejecutándose en http://localhost:${PORT}`);
  console.log(`📱 La aplicación está lista para reportar estafas telefónicas`);
});
