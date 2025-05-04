import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import log from './config/logging.js';
import CONFIG from './config/config.js';
import { typeDefs, resolvers } from './graphql/index.js';
import { verifyToken } from './utils/jwt.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: CONFIG.server.port },
  context: async ({ req }) => {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const user = verifyToken(token);
        log.info(NAMESPACE, 'Successfull user authorization');
        return { user };
      } catch (err) {
        log.error(NAMESPACE, `Failed user authorization attempt: ${err}`);
        return {};
      }
    }
    log.error(NAMESPACE, 'Invalid construction of the JWT token');
    return {};
  },
})
  .then(({ url }) => log.info(NAMESPACE, `Server is running at ${url}`))
  .catch((err) => log.error(NAMESPACE, `Server is not connected due to an error: ${err}`));
