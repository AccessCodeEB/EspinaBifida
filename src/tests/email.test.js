import { jest } from "@jest/globals";

const SMTP_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];

// ── Mock de nodemailer (debe ir antes del import dinámico) ──────────────────
const mockSendMail = jest.fn();

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
  },
}));

// Import dinámico después del mock
const { sendEmailCode } = await import("../utils/email.js");

afterEach(() => {
  SMTP_VARS.forEach((k) => delete process.env[k]);
  mockSendMail.mockReset();
  jest.restoreAllMocks();
});

// ── Modo desarrollo (sin variables SMTP) ────────────────────────────────────

describe("sendEmailCode — modo desarrollo", () => {
  test("imprime el código en consola y lo devuelve cuando no hay variables SMTP", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendEmailCode("admin@ejemplo.com", "123456");

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("123456"));
    expect(result).toBe("123456");
  });

  test("incluye el correo destino en el log de desarrollo", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendEmailCode("admin@ejemplo.com", "654321");

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("admin@ejemplo.com"));
    expect(result).toBe("654321");
  });
});

// ── Modo producción (con variables SMTP configuradas) ───────────────────────

describe("sendEmailCode — modo producción (SMTP)", () => {
  function setupSmtp() {
    process.env.SMTP_HOST = "mail.espinabifida.org.mx";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "procuracion@espinabifida.org.mx";
    process.env.SMTP_PASS = "secret";
    process.env.EMAIL_FROM = "Espina Bífida <procuracion@espinabifida.org.mx>";
  }

  test("llama a sendMail con los campos correctos y devuelve undefined", async () => {
    setupSmtp();
    mockSendMail.mockResolvedValueOnce({});

    const result = await sendEmailCode("destino@ejemplo.com", "999888");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "destino@ejemplo.com",
        subject: expect.stringContaining("verificación"),
        text: expect.stringContaining("999888"),
        html: expect.stringContaining("999888"),
      })
    );
    expect(result).toBeUndefined();
  });

  test("usa EMAIL_FROM como remitente si está definido", async () => {
    setupSmtp();
    mockSendMail.mockResolvedValueOnce({});

    await sendEmailCode("destino@ejemplo.com", "111222");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Espina Bífida <procuracion@espinabifida.org.mx>" })
    );
  });

  test("usa SMTP_USER como from si EMAIL_FROM no está definido", async () => {
    setupSmtp();
    delete process.env.EMAIL_FROM;
    mockSendMail.mockResolvedValueOnce({});

    await sendEmailCode("destino@ejemplo.com", "333444");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "procuracion@espinabifida.org.mx" })
    );
  });

  test("propaga el error si sendMail falla", async () => {
    setupSmtp();
    mockSendMail.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(sendEmailCode("destino@ejemplo.com", "111222"))
      .rejects.toThrow("Connection refused");
  });
});
