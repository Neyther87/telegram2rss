import { Hono } from 'https://deno.land/x/hono/mod.ts';
import { handle } from 'https://deno.land/x/hono/adapter/netlify/mod.ts';
import { handleRSSRequest } from './app-base.js';

const app = new Hono();

app.get('/rss/:channel', (c: any) => handleRSSRequest(c));

export default handle(app);
export const config = { path: '/rss/*' };
