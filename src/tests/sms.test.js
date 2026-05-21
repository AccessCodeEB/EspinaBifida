import { jest } from "@jest/globals";
import { sendSmsCode } from "../utils/sms.js";

const TWILIO_VARS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];

afterEach(() => {
  TWILIO_VARS.forEach((k) => delete process.env[k]);
  // Restaurar fetch global si fue sobreescrito
  if (global._origFetch !== undefined) {
    global.fetch = global._origFetch;
    delete global._origFetch;
  }
});

// ── Modo desarrollo (sin variables Twilio) ──────────────────────────────────

describe("sendSmsCode — modo desarrollo", () => {
  test("imprime el código en consola y lo devuelve cuando no hay variables Twilio", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendSmsCode("8181234567", "123456");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("123456"));
    expect(result).toBe("123456");
    spy.mockRestore();
  });

  test("incluye el número de teléfono en el log de desarrollo", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendSmsCode("8181234567", "654321");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("8181234567"));
    expect(result).toBe("654321");
    spy.mockRestore();
  });
});

// ── Modo Twilio (con variables de entorno configuradas) ─────────────────────

describe("sendSmsCode — modo Twilio", () => {
  function setupTwilio() {
    process.env.TWILIO_ACCOUNT_SID  = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN   = "authtokentest";
    process.env.TWILIO_FROM_NUMBER  = "+15005550006";
  }

  function mockFetch(ok, jsonBody = {}) {
    global._origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(jsonBody),
    });
  }

  test("llama a la API de Twilio con URL y método POST correctos", async () => {
    setupTwilio();
    mockFetch(true);
    await sendSmsCode("+528181234567", "123456");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("ACtest123/Messages.json"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("incluye el encabezado Authorization con Basic auth", async () => {
    setupTwilio();
    mockFetch(true);
    await sendSmsCode("+528181234567", "123456");
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers?.Authorization).toMatch(/^Basic /);
  });

  test("devuelve undefined si Twilio responde con ok:true", async () => {
    setupTwilio();
    mockFetch(true);
    await expect(sendSmsCode("+528181234567", "123456")).resolves.toBeUndefined();
  });

  test("lanza error con el mensaje de Twilio si ok:false y hay message en JSON", async () => {
    setupTwilio();
    mockFetch(false, { message: "Invalid credentials provided." });
    await expect(sendSmsCode("+528181234567", "123456"))
      .rejects.toThrow("Invalid credentials provided.");
  });

  test("lanza mensaje genérico si ok:false y el JSON no tiene message", async () => {
    setupTwilio();
    mockFetch(false, {});
    await expect(sendSmsCode("+528181234567", "123456"))
      .rejects.toThrow("Error al enviar SMS por Twilio");
  });

  test("lanza mensaje genérico si ok:false y el JSON no es parseable", async () => {
    setupTwilio();
    global._origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockRejectedValue(new Error("not json")),
    });
    await expect(sendSmsCode("+528181234567", "123456"))
      .rejects.toThrow("Error al enviar SMS por Twilio");
  });
});
