import { schemas } from './swagger.schemas.js';
import { REPO_ROOT } from '../repoRoot.js';
import path from 'node:path';

/**
 * Configuración de swagger-jsdoc para el sistema Espina Bífida.
 *
 * Genera documentación OpenAPI 3.0 a partir de comentarios JSDoc en los archivos de rutas.
 * Solo disponible en entornos de desarrollo/staging (guard NODE_ENV !== 'production' en app.js).
 */
export const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API — Sistema de Gestión Espina Bífida',
      version: '1.0.0',
      description: `
## Sistema de Gestión para la Asociación de Espina Bífida

API REST para gestionar beneficiarios, membresías, servicios médicos, inventario, citas, reportes y administradores.

### Convención de nomenclatura

> ⚠️ **Asimetría intencional entre request y response:**
> - Los **bodies de request** usan **camelCase** (ej: \`curp\`, \`nombreCompleto\`, \`fechaNacimiento\`)
> - Las **respuestas** devuelven campos en **UPPER_SNAKE_CASE** (ej: \`CURP\`, \`NOMBRE_COMPLETO\`, \`FECHA_NACIMIENTO\`) porque provienen directamente de Oracle Database.

### Autenticación

Usar **POST /administradores/login** para obtener el token JWT. Luego hacer clic en **Authorize** e introducir el token.

**Credenciales de prueba (entorno de desarrollo):**
- Email: \`admin@espinabifida.mx\`
- Password: \`Admin123\`

### Versionado

Algunos módulos tienen rutas duplicadas para compatibilidad:
- Rutas legacy: \`/beneficiarios\`, \`/membresias\`, \`/inventario\`, ...
- Rutas v1: \`/api/v1/beneficiarios\`, \`/api/v1/membresias\`, \`/api/v1/inventario\`, ...

Las rutas v1 pueden incluir funcionalidades adicionales documentadas en los tags **v1**.
      `.trim(),
      contact: {
        name: 'Equipo AccessCode EB',
        email: 'admin@espinabifida.mx',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://staging.espinabifida.mx',
        description: 'Servidor de staging',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Usar **POST /administradores/login** para obtener el token JWT. Demo: email=admin@espinabifida.mx, password=Admin123',
        },
      },
      schemas,
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y gestión de sesión' },
      { name: 'Administradores', description: 'CRUD de administradores del sistema' },
      { name: 'Beneficiarios', description: 'Gestión de beneficiarios (legacy: /beneficiarios)' },
      { name: 'Beneficiarios v1', description: 'Beneficiarios con pre-registros (/api/v1/beneficiarios)' },
      { name: 'Membresías', description: 'Credenciales y vigencia de membresías (legacy)' },
      { name: 'Membresías v1', description: 'Membresías con estado y método de pago (/api/v1/membresias)' },
      { name: 'Servicios', description: 'Registro de servicios médicos y comodatos' },
      { name: 'Artículos', description: 'Catálogo de artículos e inventario' },
      { name: 'Inventario', description: 'Movimientos de inventario (legacy)' },
      { name: 'Inventario v1', description: 'Movimientos de inventario (/api/v1/inventario)' },
      { name: 'Reportes', description: 'Generación y descarga de reportes PDF/XLSX' },
      { name: 'Citas', description: 'Gestión de citas médicas' },
      { name: 'Notificaciones', description: 'Panel de notificaciones del sistema' },
      { name: 'Catálogos', description: 'Catálogos de solo lectura (servicios-catálogo, especialistas)' },
      { name: 'Roles', description: 'Listado de roles del sistema' },
      { name: 'Configuración', description: 'Configuración general (solo rol 1)' },
    ],
  },
  apis: [
    path.join(REPO_ROOT, 'src/routes/*.routes.js'),
    path.join(REPO_ROOT, 'src/routes/*.v1.routes.js'),
  ],
};
