import { handle } from 'hono/vercel';
import app from '../src/app.js';

export const config = {
  runtime: 'edge',
};

export const GET = handle(app);
