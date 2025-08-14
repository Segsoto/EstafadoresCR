// Configuración global
const API_BASE = '';
let currentPage = 1;
let isLoading = false;
let socket;

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando EstafadoresCR...');
    initializeApp();
});

function initializeApp() {
    // Conectar Socket.IO con configuración para Vercel
    try {
        socket = io({
            transports: ['polling'], // Solo polling para Vercel
            upgrade: false,
            rememberUpgrade: false,
            timeout: 5000,
            forceNew: true
        });
        
        // Eventos de Socket.IO
        socket.on('connect', function() {
            console.log('✅ Conectado al servidor');
        });
        
        socket.on('disconnect', function() {
            console.log('❌ Desconectado del servidor');
        });
        
        socket.on('connect_error', function(error) {
            console.log('⚠️ Error de conexión Socket.IO (esperado en Vercel):', error.message);
        });
        
        socket.on('newReport', function(report) {
            addReportToFeed(report, true);
            showNotification('Nuevo reporte agregado', 'success');
        });
        
        socket.on('voteUpdate', function(data) {
            updateVoteDisplay(data.reportId, data.type);
        });
        
        socket.on('newComment', function(data) {
            updateCommentsCount(data.reportId);
        });
    } catch (error) {
        console.log('⚠️ Socket.IO no disponible, funcionando sin tiempo real');
        socket = null;
    }
    
    // Configurar formularios
    setupForms();
    
    // Configurar navegación
    setupNavigation();
    
    // Configurar inputs de comentarios
    setupCommentInputs();
    
    // Cargar datos iniciales
    loadReports();
    loadStats();
    
    // Configurar eventos de búsqueda
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('🔍 Enter presionado en búsqueda');
                searchReports();
            }
        });
        console.log('✅ Event listener agregado al input de búsqueda');
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔍 Click en botón de búsqueda detectado');
            searchReports();
        });
        console.log('✅ Event listener agregado al botón de búsqueda');
    }
    
    // Exponer función de búsqueda globalmente
    window.searchReports = searchReports;
    console.log('✅ Función searchReports disponible globalmente');
    
    // Verificar que showSection está disponible globalmente
    window.showSection = showSection;
    console.log('✅ Función showSection disponible globalmente');
    
    // Función de prueba específica para búsqueda
    window.testSearch = function(query = '887') {
        console.log('🧪 Función de prueba de búsqueda ejecutada');
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
            console.log('📝 Valor establecido en input:', searchInput.value);
            searchReports();
        } else {
            console.error('❌ No se encontró el input de búsqueda');
        }
    };
    
    // Función de prueba para verificar elementos
    window.checkSearch = function() {
        console.log('� Verificando elementos de búsqueda:');
        console.log('Input búsqueda:', !!document.getElementById('search-input'));
        console.log('Botón búsqueda:', !!document.getElementById('search-button'));
        console.log('Contenedor resultados:', !!document.getElementById('search-results'));
        console.log('Función searchReports disponible:', typeof window.searchReports);
    };
    
    console.log('� Funciones de prueba disponibles:');
    console.log('💡 - window.testSearch("887") para probar búsqueda');
    console.log('💡 - window.checkSearch() para verificar elementos');
    
    console.log('✅ Aplicación inicializada correctamente');
}

// Configurar navegación
function setupNavigation() {
    console.log('🔧 Configurando navegación...');
    
    // Agregar event listeners a todos los botones de navegación
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('📱 Botones encontrados:', navButtons.length);
    
    navButtons.forEach((button, index) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Extraer el nombre de la sección del onclick
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/showSection\('(.+?)'\)/);
                if (match) {
                    const sectionName = match[1];
                    console.log('🔄 Click detectado en botón:', sectionName);
                    showSectionNew(sectionName);
                }
            }
        });
        console.log(`✅ Event listener agregado al botón ${index + 1}`);
    });
}

