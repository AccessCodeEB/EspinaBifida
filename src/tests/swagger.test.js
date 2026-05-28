import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerConfig } from '../config/swagger.js';

describe('OpenAPI spec (swagger-jsdoc)', () => {
  let spec;

  beforeAll(() => {
    spec = swaggerJsdoc(swaggerConfig);
  });

  test('genera un objeto de spec definido', () => {
    expect(spec).toBeDefined();
    expect(typeof spec).toBe('object');
  });

  test('versión OpenAPI es 3.0.0', () => {
    expect(spec.openapi).toBe('3.0.0');
  });

  test('info tiene título y versión', () => {
    expect(spec.info.title).toContain('Espina Bífida');
    expect(spec.info.version).toBeDefined();
  });

  test('define el esquema de seguridad bearerAuth', () => {
    const schemes = spec.components?.securitySchemes;
    expect(schemes).toBeDefined();
    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bearerAuth.type).toBe('http');
    expect(schemes.bearerAuth.scheme).toBe('bearer');
  });

  test('define schemas de componentes reutilizables', () => {
    const schemas = spec.components?.schemas;
    expect(schemas).toBeDefined();
    const required = [
      'Beneficiario', 'Credencial', 'Servicio', 'Articulo',
      'Cita', 'Notificacion', 'Administrador', 'MovimientoInventario',
      'Error400', 'Error401', 'Error403', 'Error404', 'Error409', 'Error500',
      'PaginatedResponse', 'FileUploadSchema',
    ];
    for (const name of required) {
      expect(schemas[name]).toBeDefined();
    }
  });

  test('la propiedad paths está definida', () => {
    expect(spec.paths).toBeDefined();
  });

  test('los servidores incluyen localhost:3000', () => {
    const urls = spec.servers?.map(s => s.url) ?? [];
    expect(urls).toContain('http://localhost:3000');
  });
});
