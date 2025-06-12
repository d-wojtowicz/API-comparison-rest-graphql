import express from 'express';

import cors from 'cors';

import CONFIG from './config/config.js';
import log from './config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';

const app = express();

app.use(
  cors({
    origin: '*', // TODO: Create and use a whitelist of allowed origins (if JWT with credentials is used/if environment is not DEV)
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization']
  })
);  
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  log.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

  res.on('finish', () => {
    log.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}] - STATUS: [${res.statusCode}]`);
  });

  next();
});

app.listen(CONFIG.server.port, CONFIG.server.host, () => {
  log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}`);
});