import { GraphQLError } from 'graphql';
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
      async didResolveOperation({ document, operationName, variables }) {
        if (!document) {
          if (CONFIG.server.env !== 'PROD') log.warn(NAMESPACE, 'No document available for complexity check');
          return;
        }

        try {
          // Calculate query complexity
          const complexity = calculateComplexity(document, variables);
          
          // Calculate query depth
          const depth = calculateDepth(document);

          if (CONFIG.server.env !== 'PROD') {
            log.info(NAMESPACE, `Query complexity: ${complexity}, depth: ${depth}`);
          }

          if (complexity > CONSTANTS.COMPLEXITY.MAX) {
            log.error(NAMESPACE, `Query is too complex: ${complexity}. Maximum allowed complexity is ${CONSTANTS.COMPLEXITY.MAX}`);
            throw new GraphQLError(
              `Query is too complex: ${complexity}. Maximum allowed complexity is ${CONSTANTS.COMPLEXITY.MAX}`,
              { extensions: { code: 'QUERY_TOO_COMPLEX' } }
            );
          }

          if (depth > CONSTANTS.COMPLEXITY.MAX_DEPTH) {
            log.error(NAMESPACE, `Query is too deep: ${depth}. Maximum allowed depth is ${CONSTANTS.COMPLEXITY.MAX_DEPTH}`);
            throw new GraphQLError(
              `Query is too deep: ${depth}. Maximum allowed depth is ${CONSTANTS.COMPLEXITY.MAX_DEPTH}`,
              { extensions: { code: 'QUERY_TOO_DEEP' } }
            );
          }
        } catch (error) {
          log.error(NAMESPACE, `Error in complexity check: ${error.message}`);
          if (error instanceof GraphQLError) {
            throw error;
          }
        }
      }
    };
  }
};

function calculateComplexity(document, variables) {
  let complexity = 0;
  let currentDepth = 0;

  function visit(node, parentType) {
    if (node.kind === 'Field') {
      const fieldName = node.name.value;
      
      // Get field complexity from constants
      let fieldComplexity = CONSTANTS.COMPLEXITY.SCALAR; // Default to scalar complexity
      
      if (parentType && CONSTANTS.FIELD_COMPLEXITY[parentType]?.[fieldName]) {
        fieldComplexity = CONSTANTS.FIELD_COMPLEXITY[parentType][fieldName];
      }

      // Add nested complexity
      if (currentDepth > 0) {
        fieldComplexity += currentDepth * CONSTANTS.COMPLEXITY.NESTED;
      }

      complexity += fieldComplexity;
      currentDepth++;
    }

    if (node.selectionSet) {
      // Determine the type of the current field for nested fields
      const fieldName = node.name?.value;
      const currentType = fieldName ? getTypeForField(fieldName) : null;
      
      node.selectionSet.selections.forEach(selection => visit(selection, currentType));
    }

    if (node.kind === 'Field') {
      currentDepth--;
    }
  }

  document.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition') {
      // For queries, start with the root type
      const rootType = definition.operation === 'query' ? 'Query' : 
                      definition.operation === 'mutation' ? 'Mutation' : 
                      'Subscription';
      definition.selectionSet.selections.forEach(selection => visit(selection, rootType));
    }
  });

  return complexity;
}

function getTypeForField(fieldName) {
  return CONSTANTS.FIELD_TYPE_MAP[fieldName] || null;
}

function calculateDepth(document) {
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