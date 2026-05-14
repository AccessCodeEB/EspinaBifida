import { jest } from "@jest/globals";

// ─── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { verifyTurnstileToken } = await import("../utils/verifyTurnstile.js");

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NODE_ENV;
});

// ═══════════════════════════════════════════════════════════════════════════════
// Token vacío / ausente
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyTurnstileToken — token vacío", () => {
  test("lanza CAPTCHA_REQUIRED si token es undefined", async () => {
    await expect(verifyTurnstileToken(undefined)).rejects.toMatchObject({
      code: "CAPTCHA_REQUIRED",
    });
  });

  test("lanza CAPTCHA_REQUIRED si token es cadena vacía", async () => {
    await expect(verifyTurnstileToken("")).rejects.toMatchObject({
      code: "CAPTCHA_REQUIRED",
    });
  });

  test("lanza CAPTCHA_REQUIRED si token es solo espacios", async () => {
    await expect(verifyTurnstileToken("   ")).rejects.toMatchObject({
      code: "CAPTCHA_REQUIRED",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Producción sin clave configurada
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyTurnstileToken — producción sin TURNSTILE_SECRET_KEY", () => {
  test("lanza CAPTCHA_CONFIG en producción cuando no hay clave", async () => {
    process.env.NODE_ENV = "production";

    await expect(verifyTurnstileToken("valid-token")).rejects.toMatchObject({
      code: "CAPTCHA_CONFIG",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Desarrollo sin clave — usa test secret de Cloudflare
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyTurnstileToken — dev sin clave (fallback a test secret)", () => {
  test("usa el test secret y verifica con Cloudflare (éxito)", async () => {
    // NODE_ENV no es 'production' → usa TURNSTILE_TEST_SECRET silenciosamente
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    await expect(verifyTurnstileToken("any-token")).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("siteverify");
    expect(opts.method).toBe("POST");
    // El body debe contener el test secret
    expect(opts.body.toString()).toContain("1x0000000000000000000000000000000AA");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cloudflare responde success: true
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyTurnstileToken — Cloudflare success", () => {
  test("resuelve sin lanzar cuando success es true", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    await expect(verifyTurnstileToken("good-token", "1.2.3.4")).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const body = mockFetch.mock.calls[0][1].body.toString();
    expect(body).toContain("test-secret-key");
    expect(body).toContain("good-token");
    expect(body).toContain("1.2.3.4");
  });

  test("incluye remoteip en el body cuando se pasa", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    await verifyTurnstileToken("tok", "192.168.1.1");

    const body = mockFetch.mock.calls[0][1].body.toString();
    expect(body).toContain("192.168.1.1");
  });

  test("no incluye remoteip si no se pasa", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    await verifyTurnstileToken("tok");

    const body = mockFetch.mock.calls[0][1].body.toString();
    expect(body).not.toContain("remoteip");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cloudflare rechaza — success: false
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyTurnstileToken — Cloudflare failure", () => {
  test("lanza CAPTCHA_FAILED cuando success es false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    });

    await expect(verifyTurnstileToken("bad-token")).rejects.toMatchObject({
      code: "CAPTCHA_FAILED",
    });
  });

  test("lanza CAPTCHA_FAILED cuando json() lanza (respuesta no-JSON)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    mockFetch.mockResolvedValueOnce({
      json: async () => { throw new SyntaxError("not json"); },
    });

    // json() falla → catch(() => ({})) → success !== true → CAPTCHA_FAILED
    await expect(verifyTurnstileToken("bad-token")).rejects.toMatchObject({
      code: "CAPTCHA_FAILED",
    });
  });
});
