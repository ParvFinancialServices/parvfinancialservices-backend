import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Check authentication middleware with auto-refresh
export const checkAuthentication = async (req, res, next) => {
  try {
    // Get tokens from both cookies and header
    const cookieAccessToken = req.cookies.accessToken;
    const cookieRefreshToken = req.cookies.refreshToken;
    const headerAuth = req.headers.authorization?.replace('Bearer ', '');
    
    // Try header token first (from localStorage), fallback to cookie
    let accessToken = headerAuth || cookieAccessToken;
    const refreshToken = cookieRefreshToken;

    // If no access token at all, try to refresh using refresh token
    if (!accessToken && refreshToken) {
      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        // Check if refresh token exists in database
        const storedToken = await RefreshToken.findOne({
          token: refreshToken,
          userId: decoded.id
        });

        if (storedToken && storedToken.expiresAt > new Date()) {
          // Generate new access token
          accessToken = jwt.sign(
            { id: decoded.id },
            JWT_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
          );

          // Set new access token cookie
          res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
          });
        }
      } catch (refreshError) {
        // Refresh token invalid, continue to return 401
      }
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }

    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError' && refreshToken) {
        // Try to refresh the token
        try {
          const refreshDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          const storedToken = await RefreshToken.findOne({
            token: refreshToken,
            userId: refreshDecoded.id
          });

          if (storedToken && storedToken.expiresAt > new Date()) {
            // Generate new access token
            const newAccessToken = jwt.sign(
              { id: refreshDecoded.id },
              JWT_SECRET,
              { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
            );

            // Set new access token cookie
            res.cookie('accessToken', newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 15 * 60 * 1000
            });

            decoded = refreshDecoded;
          } else {
            return res.status(401).json({
              success: false,
              message: 'Session expired. Please login again.'
            });
          }
        } catch (refreshError) {
          return res.status(401).json({
            success: false,
            message: 'Session expired. Please login again.'
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('-password -salt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      const message = user.status === 'inactive'
        ? 'Your account is inactive. Please contact admin.'
        : 'Your account is pending approval.';
      return res.status(403).json({ success: false, message });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Check if user is admin
export const checkAdmin = (req, res, next) => {
  if (req.userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

