import { jest } from "@jest/globals";

const SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];

afterEach(() => {
  SMTP_VARS.forEach((k) => delete process.env[k]);
  jest.restoreAllMocks();
});

// ── Modo desarrollo (sin variables SMTP) ────────────────────────────────────

describe("sendEmailCode — modo desarrollo", () => {
  test("imprime el código en consola y lo devuelve cuando no hay variables SMTP", async () => {
    const { sendEmailCode } = await import("../utils/email.js");
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendEmailCode("admin@ejemplo.com", "123456");

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("123456"));
    expect(result).toBe("123456");
  });

  test("incluye el correo destino en el log de desarrollo", async () => {
    const { sendEmailCode } = await import("../utils/email.js");
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendEmailCode("admin@ejemplo.com", "654321");

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("admin@ejemplo.com"));
    expect(result).toBe("654321");
  });
});