// Nueva función de navegación entre secciones
function showSectionNew(sectionName) {
    console.log('🔄 Cambiando a sección:', sectionName);
    
    try {
        // Ocultar todas las secciones
        const allSections = document.querySelectorAll('.section');
        allSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(sectionName + '-section');
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            console.log('✅ Sección mostrada:', sectionName + '-section');
        } else {
            console.error('❌ No se encontró la sección:', sectionName + '-section');
            return;
        }
        
        // Actualizar botones de navegación
        const allButtons = document.querySelectorAll('.nav-btn');
        allButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Buscar el botón correspondiente y marcarlo como activo
        const targetBtn = document.querySelector(`[onclick*="'${sectionName}'"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            console.log('✅ Botón marcado como activo');
        }
        
        // Cargar datos específicos según la sección
        if (sectionName === 'stats') {
            console.log('📊 Cargando estadísticas...');
            loadStats();
        } else if (sectionName === 'search') {
            console.log('🔍 Sección de búsqueda lista');
        } else if (sectionName === 'report') {
            console.log('⚠️ Sección de reporte lista');
        } else if (sectionName === 'feed') {
            console.log('📱 Feed de reportes');
        }
        
    } catch (error) {
        console.error('❌ Error en navegación:', error);
    }
}

// Función legacy para compatibilidad con onclick
function showSection(sectionName) {
    showSectionNew(sectionName);
}

// Configurar formularios
function setupForms() {
    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', handleReportSubmit);
    
    // Validación en tiempo real del número de teléfono
    const phoneInput = document.getElementById('phone-number');
    phoneInput.addEventListener('input', function(e) {
        // Solo permitir números
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Limitar a 8 dígitos
        if (e.target.value.length > 8) {
            e.target.value = e.target.value.slice(0, 8);
        }
    });
    
    // Validación de descripción
    const descriptionInput = document.getElementById('description');
    descriptionInput.addEventListener('input', function(e) {
        const charCount = e.target.value.length;
        const minChars = 20;
        
        if (charCount < minChars) {
            e.target.style.borderColor = '#e74c3c';
        } else {
            e.target.style.borderColor = '#27ae60';
        }
    });
}

// Manejar envío de reporte
async function handleReportSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const phoneNumber = formData.get('phoneNumber');
    const description = formData.get('description');
    
    // Validaciones del lado del cliente
    if (phoneNumber.length !== 8) {
        showNotification('El número debe tener exactamente 8 dígitos', 'error');
        return;
    }
    
    if (description.length < 20) {
        showNotification('La descripción debe tener al menos 20 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Reporte enviado exitosamente', 'success');
            e.target.reset();
            showSection('feed');
        } else {
            showNotification(result.error || 'Error al enviar reporte', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Cargar reportes
async function loadReports(page = 1) {
    if (isLoading) return;
    
    isLoading = true;
    const container = document.getElementById('reports-container');
    
    if (page === 1) {
        container.innerHTML = '<div class="loading">Cargando reportes...</div>';
    }
    
    try {
        const response = await fetch(`/api/reports?page=${page}`);
        const data = await response.json();
        
        if (page === 1) {
            container.innerHTML = '';
        }
        
        if (data.reports.length === 0 && page === 1) {
            container.innerHTML = '<div class="text-center">No hay reportes disponibles</div>';
        } else {
            data.reports.forEach(report => addReportToFeed(report));
        }
        
        // Actualizar botón "Cargar más"
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (data.hasMore) {
            loadMoreBtn.style.display = 'block';
            currentPage = page;
        } else {
            loadMoreBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error">Error al cargar reportes</div>';
    }
    
    isLoading = false;
}

// Cargar más reportes
function loadMoreReports() {
    loadReports(currentPage + 1);
}

// Agregar reporte al feed
function addReportToFeed(report, prepend = false) {
    const container = document.getElementById('reports-container');
    const reportCard = createReportCard(report);
    
    if (prepend) {
        container.insertBefore(reportCard, container.firstChild);
    } else {
        container.appendChild(reportCard);
    }
}

// Crear tarjeta de reporte
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.dataset.reportId = report.id;
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const getScamTypeLabel = (type) => {
        const types = {
            'simpe': 'SIMPE Móvil',
            'familiar': 'Falso Familiar',
            'phishing': 'Phishing',
            'premio': 'Falso Premio',
            'trabajo': 'Oferta de Trabajo',
            'inversion': 'Falsa Inversión',
            'gobierno': 'Suplantación Gobierno',
            'delivery': 'Falso Delivery',
            'prestamo': 'Falso Préstamo',
            'otro': 'Otro'
        };
        return types[type] || type;
    };
    
    card.innerHTML = `
        <div class="phone-number">📞 ${report.phone_number}</div>
        <div class="scam-type">${getScamTypeLabel(report.scam_type)}</div>
        
        <div class="report-description">
            ${report.description}
        </div>
        
        ${report.image_path ? `
            <div class="report-image">
                <img src="${report.image_path}" alt="Evidencia del intento de estafa" loading="lazy" style="max-width: 100%; border-radius: 6px; margin: 1rem 0;">
            </div>
        ` : ''}
        
        <div class="report-meta">
            <span>${formatDate(report.created_at)}</span>
        </div>
        
        <div class="votes">
            <button class="vote-btn ${report.user_vote === 'up' ? 'liked' : ''}" onclick="voteReport('${report.id}', 'up')" data-report-id="${report.id}" data-vote-type="up">
                👍 <span class="vote-count">${report.votes_up || 0}</span>
            </button>
            <button class="vote-btn ${report.user_vote === 'down' ? 'disliked' : ''}" onclick="voteReport('${report.id}', 'down')" data-report-id="${report.id}" data-vote-type="down">
                👎 <span class="vote-count">${report.votes_down || 0}</span>
            </button>
            <button class="vote-btn comment-btn" onclick="toggleComments('${report.id}')" data-report-id="${report.id}">
                💬 <span class="comment-count">${report.comments_count || 0}</span>
            </button>
        </div>
        
        <div id="comments-${report.id}" class="comments-section hidden">
            <div class="comment-form">
                <input type="text" class="comment-input" placeholder="Agregar comentario..." maxlength="500">
                <button class="comment-submit" onclick="addComment('${report.id}')">Enviar</button>
            </div>
            <div class="comments-list" id="comments-list-${report.id}">
                <!-- Los comentarios se cargarán aquí -->
            </div>
        </div>
    `;
    
    return card;
}

// Votar en reporte
async function voteReport(reportId, type) {
    try {
        console.log(`🗳️ Votando ${type} en reporte ${reportId}`);
        
        const response = await fetch(`/api/reports/${reportId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            updateVoteDisplay(reportId, type, result.votes);
            showNotification(`Voto ${type === 'up' ? 'positivo' : 'negativo'} registrado`, 'success');
        } else {
            showNotification(result.message || 'Error al votar', 'error');
        }
    } catch (error) {
        console.error('❌ Error al votar:', error);
        showNotification('Error de conexión al votar', 'error');
    }
}

