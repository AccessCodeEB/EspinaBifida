import { saveOtp, verifyOtp, clearOtp, _testStore, OTP_TTL_MS } from "../utils/otpStore.js";

afterEach(() => { _testStore.clear(); });

describe("otpStore — saveOtp", () => {
  test("guarda código con TTL por defecto", () => {
    const before = Date.now();
    saveOtp(1, "123456");
    const entry = _testStore.get(1);
    expect(entry.code).toBe("123456");
    expect(entry.expiresAt).toBeGreaterThanOrEqual(before + OTP_TTL_MS - 10);
  });

  test("convierte código numérico a string", () => {
    saveOtp(1, 999999);
    expect(_testStore.get(1).code).toBe("999999");
  });

  test("acepta ttlMs personalizado", () => {
    const ttl = 60000;
    const before = Date.now();
    saveOtp(1, "111111", ttl);
    expect(_testStore.get(1).expiresAt).toBeGreaterThanOrEqual(before + ttl - 10);
  });
});

describe("otpStore — verifyOtp", () => {
  test("devuelve false si no hay entrada para ese idAdmin", () => {
    expect(verifyOtp(99, "000000")).toBe(false);
  });

  test("devuelve false y elimina la entrada si el código expiró", () => {
    saveOtp(1, "123456", -1); // TTL negativo → ya expirado
    expect(verifyOtp(1, "123456")).toBe(false);
    expect(_testStore.has(1)).toBe(false);
  });

  test("devuelve false si el código no coincide (no elimina la entrada)", () => {
    saveOtp(1, "123456");
    expect(verifyOtp(1, "000000")).toBe(false);
    expect(_testStore.has(1)).toBe(true);
  });

  test("devuelve true y elimina la entrada si el código es correcto", () => {
    saveOtp(1, "123456");
    expect(verifyOtp(1, "123456")).toBe(true);
    expect(_testStore.has(1)).toBe(false);
  });

  test("segunda llamada con el mismo código devuelve false (ya invalidado)", () => {
    saveOtp(1, "123456");
    verifyOtp(1, "123456");
    expect(verifyOtp(1, "123456")).toBe(false);
  });
});

describe("otpStore — clearOtp", () => {
  test("elimina la entrada del store", () => {
    saveOtp(1, "123456");
    clearOtp(1);
    expect(_testStore.has(1)).toBe(false);
  });

  test("no lanza si el idAdmin no existe en el store", () => {
    expect(() => clearOtp(999)).not.toThrow();
  });
});
