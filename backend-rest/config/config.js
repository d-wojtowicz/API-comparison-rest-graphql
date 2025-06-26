import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnvPath });

// Server
const SERVER_HOST = process.env.HOST_REST || 'localhost';
const SERVER_PORT = process.env.PORT_REST || 4001;
const SERVER_ENV = process.env.NODE_ENV || 'DEV';

// Postgresql database
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres';

// Auth
const JWT_SECRET = process.env.JWT_SECRET || '<insert-your-jwt-secret>';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Logging
const LOGGING = process.env.LOG_LEVEL || 'info';

const SERVER = {
  host: SERVER_HOST,
  port: SERVER_PORT,
  env: SERVER_ENV,
};

const JWT = {
  secret: JWT_SECRET,
  expires_in: JWT_EXPIRES_IN,
};

// Combine
const CONFIG = {
  server: SERVER,
  dbUrl: DB_URL,
  jwt: JWT,
  log: LOGGING,
};

export default CONFIG;