// Actualizar display de votos
function updateVoteDisplay(reportId, voteType, votes) {
    const upBtn = document.querySelector(`[data-report-id="${reportId}"][data-vote-type="up"]`);
    const downBtn = document.querySelector(`[data-report-id="${reportId}"][data-vote-type="down"]`);
    
    if (upBtn && downBtn) {
        // Actualizar contadores
        upBtn.querySelector('.vote-count').textContent = votes.up || 0;
        downBtn.querySelector('.vote-count').textContent = votes.down || 0;
        
        // Remover estados activos anteriores
        upBtn.classList.remove('liked');
        downBtn.classList.remove('disliked');
        
        // Aplicar nuevo estado
        if (voteType === 'up') {
            upBtn.classList.add('liked');
        } else if (voteType === 'down') {
            downBtn.classList.add('disliked');
        }
    }
}

// Toggle comentarios
async function toggleComments(reportId) {
    console.log(`💬 Toggle comentarios para reporte ${reportId}`);
    
    const commentsSection = document.getElementById(`comments-${reportId}`);
    const commentBtn = document.querySelector(`[data-report-id="${reportId}"].comment-btn`);
    
    if (commentsSection.classList.contains('hidden')) {
        // Mostrar comentarios
        commentsSection.classList.remove('hidden');
        commentBtn.classList.add('active');
        
        // Cargar comentarios si no se han cargado
        await loadComments(reportId);
    } else {
        // Ocultar comentarios
        commentsSection.classList.add('hidden');
        commentBtn.classList.remove('active');
    }
}

