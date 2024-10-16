import { Hono } from 'jsr:@hono/hono';
import { handle } from 'jsr:@hono/hono/netlify';
import { handleRSSRequest } from './app-base.js';

const app = new Hono();

app.get('/rss/:channel', (c: any) => handleRSSRequest(c));

export default handle(app);
export const config = { path: '/rss/*' };
