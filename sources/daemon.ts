import FastifyWebsocket           from 'fastify-websocket';
import Fastify                    from 'fastify';
import {makeHandler}              from 'graphql-ws/lib/use/fastify-websocket';
import {Daemon}                   from 'griselbrand';
import {createServer, Server}     from 'http';
import mercurius                  from 'mercurius';
import nextjs                     from 'next';
import path                       from 'path';

import {schema, resolvers}        from './api';
import type {Context}             from './cli';
import {DAEMON_PORT, SERVER_PORT} from './common/constants';
import {Controller}               from './controller';
import {isConfirmMessage}         from './types';

const wsServer = createServer((req, res) => {
  res.writeHead(301, {Location: `http://localhost:${SERVER_PORT}`});
  res.end();
});

const fastify = Fastify({
  logger: false,
  pluginTimeout: 20000,
});

export const daemon = new Daemon<Context>({
  server: wsServer,
  port: DAEMON_PORT,
});

daemon.onStart.add(async () => {
  fastify.register(async (fastify, opts) => {
    const rootDirectory = path.dirname(require.resolve(`magicbin/package.json`));

    const dev = __filename.endsWith(`.ts`) && process.env.NODE_ENV !== `production`;
    const app = nextjs({dir: rootDirectory, dev});
    const handle = app.getRequestHandler();

    await app.prepare();

    fastify.addHook(`onRequest`, (request, reply, done) => {
      const url = new URL(`${request.protocol}://${request.hostname}`);
      if (url.hostname === `127.0.0.1`) {
        url.hostname = `localhost`;
        reply.redirect(url.toString());
      } else {
        done();
      }
    });

    fastify.register(mercurius, {
      graphiql: true,
      schema,
      resolvers,
    });

    fastify.all(`/*`, async (req, reply) => {
      await handle(req.raw, reply.raw);
      reply.sent = true;
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      return app.render404(request.raw, reply.raw);
    });
  });

  fastify.register(FastifyWebsocket);

  fastify.get(`/ws`, {websocket: true}, makeHandler({
    schema,
    roots: {subscription: resolvers.Subscription},
  }));

  await fastify.listen(SERVER_PORT);
});

daemon.onStop.add(async () => {
  await fastify.close();

  for (const namespace of Controller.getNamespaces()) {
    for (const task of Controller.get(namespace).getTasks()) {
      task.stop();
    }
  }
});

daemon.onMessage = async data => {
  if (isConfirmMessage(data)) {
    Controller.tryGet(data.namespace)?.tryTask?.(data.taskId)?.confirm();
  }
};
