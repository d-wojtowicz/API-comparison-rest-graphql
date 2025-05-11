import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLError } from 'graphql';

import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env == 'PROD' ? 'AUTH-DIRECTIVE' : 'middleware/auth-directive.js';

export function authDirectiveTransformer(schema) {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
        
            if (authDirective) {
                const { requires } = authDirective;
                const originalResolve = fieldConfig.resolve || defaultFieldResolver;

                fieldConfig.resolve = async function (source, args, context, info) {
                    if (!context.user) {
                        log.error(NAMESPACE, 'Not authenticated');
                        throw new GraphQLError('Not authenticated');
                    }

                    let isBasedOnDesiredRole = false;
                    if (context.user.role.toUpperCase() === 'SUPERADMIN') 
                        isBasedOnDesiredRole = true;
                    else if (context.user.role.toUpperCase() === 'ADMIN')
                        if (requires === 'USER')
                            isBasedOnDesiredRole = true;
                
                    if (!isBasedOnDesiredRole) 
                        if (!requires.includes(context.user.role.toUpperCase())) {
                            log.error(NAMESPACE, 'Not authorized');
                            throw new GraphQLError('Not authorized');
                        }

                    return originalResolve(source, args, context, info);
                };
            }

            return fieldConfig;
        },
    });
}