import { PrismaClient } from '../db/generated/client.js';
import config from '../config/config.js';
import log from '../config/logging.js';

const prisma = new PrismaClient({
  datasources: { db: { url: config.dbUrl } },
});

prisma
  .$connect()
  .then(() => log.info('Prisma has been connected successfully to the PostgreSQL database'))
  .catch((err) => log.error(`Prisma connection error: ${err}`));

export default prisma;
