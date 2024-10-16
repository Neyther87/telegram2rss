import { Hono } from 'jsr:@hono/hono';
import { handle } from 'jsr:@hono/hono/netlify';
import { handleRSSRequest } from '../../src/app-base.js';

const app = new Hono();

app.get('/', (c: any) => handleRSSRequest(c));

export default handle(app);
