/**
 * Schemas reutilizables de OpenAPI 3.0 para los modelos Oracle del sistema.
 *
 * NOTA IMPORTANTE sobre nomenclatura:
 * - Las RESPUESTAS del servidor devuelven campos en UPPER_SNAKE_CASE
 *   (ej: NOMBRE_COMPLETO, FECHA_NACIMIENTO) porque vienen directamente de Oracle.
 * - Los BODIES de request usan camelCase (ej: nombreCompleto, fechaNacimiento).
 */

export const schemas = {
  // ─────────────────────────────────────────────
  // MODELOS DE DATOS
  // ─────────────────────────────────────────────

  Beneficiario: {
    type: 'object',
    properties: {
      CURP: {
        type: 'string',
        minLength: 18,
        maxLength: 18,
        pattern: String.raw`^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$`,
        description: 'Clave Única de Registro de Población (PK)',
        example: 'GOCL900101HDFNRN09',
      },
      NOMBRES: { type: 'string', example: 'Juan Carlos' },
      APELLIDO_PATERNO: { type: 'string', example: 'González' },
      APELLIDO_MATERNO: { type: 'string', example: 'López' },
      FECHA_NACIMIENTO: { type: 'string', format: 'date', example: '1990-01-01' },
      GENERO: { type: 'string', example: 'Masculino' },
      CIUDAD: { type: 'string', example: 'Ciudad de México' },
      MUNICIPIO: { type: 'string', example: 'Coyoacán' },
      ESTADO: { type: 'string', example: 'Ciudad de México' },
      TIPO_SANGRE: { type: 'string', example: 'O+' },
      USA_VALVULA: { type: 'string', enum: ['S', 'N'], example: 'N' },
      ESTATUS: { type: 'string', enum: ['Activo', 'Inactivo', 'Baja'], example: 'Activo' },
      FECHA_ALTA: { type: 'string', format: 'date-time' },
    },
    required: ['CURP', 'NOMBRES', 'APELLIDO_PATERNO', 'ESTATUS'],
  },

  Credencial: {
    type: 'object',
    properties: {
      ID_CREDENCIAL: { type: 'integer', example: 1 },
      CURP: {
        type: 'string',
        description: 'FK → BENEFICIARIOS',
        example: 'GOCL900101HDFNRN09',
      },
      NUMERO_CREDENCIAL: { type: 'string', example: 'CRED-2024-001' },
      FECHA_VIGENCIA_INICIO: { type: 'string', format: 'date', example: '2024-01-01' },
      FECHA_VIGENCIA_FIN: { type: 'string', format: 'date', example: '2024-12-31' },
      FECHA_ULTIMO_PAGO: { type: 'string', format: 'date', example: '2024-01-15' },
    },
    required: ['ID_CREDENCIAL', 'CURP', 'FECHA_VIGENCIA_INICIO', 'FECHA_VIGENCIA_FIN'],
  },

  Servicio: {
    type: 'object',
    properties: {
      ID_SERVICIO: { type: 'integer', example: 42 },
      CURP: { type: 'string', description: 'FK → BENEFICIARIOS', example: 'GOCL900101HDFNRN09' },
      ID_TIPO_SERVICIO: { type: 'integer', example: 3 },
      FECHA: { type: 'string', format: 'date-time' },
      COSTO: { type: 'number', format: 'float', example: 150 },
      MONTO_PAGADO: { type: 'number', format: 'float', example: 150 },
      REFERENCIA_ID: {
        type: 'integer',
        nullable: true,
        description: 'ID del comodato u otro objeto referenciado',
        example: null,
      },
      REFERENCIA_TIPO: {
        type: 'string',
        nullable: true,
        description: "Tipo de referencia polimórfica. 'COMODATO' para préstamos de equipo.",
        example: 'COMODATO',
      },
    },
    required: ['ID_SERVICIO', 'CURP', 'ID_TIPO_SERVICIO'],
  },

  Articulo: {
    type: 'object',
    properties: {
      ID_ARTICULO: { type: 'integer', example: 10 },
      DESCRIPCION: { type: 'string', example: 'Silla de ruedas estándar' },
      UNIDAD: { type: 'string', example: 'pieza' },
      CUOTA_RECUPERACION: { type: 'number', format: 'float', example: 200 },
      INVENTARIO_ACTUAL: { type: 'integer', example: 5 },
      MANEJA_INVENTARIO: {
        type: 'string',
        enum: ['S', 'N'],
        description: "S = tracking activo, N = sin tracking de stock",
        example: 'S',
      },
      ID_CATEGORIA: { type: 'integer', example: 2 },
    },
    required: ['ID_ARTICULO', 'DESCRIPCION', 'MANEJA_INVENTARIO'],
  },

  Cita: {
    type: 'object',
    properties: {
      ID_CITA: { type: 'integer', example: 7 },
      CURP: { type: 'string', description: 'FK → BENEFICIARIOS', example: 'GOCL900101HDFNRN09' },
      ID_TIPO_SERVICIO: { type: 'integer', example: 2 },
      ESPECIALISTA: { type: 'string', example: 'Dr. Martínez' },
      FECHA: { type: 'string', format: 'date-time', example: '2024-06-15T10:00:00Z' },
      ESTATUS: {
        type: 'string',
        enum: ['Pendiente', 'Confirmada', 'Cancelada'],
        example: 'Pendiente',
      },
    },
    required: ['ID_CITA', 'CURP', 'ESPECIALISTA', 'FECHA', 'ESTATUS'],
  },

  Comodato: {
    type: 'object',
    properties: {
      ID_COMODATO: { type: 'integer', example: 15 },
      CURP: { type: 'string', description: 'FK → BENEFICIARIOS', example: 'GOCL900101HDFNRN09' },
      ID_ARTICULO: { type: 'integer', description: 'FK → ARTICULOS (solo Equipos Médicos)', example: 3 },
      MONTO_TOTAL: { type: 'number', format: 'float', nullable: true, description: 'null = donación sin costo', example: 500 },
      MONTO_PAGADO: { type: 'number', format: 'float', example: 200 },
      MONTO_EXENTO: { type: 'number', format: 'float', example: 0 },
      ESTATUS: { type: 'string', enum: ['Activo', 'Cancelado'], example: 'Activo' },
      NOTAS: { type: 'string', nullable: true, example: 'Paciente de bajos recursos' },
      FECHA_ALTA: { type: 'string', format: 'date-time' },
      FECHA_DEVOLUCION_ESPERADA: { type: 'string', format: 'date', nullable: true, example: '2025-12-31' },
      FECHA_DEVOLUCION_REAL: { type: 'string', format: 'date', nullable: true },
      BENEFICIARIO: { type: 'string', description: 'Nombre completo (JOIN)', example: 'Juan González' },
      ARTICULO: { type: 'string', description: 'Descripción del artículo (JOIN)', example: 'Silla de ruedas estándar' },
    },
    required: ['ID_COMODATO', 'CURP', 'ID_ARTICULO', 'ESTATUS'],
  },

  EspecialidadHorario: {
    type: 'object',
    properties: {
      ID_ESPECIALIDAD: { type: 'integer', example: 1 },
      NOMBRE: { type: 'string', example: 'Gastroenterología' },
      DIA_SEMANA: { type: 'integer', minimum: 0, maximum: 6, description: '0=Dom … 6=Sáb', example: 4 },
      HORA_INICIO: { type: 'string', example: '10:00' },
      HORA_FIN: { type: 'string', nullable: true, example: '12:00' },
      CAPACIDAD: { type: 'integer', example: 2 },
      FRECUENCIA: { type: 'string', enum: ['SEMANAL', 'MENSUAL_PRIMER_DIA'], example: 'SEMANAL' },
      ACTIVO: { type: 'integer', enum: [0, 1], example: 1 },
    },
    required: ['ID_ESPECIALIDAD', 'NOMBRE', 'DIA_SEMANA', 'HORA_INICIO', 'CAPACIDAD', 'FRECUENCIA'],
  },

  Notificacion: {
    type: 'object',
    properties: {
      ID: { type: 'integer', example: 1 },
      TIPO: {
        type: 'string',
        enum: ['STOCK_BAJO', 'SIN_STOCK', 'MEMBRESIA_PROXIMA', 'MEMBRESIA_VENCIDA', 'CITA_HOY', 'COMODATO_POR_VENCER'],
        example: 'STOCK_BAJO',
      },
      MENSAJE: { type: 'string', example: 'Stock de Silla de ruedas por debajo del mínimo (2 unidades)' },
      LEIDA: { type: 'boolean', example: false },
      FECHA: { type: 'string', format: 'date-time' },
    },
    required: ['ID', 'TIPO', 'MENSAJE', 'LEIDA'],
  },

  Administrador: {
    type: 'object',
    properties: {
      ID_ADMIN: { type: 'integer', example: 1 },
      ID_ROL: { type: 'integer', example: 1 },
      EMAIL: { type: 'string', format: 'email', example: 'admin@espinabifida.mx' },
      ACTIVO: { type: 'integer', enum: [0, 1], description: '1 = activo, 0 = inactivo', example: 1 },
    },
    required: ['ID_ADMIN', 'ID_ROL', 'EMAIL', 'ACTIVO'],
  },

  MovimientoInventario: {
    type: 'object',
    properties: {
      ID_MOVIMIENTO: { type: 'integer', example: 55 },
      ID_ARTICULO: { type: 'integer', example: 10 },
      TIPO_MOVIMIENTO: {
        type: 'string',
        enum: ['ENTRADA', 'SALIDA'],
        description: 'ENTRADA = ingreso de stock, SALIDA = consumo',
        example: 'ENTRADA',
      },
      CANTIDAD: {
        type: 'integer',
        minimum: 1,
        description: 'Debe ser mayor a 0',
        example: 10,
      },
      FECHA: { type: 'string', format: 'date', example: '2024-06-01' },
      MOTIVO: { type: 'string', example: 'Compra mensual de insumos' },
    },
    required: ['ID_MOVIMIENTO', 'ID_ARTICULO', 'TIPO_MOVIMIENTO', 'CANTIDAD'],
  },

  // ─────────────────────────────────────────────
  // RESPUESTAS ESTÁNDAR REUTILIZABLES
  // ─────────────────────────────────────────────

  Error400: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Datos de entrada inválidos' },
      details: {
        type: 'array',
        items: { type: 'string' },
        example: ['El campo CURP es requerido', 'Email inválido'],
      },
    },
    required: ['error'],
  },

  Error401: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'No autorizado' },
    },
  },

  Error403: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Sin permisos para realizar esta operación' },
    },
  },

  Error404: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Recurso no encontrado' },
    },
  },

  Error409: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Ya existe un registro con esa CURP' },
      code: {
        type: 'string',
        example: 'DUPLICATE_CURP',
        description: 'Código de error: DUPLICATE_CURP, DUPLICATE_EMAIL, etc.',
      },
    },
    required: ['error', 'code'],
  },

  Error429: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Demasiados intentos. Intente más tarde.' },
    },
  },

  Error500: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Error interno del servidor' },
    },
  },

  PaginatedResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { type: 'object' },
        description: 'Lista de resultados de la página actual',
      },
      total: { type: 'integer', example: 150, description: 'Total de registros' },
      page: { type: 'integer', example: 1, description: 'Página actual' },
      limit: { type: 'integer', example: 20, description: 'Registros por página' },
    },
    required: ['data', 'total', 'page', 'limit'],
  },

  FileUploadSchema: {
    type: 'object',
    properties: {
      foto: {
        type: 'string',
        format: 'binary',
        description: 'Archivo de imagen (JPG, PNG). Máx 5MB.',
      },
    },
    required: ['foto'],
  },
};
