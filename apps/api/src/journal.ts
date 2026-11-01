import pino from 'pino';

export const journal = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: ['req.headers.cookie', 'req.headers.authorization'],
});
