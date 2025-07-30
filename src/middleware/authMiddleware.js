import jwt from 'jsonwebtoken';

// Protect Middleware
export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info including role to req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role, // ADMIN | EMPLOYEE | ANALYST
    };

    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// Optional: Admin-only access middleware
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('🔑 Raw Auth Header:', authHeader);

  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);
    req.user = decoded; // Attach decoded token to req.user
    next();
  } catch (err) {
    console.error('Token error:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};