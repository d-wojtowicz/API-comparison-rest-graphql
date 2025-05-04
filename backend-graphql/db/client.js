import { PrismaClient } from '../db/generated/client.js';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'PRISMA' : 'db/client.js';
const prisma = new PrismaClient({
  datasources: { db: { url: CONFIG.dbUrl } },
});

prisma
  .$connect()
  .then(() =>
    log.info(NAMESPACE, 'Prisma has been connected successfully to the PostgreSQL database'),
  )
  .catch((err) => log.error(NAMESPACE, `Prisma connection error: ${err}`));

export default prisma;