// Cargar comentarios
async function loadComments(reportId) {
    try {
        console.log(`📥 Cargando comentarios para reporte ${reportId}`);
        
        const response = await fetch(`/api/reports/${reportId}/comments`);
        const result = await response.json();
        
        if (response.ok && result.success) {
            const commentsList = document.getElementById(`comments-list-${reportId}`);
            
            if (result.comments.length === 0) {
                commentsList.innerHTML = '<p class="text-center" style="color: var(--gray-500); padding: 1rem;">No hay comentarios aún</p>';
            } else {
                commentsList.innerHTML = result.comments.map(comment => `
                    <div class="comment">
                        <div class="comment-text">${escapeHtml(comment.content)}</div>
                        <div class="comment-meta">${formatDate(comment.created_at)}</div>
                    </div>
                `).join('');
            }
        } else {
            console.error('Error al cargar comentarios:', result.message);
        }
    } catch (error) {
        console.error('❌ Error al cargar comentarios:', error);
    }
}

// Agregar comentario
async function addComment(reportId) {
    const commentInput = document.querySelector(`#comments-${reportId} .comment-input`);
    const content = commentInput.value.trim();
    
    if (!content) {
        showNotification('Escribe un comentario válido', 'error');
        return;
    }
    
    if (content.length < 3) {
        showNotification('El comentario debe tener al menos 3 caracteres', 'error');
        return;
    }
    
    try {
        console.log(`💬 Agregando comentario a reporte ${reportId}`);
        
        const response = await fetch(`/api/reports/${reportId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            commentInput.value = '';
            showNotification('Comentario agregado exitosamente', 'success');
            
            // Actualizar contador de comentarios
            const commentBtn = document.querySelector(`[data-report-id="${reportId}"].comment-btn .comment-count`);
            if (commentBtn) {
                const currentCount = parseInt(commentBtn.textContent) || 0;
                commentBtn.textContent = currentCount + 1;
            }
            
            // Recargar comentarios
            await loadComments(reportId);
        } else {
            showNotification(result.message || 'Error al agregar comentario', 'error');
        }
    } catch (error) {
        console.error('❌ Error al agregar comentario:', error);
        showNotification('Error de conexión al agregar comentario', 'error');
    }
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Agregar comentario (alternativa con Enter)
function setupCommentInputs() {
    document.addEventListener('keypress', function(e) {
        if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
            const reportId = e.target.closest('.comments-section').id.replace('comments-', '');
            addComment(reportId);
        }
    });
}

// Agregar comentario (función duplicada legacy - remover)
async function addCommentLegacy(reportId) {
    const commentInput = document.querySelector(`#comments-${reportId} .comment-input`);
    const content = commentInput.value.trim();
    
    if (content.length < 5) {
        showNotification('El comentario debe tener al menos 5 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/reports/${reportId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            commentInput.value = '';
            await loadComments(reportId);
            showNotification('Comentario agregado', 'success');
        } else {
            showNotification(result.error || 'Error al agregar comentario', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al agregar comentario', 'error');
    }
}

// Buscar reportes
async function searchReports() {
    console.log('🔍 Función searchReports ejecutada');
    
    const query = document.getElementById('search-input').value.trim();
    const resultsContainer = document.getElementById('search-results');
    
    console.log('📝 Query de búsqueda:', query);
    console.log('📦 Contenedor de resultados:', !!resultsContainer);
    
    if (query.length < 3) {
        showNotification('La búsqueda debe tener al menos 3 caracteres', 'error');
        return;
    }
    
    resultsContainer.innerHTML = '<div class="loading">Buscando...</div>';
    
    try {
        console.log('🌐 Haciendo petición a API...');
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        console.log('📊 Respuesta de API:', data);
        
        resultsContainer.innerHTML = '';
        
        if (data.reports.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center">No se encontraron resultados</div>';
        } else {
            console.log(`✅ Se encontraron ${data.reports.length} resultados`);
            data.reports.forEach(report => {
                const reportCard = createReportCard(report);
                resultsContainer.appendChild(reportCard);
            });
        }
    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        resultsContainer.innerHTML = '<div class="error">Error en la búsqueda</div>';
    }
}

// Cargar estadísticas
async function loadStats() {
    const container = document.getElementById('stats-container');
    container.innerHTML = '<div class="loading">Cargando estadísticas...</div>';
    
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        container.innerHTML = '';
        
        // Calcular totales
        let totalReports = 0;
        let uniqueNumbers = new Set();
        
        data.stats.forEach(stat => {
            totalReports += stat.type_count;
        });
        
        // Crear tarjetas de estadísticas
        const statsCards = [
            {
                number: totalReports,
                label: 'Total de Reportes'
            },
            {
                number: data.stats.length,
                label: 'Tipos de Estafas'
            }
        ];
        
        // Agregar estadísticas por tipo
        data.stats.forEach(stat => {
            if (stat.scam_type) {
                statsCards.push({
                    number: stat.type_count,
                    label: getScamTypeLabel(stat.scam_type)
                });
            }
        });
        
        statsCards.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error">Error al cargar estadísticas</div>';
    }
}

// Funciones auxiliares para obtener etiquetas
function getScamTypeLabel(type) {
    const types = {
        'simpe': 'SIMPE Móvil',
        'familiar': 'Falso Familiar',
        'phishing': 'Phishing',
        'premio': 'Falso Premio',
        'trabajo': 'Oferta de Trabajo',
        'inversion': 'Falsa Inversión',
        'gobierno': 'Suplantación Gobierno',
        'delivery': 'Falso Delivery',
        'prestamo': 'Falso Préstamo',
        'otro': 'Otro'
    };
    return types[type] || type;
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notifications');
    container.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Modales
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Funciones para mostrar información legal
function showTerms() {
    const content = `
        <h3>Términos y Condiciones de Uso</h3>
        <p><strong>1. Propósito del Sitio</strong></p>
        <p>EstafadoresCR.com es una plataforma para reportar y consultar números telefónicos involucrados en intentos de estafa en Costa Rica.</p>
        
        <p><strong>2. Responsabilidad del Usuario</strong></p>
        <ul>
            <li>Los reportes deben ser veraces y basados en experiencias reales</li>
            <li>No se permite contenido ofensivo, calumnioso o falso</li>
            <li>Los usuarios son responsables de la información que publican</li>
        </ul>
        
        <p><strong>3. Moderación</strong></p>
        <p>Nos reservamos el derecho de moderar, editar o eliminar contenido que viole estos términos.</p>
        
        <p><strong>4. Privacidad</strong></p>
        <p>No recolectamos datos personales. Los reportes son anónimos.</p>
        
        <p><strong>5. Limitación de Responsabilidad</strong></p>
        <p>EstafadoresCR.com no se hace responsable por decisiones tomadas basadas en la información del sitio.</p>
    `;
    showModal('Términos y Condiciones', content);
}

function showPrivacy() {
    const content = `
        <h3>Política de Privacidad</h3>
        <p><strong>Información que Recolectamos</strong></p>
        <ul>
            <li>Números telefónicos reportados</li>
            <li>Descripciones de intentos de estafa</li>
            <li>Imágenes opcionales (sin datos personales)</li>
            <li>Hash de IP para prevenir spam (no identificable)</li>
        </ul>
        
        <p><strong>Cómo Usamos la Información</strong></p>
        <ul>
            <li>Para mostrar reportes a otros usuarios</li>
            <li>Para generar estadísticas anónimas</li>
            <li>Para prevenir spam y abuso</li>
        </ul>
        
        <p><strong>Anonimato</strong></p>
        <p>Todos los reportes son completamente anónimos. No requerimos registro ni datos personales.</p>
        
        <p><strong>Seguridad</strong></p>
        <p>Implementamos medidas de seguridad para proteger la información almacenada.</p>
    `;
    showModal('Política de Privacidad', content);
}

function showContact() {
    const content = `
        <h3>Contacto</h3>
        <p><strong>Para reportar problemas técnicos:</strong></p>
        <p>Email: soporte@estafadorescr.com</p>
        
        <p><strong>Para solicitar eliminación de reportes:</strong></p>
        <p>Email: moderacion@estafadorescr.com</p>
        <p>Incluya el número telefónico y razón de la solicitud.</p>
        
        <p><strong>Para denuncias legales:</strong></p>
        <p>Email: legal@estafadorescr.com</p>
        
        <p><strong>Tiempo de respuesta:</strong></p>
        <p>Respondemos en un plazo máximo de 48 horas hábiles.</p>
        
        <p><strong>Nota:</strong></p>
        <p>Este sitio es un servicio público sin fines de lucro para proteger a los costarricenses de estafas telefónicas.</p>
    `;
    showModal('Contacto', content);
}

// Cerrar modal al hacer clic fuera
document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Funciones para actualización automática
setInterval(() => {
    if (document.querySelector('.section.active').id === 'feed-section') {
        // Verificar nuevos reportes cada 30 segundos
        // (Los nuevos reportes llegan via Socket.IO, esto es backup)
    }
}, 30000);

// Funciones de debugging disponibles en consola
window.debugEstafadores = {
    testNavigation: function() {
        console.log('🧪 Probando navegación...');
        ['feed', 'search', 'report', 'stats'].forEach(section => {
            setTimeout(() => {
                console.log(`Probando sección: ${section}`);
                showSection(section);
            }, 1000);
        });
    },
    
    testSearch: function() {
        console.log('🧪 Probando búsqueda...');
        try {
            // Establecer valor de prueba
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '887';
                searchReports();
                console.log('✅ Búsqueda ejecutada');
            } else {
                console.error('❌ No se encontró el input de búsqueda');
            }
        } catch (e) {
            console.error('❌ Error en búsqueda:', e);
        }
    },
    
    checkElements: function() {
        console.log('🔍 Verificando elementos:');
        console.log('Botones:', document.querySelectorAll('.nav-btn').length);
        console.log('Secciones:', document.querySelectorAll('.section').length);
        console.log('Sección activa:', document.querySelector('.section.active')?.id);
        console.log('Input búsqueda:', !!document.getElementById('search-input'));
        console.log('Contenedor resultados:', !!document.getElementById('search-results'));
    },
    
    forceShow: function(sectionName) {
        console.log(`🔧 Forzando mostrar sección: ${sectionName}`);
        showSection(sectionName);
    }
};

console.log('🛠️ Funciones de debug disponibles en: window.debugEstafadores');
console.log('💡 Prueba: debugEstafadores.testNavigation()');
console.log('💡 Prueba: debugEstafadores.checkElements()');
console.log('💡 Prueba: debugEstafadores.forceShow("search")');
