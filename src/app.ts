import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { stream } from 'hono/streaming';
import { getChannelInfoWithPosts } from './telegram-parser.js';
import { buildFeed } from './telegram-to-feed.js';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/rss/{channel}',
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
    },
  }),
  async context => {
    const channel = context.req.param('channel');
    const postsCountRaw = context.req.query('count');
    const titleMaxLengthRaw = context.req.query('titleMaxLength');
    const postsCount = postsCountRaw ? Math.min(Number(postsCountRaw), 50) : undefined;
    const titleMaxLength = titleMaxLengthRaw ? Number(titleMaxLengthRaw) : undefined;
    const channelInfo = await getChannelInfoWithPosts(channel, { count: postsCount });
    context.header('Content-Type', 'application/rss+xml');
    context.status(200);
    return stream(context, async s => {
      await buildFeed(channelInfo, s, { titleMaxLength: titleMaxLength });
    });
  },
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
