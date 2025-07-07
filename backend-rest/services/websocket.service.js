import { verifyToken } from '../utils/jwt.js';
import log from '../config/logging.js';
import CONFIG from '../config/config.js';
import { CONSTANTS } from '../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'WEBSOCKET-SERVICE' : 'services/websocket.service.js';

// Store active connections by user ID
const userConnections = new Map();

// Store subscriptions by user ID and event type
const userSubscriptions = new Map();

export const setupWebSocketServer = (wsServer) => {
  wsServer.on('connection', async (ws, req) => {
    try {
      // Extract token from query parameters or headers
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        log.warn(NAMESPACE, 'WebSocket connection attempt without token');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify the token
      const user = await verifyToken(token);
      if (!user) {
        log.warn(NAMESPACE, 'WebSocket connection with invalid token');
        ws.close(1008, 'Invalid token');
        return;
      }

      log.info(NAMESPACE, `WebSocket connection established for user ${user.userId}`);

      // Store the connection
      if (!userConnections.has(user.userId)) {
        userConnections.set(user.userId, new Set());
      }
      userConnections.get(user.userId).add(ws);

      // Store user info in the WebSocket object
      ws.userId = user.userId;
      ws.user = user;

      // Handle incoming messages (subscriptions)
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          handleSubscription(ws, data);
        } catch (error) {
          log.error(NAMESPACE, `Error parsing WebSocket message: ${error.message}`);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        removeConnection(user.userId, ws);
        log.info(NAMESPACE, `WebSocket connection closed for user ${user.userId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        log.error(NAMESPACE, `WebSocket error for user ${user.userId}: ${error.message}`);
        removeConnection(user.userId, ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection_established',
        message: 'WebSocket connection established successfully'
      }));

    } catch (error) {
      log.error(NAMESPACE, `Error setting up WebSocket connection: ${error.message}`);
      ws.close(1011, 'Internal server error');
    }
  });
};

const handleSubscription = (ws, data) => {
  const { type, event } = data;

  if (type === 'subscribe') {
    if (!event) {
      ws.send(JSON.stringify({ error: 'Event type is required for subscription' }));
      return;
    }

    // Store subscription
    if (!userSubscriptions.has(ws.userId)) {
      userSubscriptions.set(ws.userId, new Set());
    }
    userSubscriptions.get(ws.userId).add(event);

    log.info(NAMESPACE, `User ${ws.userId} subscribed to ${event}`);
    ws.send(JSON.stringify({
      type: 'subscription_confirmed',
      event: event,
      message: `Subscribed to ${event}`
    }));

  } else if (type === 'unsubscribe') {
    if (!event) {
      ws.send(JSON.stringify({ error: 'Event type is required for unsubscription' }));
      return;
    }

    // Remove subscription
    if (userSubscriptions.has(ws.userId)) {
      userSubscriptions.get(ws.userId).delete(event);
    }

    log.info(NAMESPACE, `User ${ws.userId} unsubscribed from ${event}`);
    ws.send(JSON.stringify({
      type: 'unsubscription_confirmed',
      event: event,
      message: `Unsubscribed from ${event}`
    }));

  } else {
    ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
};

const removeConnection = (userId, ws) => {
  if (userConnections.has(userId)) {
    userConnections.get(userId).delete(ws);
    if (userConnections.get(userId).size === 0) {
      userConnections.delete(userId);
    }
  }
};

// Function to publish events to subscribed users
export const publishEvent = (eventType, data, targetUserId = null) => {
  try {
    const message = JSON.stringify({
      type: 'event',
      event: eventType,
      data: data,
      timestamp: new Date().toISOString()
    });

    if (targetUserId) {
      // Send to specific user
      const userConnectionsSet = userConnections.get(targetUserId);
      if (userConnectionsSet) {
        const userSubscriptionsSet = userSubscriptions.get(targetUserId);
        if (userSubscriptionsSet && userSubscriptionsSet.has(eventType)) {
          userConnectionsSet.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN
              ws.send(message);
            }
          });
        }
      }
    } else {
      // Broadcast to all users subscribed to this event
      userSubscriptions.forEach((subscriptions, userId) => {
        if (subscriptions.has(eventType)) {
          const userConnectionsSet = userConnections.get(userId);
          if (userConnectionsSet) {
            userConnectionsSet.forEach(ws => {
              if (ws.readyState === 1) { // WebSocket.OPEN
                ws.send(message);
              }
            });
          }
        }
      });
    }

    log.info(NAMESPACE, `Published event ${eventType}${targetUserId ? ` to user ${targetUserId}` : ' to all subscribers'}`);
  } catch (error) {
    log.error(NAMESPACE, `Error publishing event ${eventType}: ${error.message}`);
  }
};

// Helper function to create subscription channels
export const createSubscriptionChannel = (channel, userId) => {
  return `${channel}-${userId}`;
};

// Export connection management functions for potential future use
export const getActiveConnections = () => {
  const connections = {};
  userConnections.forEach((connectionsSet, userId) => {
    connections[userId] = connectionsSet.size;
  });
  return connections;
};

export const getActiveSubscriptions = () => {
  const subscriptions = {};
  userSubscriptions.forEach((subscriptionsSet, userId) => {
    subscriptions[userId] = Array.from(subscriptionsSet);
  });
  return subscriptions;
}; 