import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';

import cors from 'cors';
import { json } from 'express';

import log from './config/logging.js';
import CONFIG from './config/config.js';
import { typeDefs, resolvers } from './graphql/index.js';
import { verifyToken, validateToken } from './utils/jwt.js';


const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';

// Create Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(json());

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      ...(CONFIG.server.env !== 'PROD' && { stack: error.stack })
    };
  }
});

// Start server
async function startServer() {
  await server.start();
  log.info(NAMESPACE, 'Apollo Server started');

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        try {
          const auth = req.headers.authorization;
          
          if (!validateToken(auth)) {
            log.warn(NAMESPACE, 'Token failed validation');
            return { user: null };
          } 
          else {
            const token = auth.slice(7).trim();
            const user = await verifyToken(token);
            if (!user) {
              log.error(NAMESPACE, 'Invalid JWT token');
              return { user: null };
            }
            else {
              log.info(NAMESPACE, 'Successful user authorization');
              return { user };
            }
          }
        } catch (err) {
          log.error(NAMESPACE, `Authorization error: ${err.message}`);
          return { user: null };
        }
      }
    })
  );

  app.listen(CONFIG.server.port, () => {
    log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}/graphql`);
  });
}

startServer().catch((err) => {
  log.error(NAMESPACE, `Failed to start server: ${err}`);
  process.exit(1);
});
