# Persianeitor - App de Gestión de Persianas

Aplicación completa para gestionar clientes y pedidos de tu negocio de persianas. Funciona offline y sincroniza automáticamente cuando el servidor está disponible.

## Estructura del Proyecto

```
Persianeitor/
├── backend/          # API Node.js + Express + SQLite
└── frontend/         # Aplicación Angular PWA
```

## Características

- ✅ **Offline First**: Funciona sin conexión usando IndexedDB
- ✅ **Sincronización Automática**: Sincroniza datos cuando el backend está online
- ✅ **PWA**: Instálate como app en tu móvil
- ✅ **Gestión de Clientes**: Crea, edita y elimina clientes
- ✅ **Gestión de Pedidos**: Crea, edita y elimina pedidos
- ✅ **Contabilidad**: Resumen mensual de ingresos (basado en pedidos cobrados)
- ✅ **Base de Datos Local**: SQLite en tu PC

## Instalación y Ejecución

### 1. Backend (Node.js)

```bash
cd backend
npm install
npm start
```

El backend estará disponible en: `http://localhost:3001`

### 2. Frontend (Angular)

```bash
cd frontend
npm install
npm start
```

La app estará disponible en: `http://localhost:4200`

## Cómo Funciona

### Sin Conexión
1. Los datos se guardan en **IndexedDB** (almacenamiento local del navegador)
2. Las operaciones (crear, editar, eliminar) se guardan en una cola de sincronización

### Con Conexión
1. La app detecta automáticamente que estás online
2. Sincroniza los datos locales con el servidor
3. Procesa la cola de sincronización pendiente

## Compartir la BD entre Máquinas

### Opción 1: Manual
1. En tu PC, cierra el backend
2. Copia el archivo `backend/persianeitor.db` a un USB
3. En el PC de tu pareja, pega el archivo en la carpeta `backend/`
4. Inicia el backend

### Opción 2: Google Drive / OneDrive
1. Coloca `backend/persianeitor.db` en tu nube (Google Drive, OneDrive)
2. Tu pareja descarga el archivo en su `backend/`
3. Sincroniza cuando necesites

## Variables de Entorno

### Backend (.env)
```
PORT=3001
NODE_ENV=development
```

## Estructura de BD

### Tabla: clientes
- id (PRIMARY KEY)
- nombre
- email
- telefono
- direccion
- ciudad
- codigoPostal
- createdAt
- updatedAt

### Tabla: pedidos
- id (PRIMARY KEY)
- clienteId (FOREIGN KEY)
- descripcion
- cantidad
- precio
- estado (pendiente, completado, cancelado)
- fechaEntrega
- createdAt
- updatedAt

### Tabla: sync_log
Registro automático de cambios para sincronización

## API Endpoints

### Clientes
- `GET /api/clientes` - Obtener todos
- `GET /api/clientes/:id` - Obtener uno
- `POST /api/clientes` - Crear
- `PUT /api/clientes/:id` - Actualizar
- `DELETE /api/clientes/:id` - Eliminar

### Pedidos
- `GET /api/pedidos` - Obtener todos
- `GET /api/pedidos/:id` - Obtener uno
- `POST /api/pedidos` - Crear
- `PUT /api/pedidos/:id` - Actualizar
- `DELETE /api/pedidos/:id` - Eliminar

### Contabilidad
- `GET /api/contabilidad/resumen-mensual` - Obtener ingresos sumados por mes

## Troubleshooting

### "No puedo conectar al backend"
- Asegúrate que el backend está corriendo (`npm start` en la carpeta backend)
- Verifica que estás en el puerto 3001

### "Los datos offline no se sincronizan"
- Abre las DevTools (F12) > Console
- Verifica que no hay errores
- Recarga la página cuando el backend esté online

### "BD corrupta o no inicia"
- Elimina `backend/persianeitor.db`
- Inicia el backend de nuevo (recreará la BD vacía)

## Próximas Mejoras

- [ ] Componentes UI (listados, formularios)
- [ ] Reportes y exportar PDF
- [ ] Búsqueda y filtros
- [ ] Autenticación básica
- [ ] Historial de cambios

---

¡A disfrutar de tu app de persianas! 🚀
