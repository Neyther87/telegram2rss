import { handle } from 'hono/vercel';
import app from '../src/app-vercel.js';

export const config = {
  runtime: 'edge',
};

export const GET = handle(app);
