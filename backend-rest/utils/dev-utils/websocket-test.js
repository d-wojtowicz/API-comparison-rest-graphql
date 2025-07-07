import WebSocket from 'ws';
import CONFIG from '../../config/config.js';
import { generateAuthToken } from './auth-token.js';
import log from '../../config/logging.js';
import { CONSTANTS } from '../../config/constants.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'WEBSOCKET-TEST' : 'utils/dev-utils/websocket-test.js';

async function testWebSocketConnection() {
  try {
    // 1. Generate token for superadmin (user_id = 1)
    const token = await generateAuthToken(1);
    if (!token) {
      log.error(NAMESPACE, 'Failed to generate authentication token');
      return;
    }

    // 2. Log the attempt to connect to the WebSocket server
    log.info(NAMESPACE, `Attempting to connect to WebSocket server at ws://${CONFIG.server.host}:${CONFIG.server.port}/rest?token=${token}`);

    // Create WebSocket connection to the REST API
    const ws = new WebSocket(`ws://${CONFIG.server.host}:${CONFIG.server.port}/rest?token=${token}`);

    ws.on('open', () => {
      log.info(NAMESPACE, 'WebSocket connection established successfully');

      // Subscribe to notification creation events
      const creationChannel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
        CHANNEL: CONSTANTS.NOTIFICATIONS.CREATED, 
        USER_ID: 1 
      });
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        event: creationChannel
      }));

      // Subscribe to notification update events
      const updateChannel = CONSTANTS.SUBSCRIPTION_CHANNEL({ 
        CHANNEL: CONSTANTS.NOTIFICATIONS.UPDATED, 
        USER_ID: 1 
      });
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        event: updateChannel
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        log.info(NAMESPACE, 'Received WebSocket message:', message);

        if (message.type === 'connection_established') {
          log.info(NAMESPACE, 'Connection confirmed by server');
        } else if (message.type === 'subscription_confirmed') {
          log.info(NAMESPACE, `Subscription confirmed for event: ${message.event}`);
        } else if (message.type === 'event') {
          log.info(NAMESPACE, `Received event ${message.event}:`, message.data);
        }
      } catch (error) {
        log.error(NAMESPACE, 'Error parsing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      log.error(NAMESPACE, 'WebSocket error:', error);
    });

    ws.on('close', (code, reason) => {
      log.info(NAMESPACE, `WebSocket connection closed: ${code} - ${reason}`);
    });

    // Keep the connection alive for testing
    log.info(NAMESPACE, 'WebSocket connection established. Waiting for notifications...');
    log.info(NAMESPACE, 'Press Ctrl+C to stop the test');

    // Create a test notification after 2 seconds
    setTimeout(async () => {
      try {
        const response = await fetch(`http://${CONFIG.server.host}:${CONFIG.server.port}/api/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: "1", // Send to superadmin
            message: "Test notification from websocket test"
          })
        });

        const result = await response.json();
        if (result.error) {
          log.error(NAMESPACE, 'Failed to create test notification:', result.error);
        } else {
          log.info(NAMESPACE, 'Test notification created successfully');
        }
      } catch (error) {
        log.error(NAMESPACE, 'Error creating test notification:', error);
      }
    }, 2000);

    // Handle process termination
    process.on('SIGINT', () => {
      log.info(NAMESPACE, 'Stopping WebSocket test...');
      ws.close();
      process.exit(0);
    });

  } catch (error) {
    log.error(NAMESPACE, 'Error testing WebSocket connection:', error);
  }
}

// Run the test
testWebSocketConnection();

export { testWebSocketConnection }; 