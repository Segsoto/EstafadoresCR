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
const { 
  initDatabase, 
  addReport, 
  getReports, 
  searchReports, 
  voteReport, 
  getStats,
  getAllReportsForAdmin,
  updateReportStatus,
  deleteReport,
  verifyReport,
  generateIpHash
} = require('./database-supabase');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware de seguridad (desactivado temporalmente para debug)
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
//       imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
//       connectSrc: ["'self'", "ws:", "wss:", "https://tqhlyyaxoikeioofrxcr.supabase.co"],
//       fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
//     }
//   }
// }));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Servir archivos estáticos
app.use(express.static('public'));

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

// Crear reporte
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
    
    // Filtrar contenido ofensivo
    const filteredDescription = filterOffensiveContent(description);
    
    const ipHash = getIpHash(req);
    const userAgent = req.get('User-Agent');
    let imageUrl = null;
    
    // Subir imagen a Cloudinary si existe
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Error al subir imagen' });
      }
    }
    
    const result = await addReport(cleanPhone, scamType, filteredDescription, imageUrl, ipHash, userAgent);
    
    // Emitir nuevo reporte a todos los clientes conectados
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
    
    res.json({ success: true, id: result.id });
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
    
    if (!['confirmed', 'disputed'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de voto inválido' });
    }
    
    const ipHash = getIpHash(req);
    const result = await voteReport(id, type, ipHash);
    
    if (result.success) {
      // Emitir actualización de votos
      io.emit('voteUpdate', { reportId: id, type });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al votar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const isActive = status === 'active';
    const result = await updateReportStatus(id, isActive);
    
    if (result.changes > 0) {
      console.log(`✅ Status actualizado para reporte ${id}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Reporte no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al actualizar status:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rutas de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// API de autenticación de admin (básica)
app.post('/admin/login', (req, res) => {
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

// Middleware para verificar admin
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (decoded.startsWith('admin:')) {
      next();
    } else {
      res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
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
