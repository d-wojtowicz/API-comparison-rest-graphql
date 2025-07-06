import { CONSTANTS } from '../config/constants.js';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';
import { isAdmin } from '../rest/utils/permissions.js';
import { validateToken, verifyToken } from '../utils/jwt.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'RATE-LIMIT-MIDDLEWARE' : 'middleware/rateLimit.middleware.js';

// In-memory store for rate limiting
const rateLimitStore = new Map();

// Clean up old entries periodically (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.timestamp > value.window) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// Helper function to get client identifier (similar to GraphQL plugin)
async function getClientIdentifier(req) {
  // If req.user is already set (from auth middleware), use it
  if (req.user) {
    return `user:${req.user.userId}`;
  }
  
  // Try to extract user from JWT token if present
  const auth = req.headers.authorization;
  if (validateToken(auth)) {
    try {
      const token = auth.slice(7).trim();
      const user = await verifyToken(token);
      if (user) {
        return `user:${user.userId}`;
      }
    } catch (error) {
      // Token is invalid, continue with IP-based identification
    }
  }
  
  // For unauthenticated users, use IP address
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

// Create rate limit key based on client and endpoint
const createRateLimitKey = (clientId, method, path) => {
  // Normalize path by removing numeric IDs for better grouping
  const normalizedPath = path.replace(/\/\d+/g, '/:id');
  return `${clientId}:${method} ${normalizedPath}`;
};

// Get rate limit configuration for endpoint
const getRateLimitConfig = (method, path) => {
  // Normalize path by removing numeric IDs
  const normalizedPath = path.replace(/\/\d+/g, '/:id');
  const endpoint = `${method} ${normalizedPath}`;
  
  return CONSTANTS.RATE_LIMITS[endpoint] || CONSTANTS.RATE_LIMITS.DEFAULT;
};

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    // Skip rate limiting for admin users in development
    if (CONFIG.server.env !== 'PROD' && isAdmin(req.user)) {
      return next();
    }

    const clientId = await getClientIdentifier(req);
    const method = req.method;
    const path = req.path;
    
    const config = getRateLimitConfig(method, path);
    const key = createRateLimitKey(clientId, method, path);
    const now = Date.now();
    const windowMs = config.windowMs;

    // Get or initialize rate limit data
    let rateLimitData = rateLimitStore.get(key);
    if (!rateLimitData || now - rateLimitData.timestamp > windowMs) {
      rateLimitData = {
        count: 0,
        timestamp: now,
        window: windowMs
      };
    }

    // Increment count
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    // Check if rate limit exceeded (similar to GraphQL plugin error handling)
    if (rateLimitData.count > config.limit) {
      // Extract client info from the clientId
      const isUser = clientId.startsWith('user:');
      const clientType = isUser ? 'user' : 'guest';
      const clientIdentifier = isUser ? clientId.replace('user:', '') : clientId.replace('ip:', '');
      
      if (CONFIG.server.env !== 'PROD') {
        log.error(NAMESPACE, `Rate limit exceeded for ${clientType} ${clientIdentifier} on ${method} ${path}`);
      }
      
      return res.status(429).json({
        message: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.windowMs / 1000} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        clientType,
        clientIdentifier,
        endpoint: `${method} ${path}`,
        limit: config.limit,
        window: config.windowMs / 1000,
        retryAfter: Math.ceil((rateLimitData.timestamp + windowMs - now) / 1000)
      });
    }

    // Add rate limit headers (REST-specific)
    res.set({
      'X-RateLimit-Limit': config.limit,
      'X-RateLimit-Remaining': config.limit - rateLimitData.count,
      'X-RateLimit-Reset': rateLimitData.timestamp + windowMs
    });

    next();
  } catch (error) {
    log.error(NAMESPACE, `Rate limiting error: ${error.message}`);
    // Continue without rate limiting if there's an error
    next();
  }
}; 