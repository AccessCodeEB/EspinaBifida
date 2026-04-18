# Documento preliminar — Arquitectura y Base de Datos

## 1) Introducción

El proyecto **EspinaBifida** implementa un backend en Node.js/Express conectado a Oracle para gestionar beneficiarios, membresías, servicios, citas, inventario y control administrativo.

Este documento consolida, de forma preliminar, la base documental solicitada para el proyecto:

- Introducción
- Referencias
- Glosario
- Arquitectura preliminar
- Modelo Entidad–Relación (ER)

Además, el script de base de datos del proyecto se entrega en el archivo:

- `docs/script_bd_proyecto.sql`

---

## 2) Referencias

### Referencias internas del repositorio

1. `README.md`
2. `docs/API_REFERENCE.md`
3. `docs/Beneficiarios Docu Tecnica.md`
4. `docs/Inventario Docu Tecnica.md`
5. `src/config/db.js`
6. `src/app.js`
7. `src/models/*.model.js`
8. `scripts/export-schema-ddl.js`

### Referencias técnicas externas

1. Node.js
2. Express
3. Oracle Database / `node-oracledb`
4. JSON Web Token (JWT)

---

## 3) Glosario

- **Beneficiario:** Persona atendida por la asociación, identificada por CURP.
- **CURP:** Clave única de identidad de beneficiarios; llave primaria de `BENEFICIARIOS`.
- **Membresía / Credencial:** Vigencia administrativa de un beneficiario, almacenada en `CREDENCIALES`.
- **Servicio:** Atención o concepto cobrado a un beneficiario (`SERVICIOS`).
- **Catálogo de servicios:** Tipos de servicio disponibles (`SERVICIOS_CATALOGO`).
- **Cita:** Registro de agenda para atención (`CITAS`).
- **Artículo:** Insumo o producto gestionado por inventario (`ARTICULOS`).
- **Movimiento de inventario:** Entrada o salida de artículos (`MOVIMIENTOS_INVENTARIO`).
- **Administrador:** Usuario interno del sistema (`ADMINISTRADORES`).
- **Rol:** Perfil de permisos para administradores (`ROLES`).
- **Borrado lógico:** Desactivación sin eliminación física (ej. `ESTATUS='Baja'`).

---

## 4) Arquitectura preliminar

El sistema sigue una arquitectura por capas:

- **API REST (Express):** expone endpoints por módulo.
- **Controller:** recibe solicitudes HTTP y forma respuestas.
- **Service:** aplica reglas de negocio y validaciones.
- **Model:** ejecuta SQL directo contra Oracle.
- **Oracle DB:** persistencia transaccional del dominio.

### Vista de componentes (preliminar)

```mermaid
flowchart LR
    U[Usuario / Frontend] --> API[Express API]

    API --> R[Routes]
    R --> C[Controllers]
    C --> S[Services]
    S --> M[Models SQL]
    M --> DB[(Oracle Database)]

    API --> AUTH[JWT Auth + Roles]
    API --> ERR[Error Handler]
```

### Módulos funcionales

- Beneficiarios
- Membresías
- Servicios
- Citas
- Artículos
- Inventario / Movimientos
- Administradores
- Roles

---

## 5) Modelo Entidad–Relación (preliminar)

