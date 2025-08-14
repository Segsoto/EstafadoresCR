const { addReport } = require('./database');

// Datos de ejemplo para poblar la base de datos
const sampleReports = [
  {
    phoneNumber: '88765432',
    scamType: 'simpe',
    description: 'Me llamaron diciendo que era del Banco Nacional y que necesitaban que les confirmara mi PIN de SIMPE Móvil porque había un "problema de seguridad". Cuando les dije que iba a llamar al banco directamente, colgaron inmediatamente. ¡Cuidado!',
    imagePath: null,
    ipHash: 'hash1_example'
  },
  {
    phoneNumber: '61234567',
    scamType: 'familiar',
    description: 'Recibí un WhatsApp de este número diciendo "Hola mamá, perdí mi teléfono y este es mi nuevo número. Necesito que me deposites ₡50,000 urgente para pagar algo importante". Yo no tengo hijos. Es una estafa del falso familiar muy común.',
    imagePath: null,
    ipHash: 'hash2_example'
  },
  {
    phoneNumber: '71598753',
    scamType: 'phishing',
    description: 'Me escribieron por WhatsApp diciendo que ganado una tarjeta de regalo de ₡100,000 de AutoMercado y que para reclamarla tenía que dar mis datos bancarios completos. Obviamente es falso, AutoMercado nunca pide datos bancarios por WhatsApp.',
    imagePath: null,
    ipHash: 'hash3_example'
  },
  {
    phoneNumber: '84567890',
    scamType: 'trabajo',
    description: 'Me contactaron ofreciendo trabajo desde casa con "ganancias de hasta $2000 mensuales sin experiencia". Pedían un depósito inicial de ₡25,000 para "materiales de trabajo". Es estafa, ningún trabajo real pide dinero por adelantado.',
    imagePath: null,
    ipHash: 'hash4_example'
  },
  {
    phoneNumber: '72468135',
    scamType: 'gobierno',
    description: 'Llamada automática diciendo que era del Ministerio de Hacienda y que tenía una deuda tributaria que debía pagar inmediatamente o habría consecuencias legales. Me dieron un número de cuenta y todo. Verifiqué con Hacienda y no tengo ninguna deuda.',
    imagePath: null,
    ipHash: 'hash5_example'
  }
];

async function seedDatabase() {
  console.log('🌱 Agregando reportes de ejemplo...');
  
  try {
    for (let i = 0; i < sampleReports.length; i++) {
      const report = sampleReports[i];
      const result = await addReport(
        report.phoneNumber,
        report.scamType,
        report.description,
        report.imagePath,
        report.ipHash
      );
      console.log(`✅ Reporte ${i + 1}/5 agregado: ${report.phoneNumber} (${report.scamType})`);
      
      // Pequeña pausa para que las fechas sean diferentes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('🎉 ¡Todos los reportes de ejemplo han sido agregados exitosamente!');
    console.log('📱 Ahora puedes ver los reportes en http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error al agregar reportes:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const { initDatabase } = require('./database');
  
  // Asegurar que la base de datos está inicializada
  initDatabase();
  
  // Esperar un momento para que la DB esté lista
  setTimeout(() => {
    seedDatabase().then(() => {
      console.log('✨ Proceso completado. Puedes cerrar esta ventana.');
      process.exit(0);
    });
  }, 1000);
}

module.exports = { seedDatabase, sampleReports };
