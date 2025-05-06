import prisma from '../../db/client.js';
import { signToken } from '../jwt.js';
import CONFIG from '../../config/config.js';
import log from '../../config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'AUTH-TOKEN' : 'utils/dev-utils/auth-token.js';

// This is a temporary function to generate a token for a specific user in the development environment
// For purposes of testing the API
async function generateAuthToken(userId) {
  try {
    // 1. Find user in database
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      log.error(NAMESPACE, `User with ID ${userId} not found`);
      return null;
    }

    // 2. Generate token using the user data
    const { token } = signToken(user);
    
    log.info(NAMESPACE, `Authentication token generated for user ${user.username}`);
    log.info(NAMESPACE, `Token: ${token}`);
    return token;
  } catch (error) {
    log.error(NAMESPACE, `Error generating authentication token: ${error.message}`);
    return null;
  }
}

// Example usage:
// generateAuthToken(1).then(token => console.log('Bearer ' + token));

export { generateAuthToken }; 