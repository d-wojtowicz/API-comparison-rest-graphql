import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLError } from 'graphql';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'RATE-LIMIT-PLUGIN' : 'middleware/rate-limit-plugin.js';

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

// Helper function to get client identifier
function getClientIdentifier(context) {
  if (context.user) {
    return `user:${context.user.userId}`;
  }
  // For unauthenticated users, use IP address
  const ip = context.req?.ip || context.connectionParams?.ip || 'unknown';
  return `ip:${ip}`;
}

export function rateLimitDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const rateLimitDirective = getDirective(schema, fieldConfig, 'rateLimit')?.[0];
    
      if (rateLimitDirective) {
        const { max, window } = rateLimitDirective;
        const originalResolve = fieldConfig.resolve || defaultFieldResolver;

        fieldConfig.resolve = async function (source, args, context, info) {
          const clientId = getClientIdentifier(context);
          const key = `${clientId}:${info.fieldName}`;
          const now = Date.now();
          const windowMs = window * 1000; // Convert to milliseconds

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

          // Check if rate limit exceeded
          if (rateLimitData.count > max) {
            const clientType = context.user ? 'user' : 'IP address';
            const clientIdentifier = context.user ? context.user.userId : context.req?.ip || context.connectionParams?.ip || 'unknown';
            
            log.error(NAMESPACE, `Rate limit exceeded for ${clientType} ${clientIdentifier} on field ${info.fieldName}`);
            throw new GraphQLError(
              `Rate limit exceeded. Maximum ${max} requests per ${window} seconds.`,
              { 
                extensions: { 
                  code: 'RATE_LIMIT_EXCEEDED',
                  clientType,
                  clientIdentifier,
                  fieldName: info.fieldName,
                  max,
                  window
                } 
              }
            );
          }

          return originalResolve(source, args, context, info);
        };
      }

      return fieldConfig;
    },
  });
} 