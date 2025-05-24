import { getComplexity, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { CONSTANTS } from '../config/constants.js';
import log from '../config/logging.js';
import CONFIG from '../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'COMPLEXITY-PLUGIN' : 'middleware/complexity-plugin.js';

export const complexityPlugin = {
  async serverWillStart() {
    log.info(NAMESPACE, 'Complexity plugin initialized');
  },
  async requestDidStart() {
    return {
      async didResolveOperation({ request, document }) {
        if (!request.schema) {
          if (CONFIG.server.env !== 'PROD') log.warn(NAMESPACE, 'Schema not available for complexity check');
          return;
        }

        try {
          // Calculate query complexity
          const complexity = getComplexity({
            schema: request.schema,
            operationName: request.operationName,
            query: document,
            variables: request.variables,
            estimators: [
              fieldExtensionsEstimator(),
              simpleEstimator({ defaultComplexity: 1 })
            ],
            fieldComplexity: FIELD_COMPLEXITY
          });

          // Calculate query depth
          const depth = getQueryDepth(document);

          // Log complexity information
          if (CONFIG.server.env !== 'PROD') log.info(NAMESPACE, `Query complexity: ${complexity}, depth: ${depth}`);

          // Check complexity limit
          if (complexity > CONSTANTS.COMPLEXITY.MAX) {
            log.error(NAMESPACE, `Query complexity ${complexity} exceeds maximum allowed ${CONSTANTS.COMPLEXITY.MAX}`);
            throw new Error(`Query is too complex: ${complexity}. Maximum allowed complexity is ${CONSTANTS.COMPLEXITY.MAX}`);
          }

          // Check depth limit
          if (depth > CONSTANTS.COMPLEXITY.MAX_DEPTH) {
            log.error(NAMESPACE, `Query depth ${depth} exceeds maximum allowed ${CONSTANTS.COMPLEXITY.MAX_DEPTH}`);
            throw new Error(`Query is too deep: ${depth}. Maximum allowed depth is ${CONSTANTS.COMPLEXITY.MAX_DEPTH}`);
          }
        } catch (error) {
          log.error(NAMESPACE, `Error in complexity check: ${error.message}`);
          // Don't throw the error, just log it
        }
      }
    };
  }
};

// Helper function to calculate query depth
function getQueryDepth(document) {
  let maxDepth = 0;
  let currentDepth = 0;

  function visit(node) {
    if (node.kind === 'Field') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    if (node.selectionSet) {
      node.selectionSet.selections.forEach(visit);
    }

    if (node.kind === 'Field') {
      currentDepth--;
    }
  }

  document.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition') {
      definition.selectionSet.selections.forEach(visit);
    }
  });

  return maxDepth;
} 