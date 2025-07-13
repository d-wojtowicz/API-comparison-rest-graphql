import log from '../config/logging.js';
import CONFIG from '../config/config.js';

const NAMESPACE = CONFIG.server.env === 'PROD' ? 'DEPRECATION-MIDDLEWARE' : 'middleware/deprecation.middleware.js';

const isPastSunsetDate = (sunsetDate) => {
  const currentDate = new Date();
  const sunset = new Date(sunsetDate);
  return currentDate >= sunset;
};

/**
 * Middleware to handle API versioning and deprecation warnings
 * @param {Object} options - Configuration options
 * @param {string} options.deprecatedVersion - The version that is deprecated
 * @param {string} options.currentVersion - The current version
 * @param {string} options.sunsetDate - When the deprecated version will be removed
 * @param {string} options.migrationGuide - URL to migration guide
 * @returns {Function} Express middleware function
 */
export const deprecationMiddleware = (options = {}) => {
  const {
    deprecatedVersion = 'v1',
    currentVersion = 'v2',
    sunsetDate = '2025-12-31',
    migrationGuide = 'https://api.example.com/docs/migration'
  } = options;

  return (req, res, next) => {
    // Check if request is using deprecated version
    const requestVersion = req.headers['api-version'] || req.query.version || 'v2';
    
    if (requestVersion === deprecatedVersion) {
      // Check if past sunset date - if so, block the request
      if (isPastSunsetDate(sunsetDate)) {
        log.warn(NAMESPACE, `Blocked deprecated API version ${deprecatedVersion} used by ${req.ip} for ${req.method} ${req.path} (past sunset date: ${sunsetDate})`);
        return res.status(410).json({
          error: 'Gone',
          message: `This API version (${deprecatedVersion}) has been removed. Please migrate to ${currentVersion}.`,
          migrationGuide: migrationGuide
        });
      }

      // Before sunset date - add deprecation warning headers
      res.set({
        'Deprecation': `true`,
        'Sunset': sunsetDate,
        'Link': `<${migrationGuide}>; rel="deprecation"`,
        'Warning': `299 - "This API version is deprecated and will be removed on ${sunsetDate}. Please migrate to ${currentVersion}."`
      });

      // Log deprecation usage
      log.warn(NAMESPACE, `Deprecated API version ${deprecatedVersion} used by ${req.ip} for ${req.method} ${req.path}`);
    }

    // Add current version header for all responses
    res.set('API-Version', currentVersion);
    
    next();
  };
};

/**
 * Middleware to handle endpoint deprecation
 * @param {string} sunsetDate - When the endpoint will be removed
 * @param {string} alternativeEndpoint - Alternative endpoint to use
 * @returns {Function} Express middleware function
 */
export const endpointDeprecationMiddleware = (sunsetDate = '2025-12-31', alternativeEndpoint = null) => {
  return (req, res, next) => {
    // Check if past sunset date - if so, block the endpoint
    if (isPastSunsetDate(sunsetDate)) {
      log.warn(NAMESPACE, `Blocked deprecated endpoint used by ${req.ip} for ${req.method} ${req.path} (past sunset date: ${sunsetDate})`);
      return res.status(410).json({
        error: 'Gone',
        message: `This endpoint has been removed.`,
        sunsetDate: sunsetDate,
        ...(alternativeEndpoint && { alternativeEndpoint: alternativeEndpoint })
      });
    }

    // Before sunset date - add deprecation warning headers
    res.set({
      'Deprecation': 'true',
      'Sunset': sunsetDate,
      'Warning': `299 - "This endpoint is deprecated and will be removed on ${sunsetDate}."`
    });

    if (alternativeEndpoint) {
      res.set('Link', `<${alternativeEndpoint}>; rel="successor-version"`);
    }

    // Log deprecation usage
    log.warn(NAMESPACE, `Deprecated endpoint used by ${req.ip} for ${req.method} ${req.path}`);

    next();
  };
}; 