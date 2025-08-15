const AutoModerationService = require('./auto-moderation');

async function testModerationSystem() {
  console.log('🧪 Iniciando pruebas del sistema de moderación automática\n');
  
  const moderationService = new AutoModerationService();
  
  // Casos de prueba
  const testCases = [
    {
      name: 'Reporte legítimo',
      report: {
        name: 'Juan Pérez',
        phone: '12345678',
        company: 'Telecomunicaciones falsas',
        description: 'Esta persona me llamó diciendo que era del banco y me pidió mi PIN. Es claramente una estafa telefónica.',
        amount: 50000
      }
    },
    {
      name: 'Contenido tóxico',
      report: {
        name: 'María González',
        phone: '87654321',
        company: 'Estafador',
        description: 'Este imbécil es un ladrón de mierda que roba a la gente. Hijo de puta merece morir.',
        amount: null
      }
    },
    {
      name: 'Spam/Repetitivo',
      report: {
        name: 'Test Test',
        phone: '11111111',
        company: 'Test Company',
        description: 'test test test test test test test test test test test test',
        amount: null
      }
    },
    {
      name: 'Información insuficiente',
      report: {
        name: 'X',
        phone: '99999999',
        company: '',
        description: 'malo',
        amount: null
      }
    },
    {
      name: 'Reporte válido con emociones',
      report: {
        name: 'Ana Rodríguez',
        phone: '22334455',
        company: 'Banco falso',
        description: 'Estoy muy molesta porque me llamaron haciéndose pasar por el banco nacional. Me pidieron mi clave y por suerte no se las di. Hay que tener cuidado con estos estafadores.',
        amount: 0
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 Probando: ${testCase.name}`);
    console.log(`📱 Teléfono: ${testCase.report.phone}`);
    console.log(`📝 Descripción: "${testCase.report.description}"`);
    
    try {
      const result = await moderationService.moderateReport(testCase.report);
      
      if (result && result.action) {
        console.log(`✅ Resultado: ${result.action.toUpperCase()}`);
        console.log(`🎯 Confianza: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`💭 Razón: ${result.reason}`);
        
        if (result.details) {
          console.log(`📊 Detalles:`);
          console.log(`   - Sentimiento: ${result.details.sentiment?.label || 'N/A'} (${(result.details.sentiment?.score * 100 || 0).toFixed(1)}%)`);
          console.log(`   - Toxicidad: ${result.details.toxicity?.label || 'N/A'} (${(result.details.toxicity?.score * 100 || 0).toFixed(1)}%)`);
          console.log(`   - Spam: ${result.details.spam?.label || 'N/A'} (${(result.details.spam?.score * 100 || 0).toFixed(1)}%)`);
        }
      } else {
        console.log(`❌ Resultado inválido o vacío`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log('\n🎉 Pruebas completadas!');
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testModerationSystem().catch(console.error);
}

module.exports = { testModerationSystem };
