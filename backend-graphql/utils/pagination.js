import log from '../config/logging.js';
import CONFIG from '../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'PAGINATION-UTILS' : 'utils/pagination.js';

/**
 * Parse pagination input from GraphQL arguments
 * @param {Object} input - Pagination input from GraphQL
 * @param {Object} options - Configuration options
 * @param {number} options.defaultLimit - Default number of items per page (default: 20)
 * @param {number} options.maxLimit - Maximum number of items per page (default: 100)
 * @returns {Object} Parsed pagination object
 */
export const parsePaginationInput = (input = {}, options = {}) => {
  const {
    defaultLimit = 20,
    maxLimit = 100
  } = options;

  try {
    // Parse cursor from input
    const cursor = input.cursor || null;
    
    // Parse limit from input
    let limit = parseInt(input.limit) || defaultLimit;
    
    // Ensure limit is within bounds
    if (limit > maxLimit) {
      limit = maxLimit;
    }
    if (limit < 1) {
      limit = 1;
    }

    return {
      cursor,
      limit
    };
  } catch (error) {
    log.error(NAMESPACE, `parsePaginationInput: ${error.message}`);
    throw error;
  }
};

/**
 * Build Prisma pagination query
 * @param {Object} pagination - Pagination info
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

/**
 * Create paginated response for GraphQL
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