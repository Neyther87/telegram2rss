import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { handleRSSRequest } from './app-base.js';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/rss/{channel}',
    summary: 'Get RSS feed for a Telegram channel',
    request: {
      params: z.object({
        channel: z.string(),
      }),
      query: z.object({
        count: z.number().optional(),
        titleMaxLength: z.number().optional(),
      }),
    },
    responses: {
      200: {
        description: 'RSS feed',
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  }),
  handleRSSRequest,
);

app.get('/', swaggerUI({ url: '/doc' }));

app.doc('/doc', {
  info: {
    title: 'Telegram to RSS',
    version: 'v1',
  },
  openapi: '3.1.0',
});

if (process.env.NODE_ENV === 'development') {
  const serve = await import('@hono/node-server').then(m => m.serve);
  serve({ port: 8080, fetch: app.fetch });
}

export default app;
