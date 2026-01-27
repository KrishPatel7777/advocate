/**
 * Authentication Middleware - Firebase Token Verification
 * Protects routes by verifying Firebase ID tokens
 */

const admin = require('../firebaseAdmin');

/**
 * Verify Firebase ID Token from Authorization header
 * @middleware
 */
exports.verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check if authorization header exists and has Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split('Bearer ')[1];

    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      firebase: decodedToken // Full decoded token if needed
    };

    // Log successful authentication (optional - remove in production if needed)
    console.log(`✅ User authenticated: ${req.user.email || req.user.uid}`);

    // Continue to next middleware or route handler
    next();

  } catch (error) {
    console.error('❌ Token verification failed:', error.message);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.code === 'auth/user-disabled') {
      return res.status(403).json({
        success: false,
        message: 'User account has been disabled.',
        code: 'USER_DISABLED'
      });
    }

    // Generic error response
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please login again.',
      code: 'AUTH_FAILED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional: Check if user has specific role (if you implement role-based access)
 * @middleware
 */
exports.checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user's custom claims (roles)
      const userRecord = await admin.auth().getUser(req.user.uid);
      const customClaims = userRecord.customClaims || {};

      // Check if user has allowed role
      const hasRole = allowedRoles.some(role => customClaims[role] === true);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Optional: Verify email middleware
 * @middleware
 */
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to continue.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};