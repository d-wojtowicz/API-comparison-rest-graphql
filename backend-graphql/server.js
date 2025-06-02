import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { PubSub } from 'graphql-subscriptions';

import cors from 'cors';
import { json } from 'express';

import log from './config/logging.js';
import CONFIG from './config/config.js';
import { typeDefs, resolvers } from './graphql/index.js';
import { verifyToken, validateToken } from './utils/jwt.js';
import { authDirectiveTransformer } from './middleware/auth-directive.js';
import { createLoaders } from './graphql/dataloaders.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';

// Initialize Express application
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server for GraphQL subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Create PubSub instance
const pubsub = new PubSub();

// Configure basic middleware
app.use(cors());
app.use(json());

// Create GraphQL schema with authentication directives
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
const schemaWithDirectives = authDirectiveTransformer(schema);

// Set up WebSocket server for subscriptions with authentication
const serverCleanup = useServer(
  {
    schema: schemaWithDirectives,
    context: async (ctx) => {
      const auth = ctx.connectionParams?.Authorization;
      if (!auth) {
        if (CONFIG.server.env !== 'PROD') log.warn(NAMESPACE + '|USE-SERVER', 'No authorization header provided');
        return { user: null, loaders: createLoaders(), pubsub };
      }
      
      try {
        const token = auth.slice(7).trim();
        const user = await verifyToken(token);
        if (CONFIG.server.env !== 'PROD') log.info(NAMESPACE + '|USE-SERVER', `Successful user ID authorization: ${user.userId}`);
        return { user, loaders: createLoaders(), pubsub };
      } catch (err) {
        if (CONFIG.server.env !== 'PROD') log.error(NAMESPACE + '|USE-SERVER', `Authorization error: ${err.message}`);
        return { user: null, loaders: createLoaders(), pubsub };
      }
    },
  },
  wsServer
);

// Configure Apollo Server with HTTP and WebSocket cleanup
const server = new ApolloServer({
  schema: schemaWithDirectives,
  plugins: [
    // Graceful HTTP server shutdown
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Graceful WebSocket server shutdown
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Start server with Express middleware and WebSocket support
async function startServer() {
  await server.start();
  log.info(NAMESPACE, 'Apollo Server started');

  // Set up GraphQL endpoint with authentication
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        try {
          const auth = req.headers.authorization;
          
          if (!validateToken(auth)) {
            if (CONFIG.server.env !== 'PROD') log.warn(NAMESPACE + '|EXPRESS-MIDDLEWARE', 'Token failed validation');
            return { user: null, loaders: createLoaders(), pubsub };
          } 
          else {
            const token = auth.slice(7).trim();
            const user = await verifyToken(token);
            if (!user) {
              if (CONFIG.server.env !== 'PROD') log.error(NAMESPACE + '|EXPRESS-MIDDLEWARE', 'Invalid JWT token');
              return { user: null, loaders: createLoaders(), pubsub };
            }
            else {
              if (CONFIG.server.env !== 'PROD') log.info(NAMESPACE + '|EXPRESS-MIDDLEWARE', `Successful user ID authorization: ${user.userId}`);
              return { user, loaders: createLoaders(), pubsub };
            }
          }
        } catch (err) {
          if (CONFIG.server.env !== 'PROD') log.error(NAMESPACE + '|EXPRESS-MIDDLEWARE', `Authorization error: ${err.message}`);
          return { user: null, loaders: createLoaders(), pubsub };
        }
      }
    })
  );

  // Start HTTP server with WebSocket support
  httpServer.listen(CONFIG.server.port, CONFIG.server.host, () => {
    log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}/graphql`);
    log.info(NAMESPACE, `WebSocket server is running at ws://${CONFIG.server.host}:${CONFIG.server.port}/graphql`);
  });
}

// Handle server startup errors
startServer().catch((err) => {
  log.error(NAMESPACE, `Failed to start server: ${err}`);
  process.exit(1);
});
