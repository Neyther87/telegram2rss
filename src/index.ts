import Fastify, { FastifyInstance } from 'fastify';
import { getChannelInfoWithPosts } from './telegram-parser';
import { Readable } from 'stream';
import { buildFeed } from './telegram-to-feed';

export default function registerRoutes(app: FastifyInstance) {
  app.get(
    '/rss/:channel',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            channel: { type: 'string' },
          },
          required: ['channel'],
        },
        querystring: {
          type: 'object',
          properties: {
            count: { type: 'number' },
          },
        },
      },
    },
    async (request, response) => {
      const { channel } = request.params as { channel: string };
      const { count: postsCountRaw } = request.query as { count?: number | string };
      const postsCount = postsCountRaw ? Math.min(Number(postsCountRaw), 50) : undefined;
      const channelInfo = await getChannelInfoWithPosts(channel, { count: postsCount });
      const stream = new Readable();
      stream._read = () => {};
      await buildFeed(channelInfo, stream);
      return response.status(200).type('application/rss+xml').send(stream);
    },
  );
}

if (process.env.NODE_ENV === 'development') {
  const app = Fastify({
    logger: true,
  });
  registerRoutes(app);
  app.listen({ port: 8080 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}
