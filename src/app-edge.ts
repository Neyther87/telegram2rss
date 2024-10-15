import { Hono } from 'hono';
import { handleRSSRequest } from './app-base.js';

const app = new Hono();

app.get('/rss/:channel', handleRSSRequest);

export default app;
