import { handle } from 'hono/vercel';

export const config = {
  runtime: process.env.VERCEL_RUNTIME || 'nodejs',
};

export const GET =
  config.runtime === 'edge'
    ? handle(await import('../src/app-edge.js').then(m => m.default))
    : handle(await import('../src/app.js').then(m => m.default));
