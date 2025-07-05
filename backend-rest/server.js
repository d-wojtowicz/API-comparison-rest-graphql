import express from 'express';

import cors from 'cors';

import CONFIG from './config/config.js';
import log from './config/logging.js';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware.js';
import userRoutes from './rest/routes/users.routes.js';
import statusRoutes from './rest/routes/statuses.routes.js';
import taskRoutes from './rest/routes/tasks.routes.js';
import projectRoutes from './rest/routes/projects.routes.js';
import notificationRoutes from './rest/routes/notifications.routes.js';
import commentRoutes from './rest/routes/comments.routes.js';
import attachmentRoutes from './rest/routes/attachments.routes.js';

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

// Apply rate limiting to all API routes
app.use('/api', rateLimitMiddleware);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);

app.listen(CONFIG.server.port, CONFIG.server.host, () => {
  log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}`);
});