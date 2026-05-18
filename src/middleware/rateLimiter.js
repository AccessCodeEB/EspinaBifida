import { rateLimit } from 'express-rate-limit';

const isTest = () => process.env.NODE_ENV === 'test';

const loginLimiterOptions = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    error: 'Too Many Requests',
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
    error: 'Too Many Requests',
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
    error: 'Too Many Requests',
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
