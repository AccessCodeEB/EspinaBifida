import { crearMovimientoSchema } from "../validators/inventario.schema.js";

describe("crearMovimientoSchema", () => {
  const base = { idArticulo: 1, tipo: "ENTRADA", cantidad: 5 };

  it("acepta payload válido con idArticulo", () => {
    const result = crearMovimientoSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("acepta payload válido con idProducto en lugar de idArticulo", () => {
    const result = crearMovimientoSchema.safeParse({ idProducto: 2, tipo: "SALIDA", cantidad: 1 });
    expect(result.success).toBe(true);
  });

  it("acepta tipo SALIDA", () => {
    const result = crearMovimientoSchema.safeParse({ ...base, tipo: "SALIDA" });
    expect(result.success).toBe(true);
  });

  it("rechaza tipo inválido con mensaje personalizado", () => {
    const result = crearMovimientoSchema.safeParse({ ...base, tipo: "TRANSFERENCIA" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error.issues)).toMatch(/ENTRADA|SALIDA/i);
  });

  it("rechaza si ni idArticulo ni idProducto están presentes", () => {
    const result = crearMovimientoSchema.safeParse({ tipo: "ENTRADA", cantidad: 3 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/idArticulo|idProducto/i);
  });

  it("rechaza cantidad <= 0", () => {
    const result = crearMovimientoSchema.safeParse({ ...base, cantidad: 0 });
    expect(result.success).toBe(false);
  });

  it("acepta motivo opcional", () => {
    const result = crearMovimientoSchema.safeParse({ ...base, motivo: "Reposición mensual" });
    expect(result.success).toBe(true);
  });

  it("acepta motivo null", () => {
    const result = crearMovimientoSchema.safeParse({ ...base, motivo: null });
    expect(result.success).toBe(true);
  });
});
