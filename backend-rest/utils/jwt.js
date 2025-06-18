import jwt from 'jsonwebtoken';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'JWT' : 'utils/jwt.js';

export const validateToken = (auth) => {
  try {
    if (!auth) {
      log.warn(NAMESPACE, 'No Authorization header provided');
      return false;
    }

    if (!auth.startsWith('Bearer ')) {
      log.warn(NAMESPACE, 'Invalid token format – missing "Bearer " prefix');
      return false;
    }

    const token = auth.slice(7).trim();

    if (!token) {
      log.warn(NAMESPACE, 'Token is empty');
      return false;
    }

    // Check if token has the correct structure (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      log.warn(NAMESPACE, 'Token has invalid structure');
      return false;
    }

    // Check if parts are valid base64
    try {
      parts.forEach(part => {
        if (part) {
          Buffer.from(part, 'base64').toString('utf-8');
        }
      });
    } catch (e) {
      log.warn(NAMESPACE, 'Token contains invalid base64');
      return false;
    }

    // Check if token is not too short
    if (token.length < 10) {
      log.warn(NAMESPACE, 'Token is too short');
      return false;
    }

    return true;
  } catch (error) {
    log.error(NAMESPACE, `Token validation error: ${error.message}`);
    return false;
  }
};

export const signToken = (user) => {
  try {
    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.email,
        role: user.role 
      },
      CONFIG.jwt.secret,
      { expiresIn: CONFIG.jwt.expires_in }
    );

    return { token };
  } catch (error) {
    log.error(NAMESPACE, `Error generating token: ${error.message}`);
    throw new Error('Failed to generate token');
  }
};

export const verifyToken = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, CONFIG.jwt.secret);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}; 