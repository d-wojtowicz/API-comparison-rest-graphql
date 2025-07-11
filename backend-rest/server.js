import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import cors from 'cors';

import CONFIG from './config/config.js';
import log from './config/logging.js';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware.js';
import userRoutes from './rest/routes/v1/users.routes.js';
import statusRoutes from './rest/routes/v1/statuses.routes.js';
import taskRoutes from './rest/routes/v1/tasks.routes.js';
import projectRoutes from './rest/routes/v1/projects.routes.js';
import notificationRoutes from './rest/routes/v1/notifications.routes.js';
import commentRoutes from './rest/routes/v1/comments.routes.js';
import attachmentRoutes from './rest/routes/v1/attachments.routes.js';
import { setupWebSocketServer } from './services/websocket.service.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'SERVER' : 'server.js';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server for REST API subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/rest',
});

// Set up WebSocket server with authentication and event handling
setupWebSocketServer(wsServer);

app.use(
  cors({
    origin: '*', // TODO: Create and use a whitelist of allowed origins (if JWT with credentials is used/if environment is not DEV)
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization']
  })
);  
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(rateLimitMiddleware);

app.use((req, res, next) => {
  log.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

  res.on('finish', () => {
    log.info(NAMESPACE, `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}] - STATUS: [${res.statusCode}]`);
  });

  next();
});

// API Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/statuses', statusRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/attachments', attachmentRoutes);

httpServer.listen(CONFIG.server.port, CONFIG.server.host, () => {
  log.info(NAMESPACE, `Server is running at http://${CONFIG.server.host}:${CONFIG.server.port}`);
  log.info(NAMESPACE, `WebSocket server is running at ws://${CONFIG.server.host}:${CONFIG.server.port}/rest`);
});