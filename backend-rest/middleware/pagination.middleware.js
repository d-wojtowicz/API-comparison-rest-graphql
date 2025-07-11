import log from '../config/logging.js';
import CONFIG from '../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PAGINATION-MIDDLEWARE' : 'middleware/pagination.middleware.js';

/**
 * Middleware to handle cursor-based pagination
 * @param {Object} options - Configuration options
 * @param {number} options.defaultLimit - Default number of items per page (default: 20)
 * @param {number} options.maxLimit - Maximum number of items per page (default: 100)
 * @param {string} options.cursorField - Field to use for cursor (default: 'id')
 * @returns {Function} Express middleware function
 */
export const paginationMiddleware = (options = {}) => {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    cursorField = 'id'
  } = options;

  return (req, res, next) => {
    try {
      // Parse cursor from query parameters
      const cursor = req.query.cursor || null;
      
      // Parse limit from query parameters
      let limit = parseInt(req.query.limit) || defaultLimit;
      
      // Ensure limit is within bounds
      if (limit > maxLimit) {
        limit = maxLimit;
      }
      if (limit < 1) {
        limit = 1;
      }

      // Add pagination info to request object
      req.pagination = {
        cursor,
        limit,
        cursorField
      };

      // Add pagination headers to response
      res.set('X-Pagination-Limit', limit.toString());
      res.set('X-Pagination-Max-Limit', maxLimit.toString());

      next();
    } catch (error) {
      log.error(NAMESPACE, `paginationMiddleware: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Helper function to create pagination response
 * @param {Array} data - The data array
 * @param {Object} pagination - Pagination info
 * @param {string} cursorField - Field used for cursor
 * @returns {Object} Paginated response object
 */
export const createPaginatedResponse = (data, pagination, cursorField = 'id') => {
  const { limit } = pagination;
  
  // Check if there are more items
  const hasNextPage = data.length > limit;
  
  // Remove the extra item used to check for next page
  const items = hasNextPage ? data.slice(0, limit) : data;
  
  // Get the cursor for the next page
  const nextCursor = hasNextPage && items.length > 0 
    ? items[items.length - 1][cursorField] 
    : null;

  return {
    data: items,
    pagination: {
      hasNextPage,
      nextCursor,
      limit
    }
  };
};

/**
 * Helper function to build Prisma pagination query
 * @param {Object} pagination - Pagination info from middleware
 * @param {string} cursorField - Field used for cursor
 * @returns {Object} Prisma query object
 */
export const buildPaginationQuery = (pagination, cursorField = 'id') => {
  const { cursor, limit } = pagination;
  
  const query = {
    take: limit + 1, // Take one extra to check if there's a next page
    orderBy: {
      [cursorField]: 'asc'
    }
  };

  // Add cursor condition if cursor is provided
  if (cursor) {
    query.where = {
      [cursorField]: {
        gt: cursor
      }
    };
  }

  return query;
}; 