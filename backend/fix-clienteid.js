const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('persianeitor.db');

db.run(`UPDATE pedidos SET clienteId = NULL WHERE clienteId = ''`, (err) => {
  if (err) {
    console.error('Error limpiando clienteId:', err);
  } else {
    console.log('ClienteId vacíos limpiados correctamente');
    
    // Verificar
    db.all(`SELECT id, nombre, clienteId FROM pedidos`, (err, rows) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('\nEstado de los pedidos:');
        console.log(rows);
      }
      db.close();
    });
  }
});
