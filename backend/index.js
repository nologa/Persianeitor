const express = require('express');
const { Client } = require('pg'); // Importar el cliente de PostgreSQL
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Ruta de la BD
// Para Neon, usamos la URL de conexión directamente
const DATABASE_URL = process.env.DATABASE_URL;

// Inicializar BD
let client; // Cambiamos 'db' por 'client' para PostgreSQL
function initDB() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada. No se puede conectar a Neon.');
    return;
  }
  client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necesario para Render/Neon si no tienes un certificado específico
  });
  client.connect()
    .then(() => createTables())
    .catch(err => console.error('Error al conectar con la BD de Neon:', err.message));
}

// Crear tablas
function createTables() {
  // Usamos async/await para manejar las promesas de las consultas de PostgreSQL
  (async () => {
    try {
      // Tabla de clientes
      await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        "codigoPostal" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

      // Tabla de usuarios para login
      await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        rol TEXT DEFAULT 'admin',
        activo INTEGER DEFAULT 1,
        "mustChangePassword" INTEGER DEFAULT 0,
        "resetToken" TEXT,
        "resetExpires" INTEGER,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
      // PostgreSQL no tiene ALTER TABLE IF NOT EXISTS ADD COLUMN, así que lo hacemos con una consulta condicional
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE usuarios ADD COLUMN "mustChangePassword" INTEGER DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN END; $$;
      `);

      // Tabla de pedidos
      await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        "clienteId" INTEGER, -- Usar comillas para nombres de columna camelCase en PostgreSQL
        nombre TEXT,
        direccion TEXT,
        telefono TEXT,
        descripcion TEXT,
        cantidad INTEGER,
        precio REAL,
        presupuesto REAL,
        estado TEXT DEFAULT 'pendiente',
        "fechaEntrega" DATE,
        hora TEXT, -- PostgreSQL no tiene un tipo TIME sin zona horaria, TEXT es más flexible
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clienteId") REFERENCES clientes(id)
      )
    `);
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE pedidos ADD COLUMN presupuesto REAL;
        EXCEPTION WHEN duplicate_column THEN END; $$;
      `);

      // Tabla de materiales por pedido (mosquiteras, persianas, etc.)
      await client.query(`
      CREATE TABLE IF NOT EXISTS pedido_items (
        id SERIAL PRIMARY KEY,
        "pedidoId" INTEGER NOT NULL,
        tipo TEXT,
        producto TEXT,
        ancho REAL,
        alto REAL,
        color TEXT,
        material TEXT,
        cantidad INTEGER DEFAULT 1,
        notas TEXT,
        "enPedidoFabrica" INTEGER DEFAULT 0,
        descripcionFabrica TEXT,
        "estadoFabrica" TEXT DEFAULT 'pendiente',
        precioFabrica REAL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("pedidoId") REFERENCES pedidos(id)
      )
    `);
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE pedido_items ADD COLUMN descripcionFabrica TEXT;
        EXCEPTION WHEN duplicate_column THEN END; $$;
      `);
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE pedido_items ADD COLUMN "estadoFabrica" TEXT DEFAULT 'pendiente';
        EXCEPTION WHEN duplicate_column THEN END; $$;
      `);
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE pedido_items ADD COLUMN precioFabrica REAL;
        EXCEPTION WHEN duplicate_column THEN END; $$;
      `);

      // Tabla de sync para sincronización offline
      await client.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        tabla TEXT,
        operacion TEXT,
        "registroId" INTEGER,
        datos TEXT,
        sincronizado BOOLEAN DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

      // Tabla de notas
      await client.query(`
      CREATE TABLE IF NOT EXISTS notas (
        id SERIAL PRIMARY KEY,
        titulo TEXT,
        contenido TEXT NOT NULL,
        color TEXT DEFAULT '#F6F09F',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (err) {
      console.error('Error creando tablas:', err.message);
    }
  })();
}

// RUTAS - AUTENTICACIÓN
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Debes indicar usuario y contraseña' });
  }

  client.query( // Usar client.query para PostgreSQL
    'SELECT id, username, nombre, "passwordHash", rol, activo, "mustChangePassword" FROM usuarios WHERE username = $1',
    [username]
  ).then(result => {
    const usuario = result.rows[0]; // PostgreSQL devuelve los resultados en result.rows
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
  }).catch(err => res.status(500).json({ error: err.message }));
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

  client.query('SELECT id, "passwordHash", activo FROM usuarios WHERE id = $1', [userId])
    .then(result => {
      const usuario = result.rows[0];
    if (!usuario || !usuario.activo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const passwordValida = bcrypt.compareSync(currentPassword, usuario.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
      client.query(
        'UPDATE usuarios SET "passwordHash" = $1, "mustChangePassword" = 0, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      ).then(() => {
        res.json({ message: 'Contraseña actualizada correctamente' });
      }).catch(updateErr => {
        res.status(500).json({ error: updateErr.message });
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
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

    client.query('SELECT id, username, nombre FROM usuarios WHERE username = $1', [username])
      .then(result => {
        const user = result.rows[0];
        if (!user) return res.status(200).json({ message: 'Si el usuario existe, recibirás un correo con instrucciones' });
      const token = uuidv4();
      const expires = Date.now() + 1000 * 60 * 60; // 1 hora
      client.query('UPDATE usuarios SET "resetToken" = $1, "resetExpires" = $2 WHERE id = $3', [token, expires, user.id])
        .then(() => {
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
      }).catch(uerr => res.status(500).json({ error: uerr.message }));
    }).catch(err => res.status(500).json({ error: err.message }));
  } catch (error) {
    console.error('Error en /api/auth/forgot:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/reset
app.post('/api/auth/reset', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });

  client.query('SELECT id, "resetExpires" FROM usuarios WHERE "resetToken" = $1', [token])
    .then(result => {
      const user = result.rows[0];
      if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });
      if (!user.resetExpires || user.resetExpires < Date.now()) return res.status(400).json({ error: 'Token expirado' });
    const passwordHash = bcrypt.hashSync(password, 10);
      client.query('UPDATE usuarios SET "passwordHash" = $1, "mustChangePassword" = 0, "resetToken" = NULL, "resetExpires" = NULL WHERE id = $2', [passwordHash, user.id])
        .then(() => res.json({ message: 'Contraseña restablecida correctamente' }))
        .catch(uerr => res.status(500).json({ error: uerr.message }));
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// POST /api/auth/google
app.post('/api/auth/google', (_req, res) => {
  return res.status(403).json({ error: 'El inicio de sesión con Google está deshabilitado' });
});

// RUTAS - CLIENTES
app.get('/api/clientes', (req, res) => {
  client.query('SELECT * FROM clientes ORDER BY "createdAt" DESC')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/clientes/:id', (req, res) => {
  client.query('SELECT * FROM clientes WHERE id = $1', [req.params.id])
    .then(result => {
      if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json(result.rows[0]);
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/clientes', (req, res) => {
  const { nombre, email, telefono, direccion, ciudad, codigoPostal } = req.body;
  client.query(
    `INSERT INTO clientes (nombre, email, telefono, direccion, ciudad, "codigoPostal")
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, // RETURNING id para obtener el ID insertado
    [nombre, email, telefono, direccion, ciudad, codigoPostal]
  ).then(result => {
    res.json({ id: result.rows[0].id, nombre, email, telefono, direccion, ciudad, codigoPostal });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/clientes/:id', (req, res) => {
  const { nombre, email, telefono, direccion, ciudad, codigoPostal } = req.body;
  client.query(
    `UPDATE clientes SET nombre = $1, email = $2, telefono = $3, direccion = $4, ciudad = $5, "codigoPostal" = $6, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [nombre, email, telefono, direccion, ciudad, codigoPostal, req.params.id]
  ).then(() => {
    res.json({ message: 'Cliente actualizado' });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/clientes/:id', (req, res) => {
  client.query('DELETE FROM clientes WHERE id = $1', [req.params.id])
    .then(() => res.json({ message: 'Cliente eliminado' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// RUTAS - PEDIDOS
app.get('/api/pedidos', (req, res) => {
  // Primero limpiar clienteId vacíos
  client.query(`UPDATE pedidos SET "clienteId" = NULL WHERE "clienteId" = ''`)
    .catch(cleanupErr => console.error('Error limpiando clienteId:', cleanupErr));
  
  client.query(`
    SELECT p.*, c.nombre as clienteNombre
    FROM pedidos p
    LEFT JOIN clientes c ON p."clienteId" = c.id
    ORDER BY p."createdAt" DESC
  `).then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/pedidos/:id', (req, res) => {
  client.query(
    `SELECT p.*, c.nombre as clienteNombre FROM pedidos p
     LEFT JOIN clientes c ON p."clienteId" = c.id
     WHERE p.id = $1`,
    [req.params.id]
  ).then(result => {
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(result.rows[0]);
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/pedidos', (req, res) => {
  let { clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora } = req.body;
  // Convertir clienteId vacío a null
  clienteId = clienteId && clienteId !== '' ? clienteId : null;
  cantidad = cantidad === '' || cantidad === undefined || cantidad === null ? null : Number(cantidad);
  precio = precio === '' || precio === undefined || precio === null ? null : Number(precio);
  presupuesto = presupuesto === '' || presupuesto === undefined || presupuesto === null ? null : Number(presupuesto);
  fechaEntrega = fechaEntrega && fechaEntrega !== '' ? fechaEntrega : null;
  hora = hora && hora !== '' ? hora : null;

  if ((cantidad !== null && Number.isNaN(cantidad)) || (precio !== null && Number.isNaN(precio)) || (presupuesto !== null && Number.isNaN(presupuesto))) {
    return res.status(400).json({ error: 'Cantidad, precio y presupuesto deben ser números válidos' });
  }

  client.query(
    `INSERT INTO pedidos ("clienteId", nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, "fechaEntrega", hora)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado || 'pendiente', fechaEntrega, hora]
  ).then(result => {
    res.json({ id: result.rows[0].id, clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/pedidos/:id', (req, res) => {
  let { clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora } = req.body;
  // Convertir clienteId vacío a null
  clienteId = clienteId && clienteId !== '' ? clienteId : null;
  cantidad = cantidad === '' || cantidad === undefined || cantidad === null ? null : Number(cantidad);
  precio = precio === '' || precio === undefined || precio === null ? null : Number(precio);
  presupuesto = presupuesto === '' || presupuesto === undefined || presupuesto === null ? null : Number(presupuesto);
  fechaEntrega = fechaEntrega && fechaEntrega !== '' ? fechaEntrega : null;
  hora = hora && hora !== '' ? hora : null;

  if ((cantidad !== null && Number.isNaN(cantidad)) || (precio !== null && Number.isNaN(precio)) || (presupuesto !== null && Number.isNaN(presupuesto))) {
    return res.status(400).json({ error: 'Cantidad, precio y presupuesto deben ser números válidos' });
  }

  client.query(
    `UPDATE pedidos SET "clienteId" = $1, nombre = $2, direccion = $3, telefono = $4, descripcion = $5, cantidad = $6, precio = $7, presupuesto = $8, estado = $9, "fechaEntrega" = $10, hora = $11, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $12`,
    [clienteId, nombre, direccion, telefono, descripcion, cantidad, precio, presupuesto, estado, fechaEntrega, hora, req.params.id]
  ).then(() => {
    res.json({ message: 'Pedido actualizado' });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/pedidos/:id', (req, res) => {
  client.query('DELETE FROM pedidos WHERE id = $1', [req.params.id])
    .then(() => res.json({ message: 'Pedido eliminado' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// RUTAS - MATERIALES DE PEDIDOS
app.get('/api/pedido-items', (req, res) => {
  client.query('SELECT * FROM pedido_items ORDER BY "createdAt" DESC')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/pedido-items/:id', (req, res) => {
  client.query('SELECT * FROM pedido_items WHERE id = $1', [req.params.id])
    .then(result => {
      if (result.rows.length === 0) return res.status(404).json({ error: 'Item no encontrado' });
      res.json(result.rows[0]);
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/pedidos/:id/items', (req, res) => {
  client.query(
    'SELECT * FROM pedido_items WHERE "pedidoId" = $1 ORDER BY "createdAt" DESC',
    [req.params.id]
  ).then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/pedido-items', (req, res) => {
  const { pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica } = req.body;
  client.query(
    `INSERT INTO pedido_items ("pedidoId", tipo, producto, ancho, alto, color, material, cantidad, notas, "enPedidoFabrica")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [pedidoId, tipo, producto, ancho, alto, color, material, cantidad || 1, notas, enPedidoFabrica ? 1 : 0]
  ).then(result => {
    res.json({ id: result.rows[0].id, pedidoId, tipo, producto, ancho, alto, color, material, cantidad: cantidad || 1, notas, enPedidoFabrica: enPedidoFabrica ? 1 : 0 });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/pedido-items/:id', (req, res) => {
  const { pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica } = req.body;
  client.query(
    `UPDATE pedido_items SET "pedidoId" = $1, tipo = $2, producto = $3, ancho = $4, alto = $5, color = $6, material = $7, cantidad = $8, notas = $9, "enPedidoFabrica" = $10, "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $11`,
    [pedidoId, tipo, producto, ancho, alto, color, material, cantidad, notas, enPedidoFabrica ? 1 : 0, req.params.id]
  ).then(() => {
    res.json({ message: 'Item actualizado' });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/pedido-items/:id', (req, res) => {
  client.query('DELETE FROM pedido_items WHERE id = $1', [req.params.id])
    .then(() => res.json({ message: 'Item eliminado' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// RUTAS - PEDIDOS FÁBRICA
app.get('/api/fabrica/items', (req, res) => {
  client.query(
    `SELECT i.*, p.nombre as clienteNombre, p.direccion as clienteDireccion, p."fechaEntrega"
     FROM pedido_items i
     LEFT JOIN pedidos p ON i."pedidoId" = p.id
     WHERE i."enPedidoFabrica" = 1
     ORDER BY i."updatedAt" DESC`
  ).then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});
// RUTAS - NOTAS
app.get('/api/notas', (req, res) => {
  client.query('SELECT * FROM notas ORDER BY "updatedAt" DESC')
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/notas/:id', (req, res) => {
  client.query('SELECT * FROM notas WHERE id = $1', [req.params.id])
    .then(result => {
      if (result.rows.length === 0) return res.status(404).json({ error: 'Nota no encontrada' });
      res.json(result.rows[0]);
    }).catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/notas', (req, res) => {
  const { titulo, contenido, color } = req.body;
  client.query(
    'INSERT INTO notas (titulo, contenido, color) VALUES ($1, $2, $3) RETURNING id',
    [titulo || '', contenido, color || '#F6F09F']
  ).then(result => {
    res.json({ id: result.rows[0].id, titulo, contenido, color });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/notas/:id', (req, res) => {
  const { titulo, contenido, color } = req.body;
  client.query(
    'UPDATE notas SET titulo = $1, contenido = $2, color = $3, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id',
    [titulo || '', contenido, color || '#F6F09F', req.params.id]
  ).then(result => {
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ id: req.params.id, titulo, contenido, color });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.delete('/api/notas/:id', (req, res) => {
  client.query('DELETE FROM notas WHERE id = $1', [req.params.id])
    .then(result => {
      if (result.rowCount === 0) return res.status(404).json({ error: 'Nota no encontrada' });
      res.json({ success: true });
    }).catch(err => res.status(500).json({ error: err.message }));
});

// RUTAS - CONTABILIDAD
app.get('/api/contabilidad/resumen-mensual', (req, res) => {
  const { year } = req.query; // Filtro opcional por año

  let query = `
    SELECT
      TO_CHAR("fechaEntrega", 'YYYY-MM') AS mes,
      SUM(precio) AS totalIngresos
    FROM pedidos
    WHERE estado = 'cobrado' AND "fechaEntrega" IS NOT NULL
  `;
  const params = [];

  if (year) {
    query += ` AND TO_CHAR("fechaEntrega", 'YYYY') = $1`;
    params.push(year);
  }

  query += `
    GROUP BY mes
    ORDER BY mes DESC;
  `;

  client.query(query, params)
    .then(result => res.json(result.rows))
    .catch(err => res.status(500).json({ error: err.message }));
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
