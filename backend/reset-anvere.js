const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'persianeitor.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('DB ERROR:', err.message);
    process.exit(1);
  }

  const newPassword = 'prueba1234';
  const hash = bcrypt.hashSync(newPassword, 10);
  // Ensure optional columns exist (safe ALTERs)
  db.run('ALTER TABLE usuarios ADD COLUMN resetToken TEXT', (aErr) => {
    if (aErr && !aErr.message.toLowerCase().includes('duplicate')) {
      console.warn('ALTER resetToken error:', aErr.message);
    }

    db.run('ALTER TABLE usuarios ADD COLUMN resetExpires INTEGER', (bErr) => {
      if (bErr && !bErr.message.toLowerCase().includes('duplicate')) {
        console.warn('ALTER resetExpires error:', bErr.message);
      }

      const sql = 'UPDATE usuarios SET passwordHash = ?, mustChangePassword = 1, activo = 1, updatedAt = CURRENT_TIMESTAMP WHERE username = ?';
      db.run(sql, [hash, 'anvere'], function (err) {
        if (err) {
          console.error('UPDATE ERROR:', err.message);
          process.exit(1);
        }
        console.log('Filas actualizadas:', this.changes);

        db.get('SELECT id, username, nombre, activo, mustChangePassword, createdAt, updatedAt FROM usuarios WHERE username = ?', ['anvere'], (err, row) => {
          if (err) {
            console.error('SELECT ERROR:', err.message);
          } else {
            console.log('Usuario actual:', row);
          }
          db.close();
        });
      });
    });
  });
});
