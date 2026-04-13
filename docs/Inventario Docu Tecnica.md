# Modulo: Inventario y Movimientos

Documentacion tecnica del modulo de inventario para el sistema EspinaBifida.

---

## Tabla en Oracle: MOVIMIENTOS_INVENTARIO (existente)

| Columna         | Tipo          | Restriccion                             |
| --------------- | ------------- | --------------------------------------- |
| ID_MOVIMIENTO   | NUMBER        | PRIMARY KEY                             |
| ID_ARTICULO     | NUMBER        | NOT NULL, FK a ARTICULOS(ID_ARTICULO)   |
| TIPO_MOVIMIENTO | VARCHAR2(10)  | NOT NULL, CHECK ENTRADA o SALIDA        |
| CANTIDAD        | NUMBER        | NOT NULL, CHECK > 0                     |
| MOTIVO          | VARCHAR2(255) | NULL                                    |
| FECHA           | DATE          | DEFAULT SYSDATE NOT NULL                |

### Validacion de estructura (opcional)

```sql
SELECT COLUMN_NAME
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'MOVIMIENTOS_INVENTARIO'
ORDER BY COLUMN_ID;
```

---

## Arquitectura del modulo

El modulo sigue la arquitectura de 4 capas:

routes -> controller -> service -> model -> Oracle DB

| Archivo                   | Ruta               | Responsabilidad                                         |
| ------------------------- | ------------------ | ------------------------------------------------------- |
| inventario.routes.js      | src/routes/        | Define endpoints de inventario y movimientos            |
| inventario.controller.js  | src/controllers/   | Manejo req/res y codigos HTTP                           |
| inventario.service.js     | src/services/      | Validaciones de negocio y coordinacion                  |
| inventario.model.js       | src/models/        | Queries Oracle y transaccion movimiento + stock         |

---

## Endpoints

### POST /movimientos

Registra un movimiento y actualiza stock del articulo en una transaccion.

Body ejemplo:

```json
{
  "idArticulo": 1,
  "tipo": "SALIDA",
  "cantidad": 5,
  "motivo": "Uso en servicio"
}
```

### GET /inventario

Retorna inventario actual por articulo.

Respuesta ejemplo:

```json
[
  {
    "idArticulo": 1,
    "nombre": "Medicamento A",
    "stock": 20
  }
]
```

### GET /movimientos

Retorna historial completo de movimientos ordenado por fecha descendente.

---

## Logica de negocio (Service)

Validaciones aplicadas en POST /movimientos:

1. idArticulo debe ser numerico.
2. tipo solo puede ser ENTRADA o SALIDA.
3. cantidad debe ser mayor a 0.
4. articulo debe existir.
5. no se permite stock negativo en SALIDA.

Regla de stock:

- ENTRADA: nuevoStock = stockActual + cantidad
- SALIDA: nuevoStock = stockActual - cantidad (si alcanza)

---

## Transaccionalidad

El registro de movimiento se ejecuta en una sola transaccion Oracle:

1. Lock del articulo con SELECT ... FOR UPDATE.
2. Validar stock disponible para SALIDA.
3. INSERT en MOVIMIENTOS_INVENTARIO.
4. UPDATE de INVENTARIO_ACTUAL en ARTICULOS.
5. COMMIT en exito.
6. ROLLBACK si falla cualquier paso.

Esto garantiza consistencia de datos: o se guardan ambos cambios o ninguno.

---

## Regla de integridad en articulos

DELETE /articulos/:id ahora se bloquea cuando el articulo tiene movimientos.

Respuesta esperada:

```json
{ "error": "No se puede eliminar el articulo porque tiene movimientos registrados" }
```

Codigo HTTP: 409 Conflict.

---

## Manejo de errores

El modulo usa AppError para errores de negocio y el middleware global para responder:

- 400: validaciones
- 404: articulo no encontrado
- 409: stock insuficiente o delete bloqueado por movimientos
- 500: error interno

---

## Tabla de respuestas esperadas

| Operacion       | Condicion                         | Codigo | Respuesta                                                    |
| --------------- | --------------------------------- | ------ | ------------------------------------------------------------ |
| POST            | Exito                             | 201    | { "message": "Movimiento registrado exitosamente", "data": ... } |
| POST            | tipo invalido                     | 400    | { "error": "tipo debe ser ENTRADA o SALIDA" }            |
| POST            | cantidad <= 0                     | 400    | { "error": "cantidad debe ser un numero mayor a 0" }     |
| POST            | articulo no existe                | 404    | { "error": "Articulo no encontrado" }                    |
| POST            | stock insuficiente en SALIDA      | 409    | { "error": "Stock insuficiente para registrar la salida" } |
| GET /inventario | Exito                             | 200    | [ { "idArticulo": 1, "nombre": "...", "stock": 20 } ] |
| GET /movimientos| Exito                             | 200    | [ { "idMovimiento": 10, "tipo": "ENTRADA", ... } ]     |
| DELETE articulo | Tiene movimientos                 | 409    | { "error": "No se puede eliminar el articulo porque tiene movimientos registrados" } |
