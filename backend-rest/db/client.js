import { PrismaClient } from '../db/generated/client.js';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'PRISMA' : 'db/client.js';
const prisma = new PrismaClient({
  datasources: { db: { url: CONFIG.dbUrl } },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

// Log SQL queries
prisma.$on('query', (e) => {
  log.info(NAMESPACE, `Query: ${e.query}`);
  log.info(NAMESPACE, `Params: ${e.params}`);
  log.info(NAMESPACE, `Duration: ${e.duration}ms`);
});

prisma
  .$connect()
  .then(() =>
    log.info(NAMESPACE, 'Prisma has been connected successfully to the PostgreSQL database'),
  )
  .catch((err) => log.error(NAMESPACE, `Prisma connection error: ${err}`));

export default prisma;
