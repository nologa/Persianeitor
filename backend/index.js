const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_TEST_USERNAME = process.env.TEST_USERNAME || 'anvere';
const DEFAULT_TEST_PASSWORD = process.env.TEST_PASSWORD || 'prueba1234';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Middleware
app.use(cors());
app.use(express.json());

// Ruta de la BD
const dbPath = path.join(__dirname, 'persianeitor.db');

// Inicializar BD
let db;
function initDB() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar con la BD:', err.message);
    } else {
      createTables();
    }
  });
}

// Crear tablas
function createTables() {
  db.serialize(() => {
    // Tabla de clientes
    db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        codigoPostal TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de usuarios para login
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        rol TEXT DEFAULT 'admin',
        activo INTEGER DEFAULT 1,
        mustChangePassword INTEGER DEFAULT 0,
        resetToken TEXT,
        resetExpires INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run('ALTER TABLE usuarios ADD COLUMN mustChangePassword INTEGER DEFAULT 0', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna mustChangePassword:', err.message);
      }
    });

    // Tabla de pedidos
    db.run(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clienteId INTEGER,
        nombre TEXT,
        direccion TEXT,
        telefono TEXT,
        descripcion TEXT,
        cantidad INTEGER,
        precio REAL,
        presupuesto REAL,
        estado TEXT DEFAULT 'pendiente',
        fechaEntrega DATE,
        hora TIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clienteId) REFERENCES clientes(id)
      )
    `);

    db.run('ALTER TABLE pedidos ADD COLUMN presupuesto REAL', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna presupuesto:', err.message);
      }
    });

    // Tabla de materiales por pedido (mosquiteras, persianas, etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS pedido_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedidoId INTEGER NOT NULL,
        tipo TEXT,
        producto TEXT,
        ancho REAL,
        alto REAL,
        color TEXT,
        material TEXT,
        cantidad INTEGER DEFAULT 1,
        notas TEXT,
        enPedidoFabrica INTEGER DEFAULT 0,
        descripcionFabrica TEXT,
        estadoFabrica TEXT DEFAULT 'pendiente',
        precioFabrica REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedidoId) REFERENCES pedidos(id)
      )
    `);

    // Agregar columnas de fábrica si no existen
    db.run('ALTER TABLE pedido_items ADD COLUMN descripcionFabrica TEXT', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna descripcionFabrica:', err.message);
      }
    });
    
    db.run('ALTER TABLE pedido_items ADD COLUMN estadoFabrica TEXT DEFAULT "pendiente"', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna estadoFabrica:', err.message);
      }
    });
    
    db.run('ALTER TABLE pedido_items ADD COLUMN precioFabrica REAL', (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna precioFabrica:', err.message);
      }
    });

    // Tabla de sync para sincronización offline
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabla TEXT,
        operacion TEXT,
        registroId INTEGER,
        datos TEXT,
        sincronizado BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de notas
    db.run(`
      CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        contenido TEXT NOT NULL,
        color TEXT DEFAULT '#F6F09F',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creando tabla notas:', err.message);
      }
    });
  });
}

// RUTAS - AUTENTICACIÓN
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Debes indicar usuario y contraseña' });
  }

  db.get(
    'SELECT id, username, nombre, passwordHash, rol, activo, mustChangePassword FROM usuarios WHERE username = ?',
    [username],
    (err, usuario) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!usuario || !usuario.activo) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const passwordValida = bcrypt.compareSync(password, usuario.passwordHash);

      if (!passwordValida) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      res.json({
        user: {
          id: usuario.id,
          username: usuario.username,
          nombre: usuario.nombre,
          rol: usuario.rol,
          mustChangePassword: !!usuario.mustChangePassword
        }
      });
    }
  );
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Debes indicar usuario, contraseña actual y nueva contraseña' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  db.get('SELECT id, passwordHash, activo FROM usuarios WHERE id = ?', [userId], (err, usuario) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!usuario || !usuario.activo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const passwordValida = bcrypt.compareSync(currentPassword, usuario.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.run(
      'UPDATE usuarios SET passwordHash = ?, mustChangePassword = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        return res.json({ message: 'Contraseña actualizada correctamente' });
      }
    );
  });
});

// POST /api/auth/forgot
app.post('/api/auth/forgot', async (req, res) => {
  try {
    const { username, recaptchaToken } = req.body;

    if (!username) return res.status(400).json({ error: 'Usuario requerido' });

    if (!RECAPTCHA_SECRET) {
      console.warn('RECAPTCHA_SECRET no configurado; salto verificación');
    } else {
      if (!recaptchaToken) return res.status(400).json({ error: 'reCAPTCHA token requerido' });
      const resp = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(recaptchaToken)}`
      );
      if (!resp.data.success) return res.status(400).json({ error: 'reCAPTCHA inválido' });
    }

    db.get('SELECT id, username, nombre FROM usuarios WHERE username = ?', [username], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(200).json({ message: 'Si el usuario existe, recibirás un correo con instrucciones' });

      const token = uuidv4();
      const expires = Date.now() + 1000 * 60 * 60; // 1 hora
      db.run('UPDATE usuarios SET resetToken = ?, resetExpires = ? WHERE id = ?', [token, expires, user.id], (uerr) => {
        if (uerr) return res.status(500).json({ error: uerr.message });

        const resetLink = `${FRONTEND_URL}/reset?token=${token}`;

        // Send email if SMTP configured
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS }
          });

          const mailOptions = {
            from: SMTP_USER,
            to: user.username,
            subject: 'Recuperación de contraseña - Persianeitor',
            text: `Hola ${user.nombre},
Usa el siguiente enlace para restablecer tu contraseña (válido 1 hora): ${resetLink}`,
            html: `<p>Hola ${user.nombre},</p><p>Usa el siguiente enlace para restablecer tu contraseña (válido 1 hora):</p><p><a href="${resetLink}">${resetLink}</a></p>`
          };

          transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
              console.error('Error enviando mail:', mailErr.message);
              return res.status(200).json({ message: 'Si el usuario existe, recibirás un correo con instrucciones' });
            }
            return res.status(200).json({ message: 'Si el usuario existe, recibirás un correo con instrucciones' });
          });
        } else {
          return res.status(200).json({ message: 'Si el usuario existe, recibirás un correo con instrucciones' });
        }
      });
    });
  } catch (error) {
    console.error('Error en /api/auth/forgot:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/reset
app.post('/api/auth/reset', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });

  db.get('SELECT id, resetExpires FROM usuarios WHERE resetToken = ?', [token], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });
    if (!user.resetExpires || user.resetExpires < Date.now()) return res.status(400).json({ error: 'Token expirado' });

    const passwordHash = bcrypt.hashSync(password, 10);
    db.run('UPDATE usuarios SET passwordHash = ?, mustChangePassword = 0, resetToken = NULL, resetExpires = NULL WHERE id = ?', [passwordHash, user.id], (uerr) => {
      if (uerr) return res.status(500).json({ error: uerr.message });
      res.json({ message: 'Contraseña restablecida correctamente' });
    });
  });
});

