import { rateLimit } from 'express-rate-limit';

const isTest = () => process.env.NODE_ENV !== 'production';

const loginLimiterOptions = {
  windowMs: 1 * 60 * 1000, // TODO: restaurar a 15 * 60 * 1000
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.',
  },
};

const publicLimiterOptions = {
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Demasiadas solicitudes de pre-registro. Intente de nuevo en 1 hora.',
  },
};

const authLimiterOptions = {
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Demasiadas peticiones. Intente de nuevo en 1 minuto.',
  },
};

export const loginLimiter = rateLimit(loginLimiterOptions);
// express-rate-limit v7 does not expose .options on the middleware function;
// attach the options object manually so tests can assert configured values.
loginLimiter.options = loginLimiterOptions;

export const publicLimiter = rateLimit(publicLimiterOptions);
publicLimiter.options = publicLimiterOptions;

export const authLimiter = rateLimit(authLimiterOptions);
authLimiter.options = authLimiterOptions;

const otpLimiterOptions = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  // Usa idAdmin como clave cuando está disponible; cae a IP como fallback.
  // validate.keyGeneratorIpFallback: false suprime la advertencia de IPv6 ya que
  // el caso primario es por idAdmin (string numérico), no por IP.
  keyGenerator: (req) => String(req.params?.idAdmin ?? req.ip),
  validate: { keyGeneratorIpFallback: false },
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Demasiadas solicitudes de código OTP. Intente de nuevo en 15 minutos.',
  },
};

export const otpLimiter = rateLimit(otpLimiterOptions);
otpLimiter.options = otpLimiterOptions;
