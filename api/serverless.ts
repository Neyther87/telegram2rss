import Fastify from 'fastify';
import registerRoutes from '../src/index';

const app = Fastify({
  logger: true,
});

app.register(registerRoutes);

export default async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
};