// POST /api/auth/google
app.post('/api/auth/google', (_req, res) => {
  return res.status(403).json({ error: 'El inicio de sesión con Google está deshabilitado' });
});

// RUTAS - CLIENTES
app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/clientes/:id', (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Cliente no encontrado' });
    } else {
      res.json(row);
    }
  });
});

app.post('/api/clientes', (req, res) => {
  const { nombre, email, telefono, direccion, ciudad, codigoPostal } = req.body;
  db.run(
    `INSERT INTO clientes (nombre, email, telefono, direccion, ciudad, codigoPostal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, email, telefono, direccion, ciudad, codigoPostal],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, nombre, email, telefono, direccion, ciudad, codigoPostal });
      }
    }
  );
});

app.put('/api/clientes/:id', (req, res) => {
  const { nombre, email, telefono, direccion, ciudad, codigoPostal } = req.body;
  db.run(
    `UPDATE clientes SET nombre = ?, email = ?, telefono = ?, direccion = ?, ciudad = ?, codigoPostal = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nombre, email, telefono, direccion, ciudad, codigoPostal, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Cliente actualizado' });
      }
    }
  );
});

app.delete('/api/clientes/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Cliente eliminado' });
    }
  });
});

// RUTAS - PEDIDOS
app.get('/api/pedidos', (req, res) => {
  // Primero limpiar clienteId vacíos
  db.run(`UPDATE pedidos SET clienteId = NULL WHERE clienteId = ''`, (cleanupErr) => {
    if (cleanupErr) console.error('Error limpiando clienteId:', cleanupErr);
  });
  
  db.all(`
    SELECT p.*, c.nombre as clienteNombre
    FROM pedidos p
    LEFT JOIN clientes c ON p.clienteId = c.id
    ORDER BY p.createdAt DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/pedidos/:id', (req, res) => {
  db.get(
    `SELECT p.*, c.nombre as clienteNombre FROM pedidos p
     LEFT JOIN clientes c ON p.clienteId = c.id
     WHERE p.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!row) {
        res.status(404).json({ error: 'Pedido no encontrado' });
      } else {
        res.json(row);
      }
    }
  );
});

