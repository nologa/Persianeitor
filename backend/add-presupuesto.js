const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'persianeitor.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la BD:', err.message);
    process.exit(1);
  }
  
  console.log('Conectado a SQLite');
  
  // Agregar columna presupuesto
  db.run('ALTER TABLE pedidos ADD COLUMN presupuesto REAL', (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✓ La columna presupuesto ya existe');
      } else {
        console.error('Error agregando columna:', err.message);
      }
    } else {
      console.log('✓ Columna presupuesto agregada exitosamente');
    }
    
    // Verificar estructura actualizada
    db.all("PRAGMA table_info(pedidos)", (err, rows) => {
      if (err) {
        console.error('Error obteniendo estructura:', err);
      } else {
        console.log('\n=== ESTRUCTURA ACTUALIZADA ===');
        console.table(rows);
      }
      
      db.close();
    });
  });
});
