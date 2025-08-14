const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear/conectar a la base de datos
const dbPath = path.join(__dirname, 'estafadores.db');
const db = new sqlite3.Database(dbPath);

// Inicializar base de datos
function initDatabase() {
  db.serialize(() => {
    // Tabla de reportes
    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      scam_type TEXT NOT NULL,
      description TEXT NOT NULL,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_hash TEXT,
      votes_up INTEGER DEFAULT 0,
      votes_down INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    )`);

    // Tabla de comentarios
    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_hash TEXT,
      FOREIGN KEY (report_id) REFERENCES reports (id)
    )`);

    // Tabla de votos para evitar duplicados
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      ip_hash TEXT,
      vote_type TEXT CHECK(vote_type IN ('up', 'down')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports (id),
      UNIQUE(report_id, ip_hash)
    )`);

    // Índices para mejorar performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_phone_number ON reports(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON reports(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scam_type ON reports(scam_type)`);
  });
}

// Agregar reporte
function addReport(phoneNumber, scamType, description, imagePath, ipHash) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO reports (phone_number, scam_type, description, image_path, ip_hash)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([phoneNumber, scamType, description, imagePath, ipHash], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
    stmt.finalize();
  });
}

// Obtener reportes con paginación
function getReports(limit = 20, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT id, phone_number, scam_type, description, image_path, 
             created_at, votes_up, votes_down,
             (votes_up - votes_down) as score
      FROM reports 
      WHERE (status = 'active' OR status IS NULL)
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Buscar reportes
function searchReports(query) {
  return new Promise((resolve, reject) => {
    const searchQuery = `%${query}%`;
    db.all(`
      SELECT id, phone_number, scam_type, description, image_path, 
             created_at, votes_up, votes_down,
             (votes_up - votes_down) as score
      FROM reports 
      WHERE (status = 'active' OR status IS NULL) AND (
        phone_number LIKE ? OR 
        description LIKE ? OR 
        scam_type LIKE ?
      )
      ORDER BY created_at DESC 
      LIMIT 50
    `, [searchQuery, searchQuery, searchQuery], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Agregar comentario
function addComment(reportId, content, ipHash) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO comments (report_id, content, ip_hash)
      VALUES (?, ?, ?)
    `);
    
    stmt.run([reportId, content, ipHash], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
    stmt.finalize();
  });
}

// Obtener comentarios de un reporte
function getComments(reportId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT content, created_at
      FROM comments 
      WHERE report_id = ?
      ORDER BY created_at ASC
    `, [reportId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Votar en un reporte
function voteReport(reportId, voteType, ipHash) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Verificar si ya votó
      db.get(`SELECT vote_type FROM votes WHERE report_id = ? AND ip_hash = ?`, 
        [reportId, ipHash], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          // Ya votó, no permitir voto duplicado
          resolve({ success: false, message: 'Ya has votado en este reporte' });
          return;
        }
        
        // Insertar voto
        const stmt = db.prepare(`INSERT INTO votes (report_id, ip_hash, vote_type) VALUES (?, ?, ?)`);
        stmt.run([reportId, ipHash, voteType], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Actualizar contador en la tabla reports
          const updateQuery = voteType === 'up' ? 
            `UPDATE reports SET votes_up = votes_up + 1 WHERE id = ?` :
            `UPDATE reports SET votes_down = votes_down + 1 WHERE id = ?`;
            
          db.run(updateQuery, [reportId], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve({ success: true });
            }
          });
        });
        stmt.finalize();
      });
    });
  });
}

// Obtener estadísticas
function getStats() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(DISTINCT phone_number) as unique_numbers,
        scam_type,
        COUNT(*) as type_count
      FROM reports 
      WHERE status = 'active'
      GROUP BY scam_type
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Funciones de Administración
function getAllReportsForAdmin() {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT id, phone_number, scam_type, description, image_path, 
             created_at, votes_up, votes_down, status, ip_hash,
             (votes_up - votes_down) as score
      FROM reports 
      ORDER BY created_at DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function updateReportStatus(reportId, status) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE reports SET status = ? WHERE id = ?`);
    stmt.run([status, reportId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
    stmt.finalize();
  });
}

function deleteReport(reportId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Eliminar comentarios relacionados
      db.run(`DELETE FROM comments WHERE report_id = ?`, [reportId]);
      // Eliminar votos relacionados
      db.run(`DELETE FROM votes WHERE report_id = ?`, [reportId]);
      // Eliminar reporte
      const stmt = db.prepare(`DELETE FROM reports WHERE id = ?`);
      stmt.run([reportId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
      stmt.finalize();
    });
  });
}

module.exports = {
  initDatabase,
  addReport,
  getReports,
  searchReports,
  addComment,
  getComments,
  voteReport,
  getStats,
  getAllReportsForAdmin,
  updateReportStatus,
  deleteReport
};
