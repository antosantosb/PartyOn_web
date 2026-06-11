import { rateLimit } from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Por favor, inténtelo de nuevo en 15 minutos.'
  }
});

export const paymentIntentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes de pago. Por favor, inténtelo de nuevo en un minuto.'
  }
});

export const checkoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 3, // Limit each IP to 3 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de checkout. Por favor, inténtelo de nuevo en un minuto.'
  }
});