```mermaid
erDiagram
    ROLES ||--o{ ADMINISTRADORES : asigna
    BENEFICIARIOS ||--o{ CREDENCIALES : tiene
    BENEFICIARIOS ||--o{ CITAS : agenda
    BENEFICIARIOS ||--o{ SERVICIOS : recibe
    SERVICIOS_CATALOGO ||--o{ CITAS : clasifica
    SERVICIOS_CATALOGO ||--o{ SERVICIOS : clasifica
    ARTICULOS ||--o{ MOVIMIENTOS_INVENTARIO : registra

    ROLES {
      NUMBER ID_ROL PK
      VARCHAR2 NOMBRE_ROL
      VARCHAR2 DESCRIPCION
    }

    ADMINISTRADORES {
      NUMBER ID_ADMIN PK
      NUMBER ID_ROL FK
      VARCHAR2 NOMBRE_COMPLETO
      VARCHAR2 EMAIL
      VARCHAR2 PASSWORD_HASH
      NUMBER ACTIVO
      DATE FECHA_CREACION
    }

    BENEFICIARIOS {
      VARCHAR2 CURP PK
      VARCHAR2 NOMBRES
      VARCHAR2 APELLIDO_PATERNO
      VARCHAR2 APELLIDO_MATERNO
      DATE FECHA_NACIMIENTO
      VARCHAR2 GENERO
      VARCHAR2 NOMBRE_PADRE_MADRE
      VARCHAR2 CALLE
      VARCHAR2 COLONIA
      VARCHAR2 CIUDAD
      VARCHAR2 MUNICIPIO
      VARCHAR2 ESTADO
      VARCHAR2 CP
      VARCHAR2 TELEFONO_CASA
      VARCHAR2 TELEFONO_CELULAR
      VARCHAR2 CORREO_ELECTRONICO
      VARCHAR2 CONTACTO_EMERGENCIA
      VARCHAR2 TELEFONO_EMERGENCIA
      VARCHAR2 MUNICIPIO_NACIMIENTO
      VARCHAR2 HOSPITAL_NACIMIENTO
      VARCHAR2 TIPO_SANGRE
      VARCHAR2 USA_VALVULA
      CLOB NOTAS
      VARCHAR2 ESTATUS
      DATE FECHA_ALTA
    }

    CREDENCIALES {
      NUMBER ID_CREDENCIAL PK
      VARCHAR2 CURP FK
      VARCHAR2 NUMERO_CREDENCIAL
      DATE FECHA_EMISION
      DATE FECHA_VIGENCIA_INICIO
      DATE FECHA_VIGENCIA_FIN
      DATE FECHA_ULTIMO_PAGO
      VARCHAR2 OBSERVACIONES
    }

    SERVICIOS_CATALOGO {
      NUMBER ID_TIPO_SERVICIO PK
      VARCHAR2 NOMBRE
      VARCHAR2 DESCRIPCION
      NUMBER ACTIVO
    }

    SERVICIOS {
      NUMBER ID_SERVICIO PK
      VARCHAR2 CURP FK
      NUMBER ID_TIPO_SERVICIO FK
      DATE FECHA
      NUMBER COSTO
      NUMBER MONTO_PAGADO
      VARCHAR2 REFERENCIA_ID
      VARCHAR2 REFERENCIA_TIPO
      CLOB NOTAS
    }

    CITAS {
      NUMBER ID_CITA PK
      VARCHAR2 CURP FK
      NUMBER ID_TIPO_SERVICIO FK
      VARCHAR2 ESPECIALISTA
      TIMESTAMP FECHA
      VARCHAR2 ESTATUS
      CLOB NOTAS
    }

    ARTICULOS {
      NUMBER ID_ARTICULO PK
      VARCHAR2 DESCRIPCION
      VARCHAR2 UNIDAD
      NUMBER CUOTA_RECUPERACION
      NUMBER INVENTARIO_ACTUAL
      NUMBER MANEJA_INVENTARIO
      NUMBER ID_CATEGORIA
    }

    MOVIMIENTOS_INVENTARIO {
      NUMBER ID_MOVIMIENTO PK
      NUMBER ID_ARTICULO FK
      VARCHAR2 TIPO_MOVIMIENTO
      NUMBER CANTIDAD
      VARCHAR2 MOTIVO
      DATE FECHA
    }
```

---

## 6) Nota sobre extracción oficial de DDL desde Oracle

Para extraer el DDL completo y oficial directamente de la base Oracle del proyecto, se puede usar el script existente del repositorio:

```bash
npm run export:ddl
```

Esto ejecuta `scripts/export-schema-ddl.js` y genera un archivo SQL con tablas, constraints, secuencias, vistas, triggers, índices y más objetos del esquema.
