import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { getChannelInfoWithPosts } from './telegram-parser.js';
import { buildFeed } from './telegram-to-feed.js';

const app = new Hono();

app.get('/rss/:channel', async context => {
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
});

if (process.env.NODE_ENV === 'development') {
  const serve = await import('@hono/node-server').then(m => m.serve);
  serve({ port: 8080, fetch: app.fetch });
}

export default app;
