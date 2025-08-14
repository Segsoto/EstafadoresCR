const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuración de Supabase con tus credenciales
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqhlyyaxoikeioofrxcr.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGx5eWF4b2lrZWlvb2ZyeGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MDA3MzAsImV4cCI6MjA3MDE3NjczMH0.DkDO9_Dxhbb92TRHWVDzJkgVp_-jDZNkppOolSdwJv4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para generar hash del teléfono
function hashPhoneNumber(phoneNumber) {
  return crypto.createHash('sha256').update(phoneNumber).digest('hex');
}

// Función para generar hash de IP
function generateIpHash(ip) {
  return crypto.createHash('md5').update(ip).digest('hex').substring(0, 16);
}

// Inicializar base de datos (ya no necesario con Supabase)
function initDatabase() {
  console.log('✅ Supabase configurado correctamente');
  console.log('🔗 URL:', supabaseUrl);
}

// Agregar reporte
async function addReport(phoneNumber, scamType, description, imagePath, ipHash, userAgent = null) {
  try {
    const phoneNumberHash = hashPhoneNumber(phoneNumber);
    
    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          phone_number: phoneNumber,
          phone_number_hash: phoneNumberHash,
          scam_type: scamType,
          description: description,
          image_url: imagePath,
          ip_hash: ipHash,
          user_agent: userAgent
        }
      ])
      .select();

    if (error) throw error;
    return { id: data[0].id };
  } catch (error) {
    console.error('Error al agregar reporte:', error);
    throw error;
  }
}

// Obtener reportes con paginación
async function getReports(limit = 20, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('is_active', true)
      .order('reported_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    throw error;
  }
}

// Buscar reportes
async function searchReports(query) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('is_active', true)
      .or(`phone_number.ilike.%${query}%,description.ilike.%${query}%,scam_type.ilike.%${query}%`)
      .order('reported_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en búsqueda:', error);
    throw error;
  }
}

// Votar en un reporte (confirmar o disputar)
async function voteReport(reportId, voteType, ipHash) {
  try {
    // Verificar si ya votó (opcional - puedes implementar tabla de votos separada)
    const column = voteType === 'confirmed' ? 'votes_confirmed' : 'votes_disputed';
    
    // Usar la función RPC personalizada para incrementar votos
    const { data, error } = await supabase.rpc('increment_vote', {
      report_id: reportId,
      vote_column: column
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error al votar:', error);
    throw error;
  }
}

// Obtener estadísticas
async function getStats() {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('scam_type')
      .eq('is_active', true);

    if (error) throw error;

    // Procesar estadísticas localmente
    const stats = {};
    const total = data.length;
    
    data.forEach(report => {
      if (stats[report.scam_type]) {
        stats[report.scam_type]++;
      } else {
        stats[report.scam_type] = 1;
      }
    });

    return Object.keys(stats).map(scam_type => ({
      scam_type,
      type_count: stats[scam_type],
      total_reports: total
    }));
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
}

// Funciones de Administración
async function getAllReportsForAdmin() {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('reported_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener reportes para admin:', error);
    throw error;
  }
}

async function updateReportStatus(reportId, isActive) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) throw error;
    return { changes: 1 };
  } catch (error) {
    console.error('Error al actualizar status:', error);
    throw error;
  }
}

async function deleteReport(reportId) {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;
    return { changes: 1 };
  } catch (error) {
    console.error('Error al eliminar reporte:', error);
    throw error;
  }
}

// Función para verificar reporte
async function verifyReport(reportId) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) throw error;
    return { changes: 1 };
  } catch (error) {
    console.error('Error al verificar reporte:', error);
    throw error;
  }
}

module.exports = {
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
};
