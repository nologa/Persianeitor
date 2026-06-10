const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'persianeitor.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la BD:', err.message);
    process.exit(1);
  }
  
  console.log('Conectado a SQLite');
  
  // Obtener estructura de la tabla pedidos
  db.all("PRAGMA table_info(pedidos)", (err, rows) => {
    if (err) {
      console.error('Error obteniendo estructura:', err);
    } else {
      console.log('\n=== ESTRUCTURA TABLA PEDIDOS ===');
      console.table(rows);
    }
    
    // Obtener últimos pedidos
    db.all('SELECT * FROM pedidos ORDER BY id DESC LIMIT 5', (err, rows) => {
      if (err) {
        console.error('Error obteniendo pedidos:', err);
      } else {
        console.log('\n=== ÚLTIMOS 5 PEDIDOS ===');
        console.table(rows);
      }
      
      db.close();
    });
  });
});