app.post('/api/pedidos', (req, res) => {
  let { clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora } = req.body;
  // Convertir clienteId vacío a null
  clienteId = clienteId && clienteId !== '' ? clienteId : null;
  db.run(
    `INSERT INTO pedidos (clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado || 'pendiente', fechaEntrega, hora],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora });
      }
    }
  );
});

app.put('/api/pedidos/:id', (req, res) => {
  let { clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora } = req.body;
  // Convertir clienteId vacío a null
  clienteId = clienteId && clienteId !== '' ? clienteId : null;
  db.run(
    `UPDATE pedidos SET clienteId = ?, nombre = ?, direccion = ?, telefono = ?, descripcion = ?, cantidad = ?, precio = ?, presupuesto = ?, estado = ?, fechaEntrega = ?, hora = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Pedido actualizado' });
      }
    }
  );
});

app.delete('/api/pedidos/:id', (req, res) => {
  db.run('DELETE FROM pedidos WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Pedido eliminado' });
    }
  });
});

// RUTAS - MATERIALES DE PEDIDOS
app.get('/api/pedido-items', (req, res) => {
  db.all('SELECT * FROM pedido_items ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/pedido-items/:id', (req, res) => {
  db.get('SELECT * FROM pedido_items WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Item no encontrado' });
    } else {
      res.json(row);
    }
  });
});

app.get('/api/pedidos/:id/items', (req, res) => {
  db.all(
    'SELECT * FROM pedido_items WHERE pedidoId = ? ORDER BY createdAt DESC',
    [req.params.id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

app.post('/api/pedido-items', (req, res) => {
  const { pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica } = req.body;
  db.run(
    `INSERT INTO pedido_items (pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pedidoId, tipo, producto, ancho, alto, color, material, cantidad || 1, notas, enPedidoFabrica ? 1 : 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, pedidoId, tipo, producto, ancho, alto, color, material, cantidad: cantidad || 1, notas, enPedidoFabrica: enPedidoFabrica ? 1 : 0 });
      }
    }
  );
});

app.put('/api/pedido-items/:id', (req, res) => {
  const { pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica } = req.body;
  db.run(
    `UPDATE pedido_items SET pedidoId = ?, tipo = ?, producto = ?, ancho = ?, alto = ?, color = ?, material = ?, cantidad = ?, notas = ?, enPedidoFabrica = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica ? 1 : 0, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Item actualizado' });
      }
    }
  );
});

app.delete('/api/pedido-items/:id', (req, res) => {
  db.run('DELETE FROM pedido_items WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Item eliminado' });
    }
  });
});

// RUTAS - PEDIDOS FÁBRICA
app.get('/api/fabrica/items', (req, res) => {
  db.all(
    `SELECT i.*, p.nombre as clienteNombre, p.direccion as clienteDireccion, p.fechaEntrega
     FROM pedido_items i
     LEFT JOIN pedidos p ON i.pedidoId = p.id
     WHERE i.enPedidoFabrica = 1
     ORDER BY i.updatedAt DESC`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});
// RUTAS - NOTAS
app.get('/api/notas', (req, res) => {
  db.all('SELECT * FROM notas ORDER BY updatedAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/notas/:id', (req, res) => {
  db.get('SELECT * FROM notas WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Nota no encontrada' });
    } else {
      res.json(row);
    }
  });
});

app.post('/api/notas', (req, res) => {
  const { titulo, contenido, color } = req.body;
  db.run(
    'INSERT INTO notas (titulo, contenido, color) VALUES (?, ?, ?)',
    [titulo || '', contenido, color || '#F6F09F'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, titulo, contenido, color });
      }
    }
  );
});

app.put('/api/notas/:id', (req, res) => {
  const { titulo, contenido, color } = req.body;
  db.run(
    'UPDATE notas SET titulo = ?, contenido = ?, color = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [titulo || '', contenido, color || '#F6F09F', req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Nota no encontrada' });
      } else {
        res.json({ id: req.params.id, titulo, contenido, color });
      }
    }
  );
});

app.delete('/api/notas/:id', (req, res) => {
  db.run('DELETE FROM notas WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Nota no encontrada' });
    } else {
      res.json({ success: true });
    }
  });
});

// RUTAS - CONTABILIDAD
app.get('/api/contabilidad/resumen-mensual', (req, res) => {
  const { year } = req.query; // Filtro opcional por año

  let query = `
    SELECT
      strftime('%Y-%m', fechaEntrega) AS mes,
      SUM(precio) AS totalIngresos
    FROM pedidos
    WHERE estado = 'cobrado' AND fechaEntrega IS NOT NULL
  `;
  const params = [];

  if (year) {
    query += ` AND strftime('%Y', fechaEntrega) = ?`;
    params.push(year);
  }

  query += `
    GROUP BY mes
    ORDER BY mes DESC;
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  initDB();
});
