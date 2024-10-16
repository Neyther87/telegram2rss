import { Hono } from 'hono';
import { handleRSSRequest } from './app-base.js';
import indexFile from '../public/index.html';

const app = new Hono();

app.get('/', c => c.html(indexFile));
app.get('/rss/:channel', handleRSSRequest);

export default app;
