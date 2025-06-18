import { validateToken, verifyToken } from '../utils/jwt.js';
import CONFIG from '../config/config.js';
import log from '../config/logging.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'AUTH-MIDDLEWARE' : 'middleware/auth.middleware.js';

export const verifyTokenMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    
    if (!validateToken(auth)) {
      if (CONFIG.server.env !== 'PROD') {
        log.warn(NAMESPACE, 'Token failed validation');
      }
      return res.status(401).json({ message: 'Invalid or missing token' });
    }
    
    const token = auth.slice(7).trim();
    const user = await verifyToken(token);
    
    if (!user) {
      if (CONFIG.server.env !== 'PROD') {
        log.error(NAMESPACE, 'Invalid JWT token');
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (CONFIG.server.env !== 'PROD') {
      log.info(NAMESPACE, `Successful user ID authorization: ${user.userId}`);
    }
    
    req.user = user;
    next();
  } catch (err) {
    if (CONFIG.server.env !== 'PROD') {
      log.error(NAMESPACE, `Authorization error: ${err.message}`);
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role.toUpperCase();
    const requiredRoles = Array.isArray(roles) ? roles.map(r => r.toUpperCase()) : [roles.toUpperCase()];

    // Superadmin has access to everything
    if (userRole === 'SUPERADMIN') {
      return next();
    }

    // Admin has access to USER level operations
    if (userRole === 'ADMIN' && requiredRoles.includes('USER')) {
      return next();
    }

    // Check if user has the required role
    if (!requiredRoles.includes(userRole)) {
      log.error(NAMESPACE, `User ${req.user.userId} with role ${userRole} not authorized for roles: ${requiredRoles.join(', ')}`);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN', 'SUPERADMIN']);
export const requireSuperAdmin = requireRole(['SUPERADMIN']); 