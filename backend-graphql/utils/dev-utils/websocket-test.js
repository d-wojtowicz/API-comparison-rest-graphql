import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import CONFIG from '../../config/config.js';
import { generateAuthToken } from './auth-token.js';
import log from '../../config/logging.js';

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
    log.info(NAMESPACE, `Attempting to connect to WebSocket server at ws://${CONFIG.server.host}:${CONFIG.server.port}/graphql`);

    // Create GraphQL WebSocket client that connects to the running server
    const client = createClient({
      url: `ws://${CONFIG.server.host}:${CONFIG.server.port}/graphql`,
      connectionParams: {
        authorization: `Bearer ${token}`
      },
      webSocketImpl: WebSocket,
      retryAttempts: 5,
      connectionAckWaitTimeout: 5000,
    });

    // Subscribe to notification creation
    const creationSubscription = client.subscribe(
      {
        query: `
          subscription {
            notificationCreated {
              notification_id
              message
              is_read
              created_at
            }
          }
        `
      },
      {
        next: (data) => {
          log.info(NAMESPACE, 'Received new notification:', data);
        },
        error: (error) => {
          log.error(NAMESPACE, 'Creation subscription error:', error);
        },
        complete: () => {
          log.info(NAMESPACE, 'Creation subscription completed');
        }
      }
    );

    // Subscribe to notification updates
    const updateSubscription = client.subscribe(
      {
        query: `
          subscription {
            notificationUpdated {
              notification_id
              message
              is_read
              created_at
            }
          }
        `
      },
      {
        next: (data) => {
          log.info(NAMESPACE, 'Received notification update:', data);
        },
        error: (error) => {
          log.error(NAMESPACE, 'Update subscription error:', error);
        },
        complete: () => {
          log.info(NAMESPACE, 'Update subscription completed');
        }
      }
    );

    // Keep the connection alive for testing
    log.info(NAMESPACE, 'WebSocket connection established. Waiting for notifications...');
    log.info(NAMESPACE, 'Press Ctrl+C to stop the test');

    // Handle process termination
    process.on('SIGINT', () => {
      log.info(NAMESPACE, 'Stopping WebSocket test...');
      creationSubscription.unsubscribe();
      updateSubscription.unsubscribe();
      process.exit(0);
    });

  } catch (error) {
    log.error(NAMESPACE, 'Error testing WebSocket connection:', error);
  }
}

// Run the test
testWebSocketConnection();

export { testWebSocketConnection }; 