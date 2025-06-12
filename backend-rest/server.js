import express from 'express';

import cors from 'cors';
import { json } from 'express';

import CONFIG from './config/config.js';
import log from './config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';

const app = express();

app.use(cors());
app.use(json());

app.listen(CONFIG.server.port, CONFIG.server.host, () => {
    log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}`);
});