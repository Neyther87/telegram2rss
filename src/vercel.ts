import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import registerRoutes from './app';

const app = Fastify({
  logger: true,
});

app.register(registerRoutes, {
  prefix: '/',
});

export default async (req: FastifyRequest, res: FastifyReply) => {
  await app.ready();
  app.server.emit('request', req, res);
};
