import dotenv from 'dotenv';

dotenv.config();

// Server
const SERVER_PORT = process.env.PORT_GQL || 4002;
const SERVER_ENV = process.env.NODE_ENV || 'DEV';

// Postgresql database
const DB_PROTOCOL = process.env.DB_PROTOCOL || 'postgresql';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'postgres';

// Auth
const JWT_SECRET = process.env.JWT_SECRET || '<insert-your-jwt-secret>';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Logging
const LOGGING = process.env.LOG_LEVEL || 'info';

const SERVER = {
  port: SERVER_PORT,
  env: SERVER_ENV,
};

const DB_PSQL = {
  protocol: DB_PROTOCOL,
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  name: DB_NAME,
};

const JWT = {
  secret: JWT_SECRET,
  expires_in: JWT_EXPIRES_IN,
};

// Combine
const CONFIG = {
  server: SERVER,
  db: DB_PSQL,
  jwt: JWT,
  log: LOGGING,
};

export default CONFIG;
